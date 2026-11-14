import { File } from 'expo-file-system';

import { pendingUploads, updatePendingUploads } from './pendingUploads';

import { ApiError, type ApiClient } from '../api/client';
import type { CustomWordDetail, CustomWordList, CustomWordWrite, VideoReference } from '../api/types';
import { getCompanionSession, requireCompanionUser } from '../auth/companion';
import { getClient } from '../data/supabase';
import { makeUuid } from '../user/pure';

export interface EditorSyllable {
  id: string;
  text: string;
  instruction: string;
  video: VideoReference | null;
  localUri: string | null;
}

export interface EditorWord {
  id: string;
  isNew: boolean;
  revision?: number;
  status: 'draft' | 'published';
  word: string;
  instruction: string;
  video: VideoReference | null;
  localUri: string | null;
  syllables: EditorSyllable[];
  /** Retry state for this open editor only; recording URIs never enter the persistent cleanup queue. */
  uploads?: Record<string, { uri: string; path: string; size: number; tried: boolean }>;
}

export function newWord(): EditorWord {
  return { id: makeUuid(), isNew: true, status: 'draft', word: '', instruction: '', video: null, localUri: null, syllables: [] };
}

export function editWord(word: CustomWordDetail): EditorWord {
  return { ...word, status: word.status === 'published' ? 'published' : 'draft', isNew: false, localUri: null,
    syllables: word.syllables.map((part) => ({ ...part, localUri: null })) };
}

export function wordPayload(form: EditorWord, status: 'draft' | 'published'): CustomWordWrite {
  return { id: form.id, word: form.word.trim().toUpperCase(), instruction: form.instruction.trim(), status,
    revision: form.revision, video: !!(form.localUri || form.video),
    syllables: form.syllables.map((part, index) => ({ id: part.id, text: part.text.trim().toUpperCase(),
      instruction: part.instruction.trim(), position: index + 1, video: !!(part.localUri || part.video) })) };
}

export function validateWord(form: EditorWord, status: 'draft' | 'published'): void {
  if (status !== 'published') throw new ApiError('file', 'Lengkapi rekaman sebelum Simpan Kata.');
  if (!/^[A-Za-z]{1,30}$/.test(form.word.trim()) || form.syllables.length > 6) throw new ApiError('file', 'Kata harus 1 sampai 30 huruf, maksimal 6 suku kata.');
  if (form.syllables.some((part) => !/^[A-Za-z]{1,30}$/.test(part.text.trim()))) throw new ApiError('file', 'Isi teks suku kata atau hapus bagian yang kosong.');
  if (!readyWord(form)) {
    throw new ApiError('file', 'Lengkapi instruksi dan rekaman kata serta seluruh suku kata sebelum menyimpan.');
  }
}

export function readyWord(form: EditorWord): boolean {
  return !!(form.word.trim() && form.instruction.trim() && (form.localUri || form.video?.available)
    && form.syllables.every((part) => part.text.trim() && part.instruction.trim() && (part.localUri || part.video?.available)));
}

export async function ownerToken(ownerId: string): Promise<string> {
  const user = await requireCompanionUser();
  const session = await getCompanionSession();
  if (user.id !== ownerId || session?.user.id !== ownerId) throw new ApiError('http', 'Akun berubah. Buka kembali Mode Pendamping.', 401);
  return session.access_token;
}

export function validateRecording(uri: string, maxUploadMb: number): File {
  if (!Number.isFinite(maxUploadMb) || maxUploadMb <= 0) throw new ApiError('parse', 'Batas rekaman belum dapat dibaca. Muat ulang formulir.');
  try {
    const file = new File(uri);
    if (!file.exists || file.size <= 0) throw new Error();
    if (file.type && !['video/mp4', 'video/quicktime', 'application/octet-stream'].includes(file.type)) {
      throw new ApiError('file', 'Format rekaman tidak didukung. Rekam ulang menggunakan kamera aplikasi.');
    }
    if (file.size > maxUploadMb * 1024 * 1024) throw new ApiError('file', `Rekaman melebihi ${maxUploadMb} MB. Rekam ulang dengan durasi lebih pendek.`);
    return file;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('file', 'Rekaman tidak dapat dibaca. Silakan rekam ulang.');
  }
}

function ownedReference(reference: VideoReference, ownerId: string): void {
  if (reference.bucket !== 'rekan-wicara-tutorials' || !reference.path.startsWith(`${ownerId}/`)
    || reference.path.includes('\\') || reference.path.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new ApiError('file', 'Referensi video tidak sesuai dengan akun ini.');
  }
}

export async function signedVideo(reference: VideoReference, ownerId: string): Promise<string> {
  ownedReference(reference, ownerId);
  await ownerToken(ownerId);
  const { data, error } = await getClient().storage.from(reference.bucket).createSignedUrl(reference.path, 60);
  if (error || !data?.signedUrl) throw new ApiError('network', 'Video belum dapat dibuka. Perbarui akses dan coba lagi.');
  await ownerToken(ownerId);
  return data.signedUrl;
}

const activeUploads = new Set<string>();
const savingWords = new Set<string>();
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const isUuid = (id: string) => new RegExp(`^${UUID}$`, 'i').test(id);
const missing = (error: unknown) => typeof error === 'object' && error !== null &&
  ('code' in error && error.code === 'NoSuchKey' || 'statusCode' in error && String(error.statusCode) === '404');

function activePaths(word: CustomWordDetail): Set<string> {
  return new Set([word.video?.path, ...word.syllables.map((part) => part.video?.path)].filter((path): path is string => !!path));
}

function matchesSaved(word: CustomWordDetail, form: EditorWord, body: CustomWordWrite): boolean {
  const sameVideo = (actual: VideoReference | null, path: string | undefined | null, kept: VideoReference | null) =>
    actual?.available === true && actual.path === (path ?? kept?.path);
  return word.id === form.id && word.status === 'published' && word.word === body.word && word.instruction === body.instruction &&
    (form.isNew ? Number.isInteger(word.revision) && word.revision >= 1 : word.revision === (form.revision ?? 0) + 1) &&
    sameVideo(word.video, body.video_path, form.video) && word.syllables.length === body.syllables.length &&
    body.syllables.every((part) => {
      const actual = word.syllables.find((value) => value.id === part.id);
      const kept = form.syllables.find((value) => value.id === part.id)?.video ?? null;
      return actual?.text === part.text && actual.position === part.position && actual.instruction === part.instruction &&
        sameVideo(actual.video, part.video_path, kept);
    });
}

/** Upload immutable versions first; the existing API commits the complete tree through the hardened RPC. */
export async function saveWord(
  api: ApiClient, ownerId: string, form: EditorWord, status: 'draft' | 'published', limits: Pick<CustomWordList, 'max_upload_mb'>,
  prepared: (word: CustomWordDetail) => void, progress: (current: number, total: number) => void, signal?: AbortSignal,
): Promise<CustomWordDetail> {
  validateWord(form, status);
  if (!isUuid(form.id) || form.syllables.some((part) => !isUuid(part.id)) ||
      new Set(form.syllables.map((part) => part.id)).size !== form.syllables.length || form.syllables.some((part) => part.id === form.id) ||
      (!form.isNew && (!form.revision || form.revision < 1))) throw new ApiError('file', 'ID atau revisi materi tidak sesuai. Muat ulang kata.');
  const recordings = [{ id: form.id, uri: form.localUri }, ...form.syllables.map((part) => ({ id: part.id, uri: part.localUri }))]
    .filter((record): record is { id: string; uri: string } => !!record.uri);
  for (const record of recordings) validateRecording(record.uri, limits.max_upload_mb);
  const uploads = form.uploads ??= {};
  const touched: string[] = [];
  const operation = `${ownerId}:${form.id}`;
  if (savingWords.has(operation)) throw new ApiError('file', 'Tunggu penyimpanan kata yang sedang berjalan.');
  savingWords.add(operation);
  const cancelled = () => { if (signal?.aborted) throw new ApiError('cancelled', 'Pengiriman dibatalkan.'); };
  try {
    await ownerToken(ownerId);
    for (const [index, record] of recordings.entries()) {
      cancelled();
      const file = validateRecording(record.uri, limits.max_upload_mb);
      const bytes = await file.arrayBuffer();
      if (bytes.byteLength > limits.max_upload_mb * 1024 * 1024) throw new ApiError('file', 'Rekaman terlalu besar. Rekam ulang dengan durasi lebih pendek.');
      if (bytes.byteLength < 12 || String.fromCharCode(...new Uint8Array(bytes, 4, 4)) !== 'ftyp') {
        throw new ApiError('file', 'Berkas bukan video kamera MP4/MOV yang didukung. Rekam ulang.');
      }
      let upload = uploads[record.id];
      if (!upload || upload.uri !== record.uri || upload.size !== bytes.byteLength) {
        const part = record.id === form.id ? 'word' : `syllables/${record.id}`;
        upload = uploads[record.id] = { uri: record.uri, size: bytes.byteLength, tried: false,
          path: `${ownerId}/words/${form.id}/${part}/${makeUuid()}.mp4` };
      }
      const reference = { bucket: 'rekan-wicara-tutorials', path: upload.path, position: 1, available: false };
      ownedReference(reference, ownerId);
      const expected = record.id === form.id ? `${ownerId}/words/${form.id}/word/` : `${ownerId}/words/${form.id}/syllables/${record.id}/`;
      if (!upload.path.endsWith('.mp4') || !upload.path.startsWith(expected) || !isUuid(upload.path.slice(expected.length, -4))) throw new ApiError('file', 'Video terhubung ke materi yang berbeda.');
      activeUploads.add(upload.path);
      touched.push(upload.path);
      await updatePendingUploads(ownerId, (rows) => rows.some((row) => row.path === upload.path)
        ? rows : [...rows, { wordId: form.id, path: upload.path, uncertain: false }]);
      await ownerToken(ownerId);
      const storage = getClient().storage.from(reference.bucket);
      let exists = false;
      if (upload.tried) {
        const info = await storage.info(upload.path);
        if (info.error && !missing(info.error)) throw new ApiError('network', 'Rekaman belum dapat diverifikasi. Coba lagi.');
        exists = !info.error && info.data.size === bytes.byteLength;
        if (!info.error && !exists) throw new ApiError('file', 'Ukuran rekaman tersimpan tidak sesuai. Rekam ulang.');
      }
      if (!exists) {
        upload.tried = true;
        // shortcut: this SDK upload has no abort signal; cancellation stops before the next file or metadata commit.
        const result = await storage.upload(upload.path, bytes, { upsert: false, contentType: 'video/mp4', cacheControl: '0' });
        if (result.error) throw new ApiError('network', 'Kata belum siap digunakan karena rekaman belum berhasil dikirim. Coba Simpan Kata lagi.');
      }
      await ownerToken(ownerId);
      const info = await storage.info(upload.path);
      if (info.error || info.data.size !== bytes.byteLength) throw new ApiError('network', 'Rekaman belum dapat diverifikasi. Coba lagi.');
      progress(index + 1, recordings.length);
    }
    cancelled();
    const body = wordPayload(form, 'published');
    body.video_path = form.localUri ? uploads[form.id]?.path : undefined;
    body.syllables.forEach((part) => {
      if (form.syllables.find((value) => value.id === part.id)?.localUri) part.video_path = uploads[part.id]?.path;
    });
    await updatePendingUploads(ownerId, (rows) => rows.map((row) => touched.includes(row.path) ? { ...row, uncertain: true } : row));
    const token = await ownerToken(ownerId);
    let result: CustomWordDetail;
    try {
      result = form.isNew ? await api.createCustomWord(body, token) : await api.updateCustomWord(form.id, body, token);
    } catch (error) {
      if (error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout' || error.status === 409 || (error.status ?? 0) >= 500)) {
        const saved = await api.getCustomWord(form.id, await ownerToken(ownerId)).catch(() => null);
        if (!saved || !matchesSaved(saved, form, body)) {
          if (saved && error.status === 409) await updatePendingUploads(ownerId, (rows) => rows.map((row) => touched.includes(row.path) ? { ...row, uncertain: false } : row));
          throw error;
        }
        result = saved;
      } else {
        await updatePendingUploads(ownerId, (rows) => rows.map((row) => touched.includes(row.path) ? { ...row, uncertain: false } : row));
        throw error;
      }
    }
    await ownerToken(ownerId);
    if (!matchesSaved(result, form, body)) throw new ApiError('parse', 'Hasil penyimpanan belum cocok dengan materi. Muat ulang sebelum mencoba lagi.');
    const committed = activePaths(result);
    await updatePendingUploads(ownerId, (rows) => rows.filter((row) => !committed.has(row.path)));
    prepared(result);
    return result;
  } finally {
    touched.forEach((path) => activeUploads.delete(path));
    savingWords.delete(operation);
  }
}

/** Only known uncommitted versions are removed; uncertain commits and active bindings stay protected. */
export async function cleanupPendingUploads(api: ApiClient, ownerId: string): Promise<void> {
  const rows = await pendingUploads(ownerId);
  const words = new Map<string, CustomWordDetail | null>();
  for (const row of rows) {
    if (activeUploads.has(row.path)) continue;
    const shape = new RegExp(`^${ownerId}/words/${UUID}/(?:word|syllables/${UUID})/${UUID}\\.mp4$`, 'i');
    if (!shape.test(row.path) || !row.path.startsWith(`${ownerId}/words/${row.wordId}/`)) continue;
    if (!words.has(row.wordId)) {
      try { words.set(row.wordId, await api.getCustomWord(row.wordId, await ownerToken(ownerId))); }
      catch (error) { if (error instanceof ApiError && error.status === 404) words.set(row.wordId, null); else continue; }
    }
    const active = words.get(row.wordId);
    if (active && activePaths(active).has(row.path)) {
      await updatePendingUploads(ownerId, (current) => current.filter((item) => item.path !== row.path));
      continue;
    }
    if (row.uncertain) continue; // shortcut: unresolved commit outcomes require retry/reconciliation before cleanup.
    await ownerToken(ownerId);
    const storage = getClient().storage.from('rekan-wicara-tutorials');
    const removed = await storage.remove([row.path]);
    if (removed.error) continue;
    await ownerToken(ownerId);
    const info = await storage.info(row.path);
    if (missing(info.error)) await updatePendingUploads(ownerId, (current) => current.filter((item) => item.path !== row.path));
  }
}

export function manualError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'SCHEMA_MIGRATION_REQUIRED') return 'Fitur kata manual menunggu migrasi database. Hubungi pengelola, lalu coba lagi.';
    if (error.code === 'REVISION_CONFLICT') return 'Kata sudah berubah di tempat lain. Muat ulang sebelum menyimpan; input lokal tetap tersedia.';
    if (error.kind === 'timeout') return 'Server belum merespons. Kata mungkin sudah tercatat; periksa daftar kata sebelum mencoba lagi.';
    if (error.code || error.kind === 'file' || error.kind === 'network' || error.kind === 'parse' || error.status === 401) return error.message;
  }
  return 'Proses belum berhasil. Periksa koneksi dan sesi login, lalu coba lagi.';
}
