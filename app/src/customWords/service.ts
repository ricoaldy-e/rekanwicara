import { File } from 'expo-file-system';

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
  if (!form.word.trim()) throw new ApiError('file', 'Isi kata lengkap terlebih dahulu.');
  if (form.syllables.some((part) => !part.text.trim())) throw new ApiError('file', 'Isi teks suku kata atau hapus bagian yang kosong.');
  if (status === 'published' && !readyWord(form)) {
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
  return data.signedUrl;
}

/** Prepare durable draft references before uploads; a failure leaves a recoverable draft. */
export async function saveWord(
  api: ApiClient, ownerId: string, form: EditorWord, status: 'draft' | 'published', limits: Pick<CustomWordList, 'max_upload_mb'>,
  prepared: (word: CustomWordDetail) => void, progress: (current: number, total: number) => void,
): Promise<CustomWordDetail> {
  validateWord(form, status);
  const recordings = [{ id: form.id, uri: form.localUri }, ...form.syllables.map((p) => ({ id: p.id, uri: p.localUri }))]
    .filter((record): record is { id: string; uri: string } => !!record.uri);
  for (const record of recordings) validateRecording(record.uri, limits.max_upload_mb);
  const body = wordPayload(form, 'draft');
  let draft: CustomWordDetail;
  try {
    const token = await ownerToken(ownerId);
    draft = form.isNew ? await api.createCustomWord(body, token) : await api.updateCustomWord(form.id, body, token);
  } catch (error) {
    // Reconcile an uncertain POST before a retry, avoiding duplicate words after a timeout.
    if (form.isNew && error instanceof ApiError && (error.kind === 'timeout' || error.kind === 'network' || error.status === 409)) {
      try { prepared(await api.getCustomWord(form.id, await ownerToken(ownerId))); } catch { /* Preserve local inputs. */ }
    }
    throw error;
  }
  prepared(draft);
  for (const [index, record] of recordings.entries()) {
    const reference = record.id === form.id ? draft.video : draft.syllables.find((part) => part.id === record.id)?.video;
    if (!reference) throw new ApiError('parse', 'Materi video belum terhubung. Muat ulang kata.');
    ownedReference(reference, ownerId);
    const original = record.id === form.id ? form.video : form.syllables.find((part) => part.id === record.id)?.video;
    const canonical = `${ownerId}/words/${form.id}/${record.id === form.id ? 'word.mp4' : `syllables/${record.id}.mp4`}`;
    if (reference.path !== canonical && reference.path !== original?.path) throw new ApiError('parse', 'Video terhubung ke materi yang berbeda.');
    await ownerToken(ownerId);
    progress(index + 1, recordings.length);
    const bytes = await validateRecording(record.uri, limits.max_upload_mb).arrayBuffer();
    if (bytes.byteLength < 12 || String.fromCharCode(...new Uint8Array(bytes, 4, 4)) !== 'ftyp') {
      throw new ApiError('file', 'Berkas bukan video kamera MP4/MOV yang didukung. Rekam ulang.');
    }
    const { error } = await getClient().storage.from(reference.bucket).upload(reference.path, bytes, {
      upsert: true, contentType: 'video/mp4', cacheControl: '0',
    });
    if (error) throw new ApiError('network', 'Kata belum siap digunakan karena rekaman belum berhasil dikirim. Coba Simpan Kata lagi; rekaman lokal tetap tersedia selama form ini terbuka.');
  }
  const token = await ownerToken(ownerId);
  return status === 'published'
    ? api.updateCustomWord(form.id, { ...body, status, revision: draft.revision }, token)
    : api.getCustomWord(form.id, token);
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
