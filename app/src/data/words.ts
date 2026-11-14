/**
 * Companion words (kontrak §6): one word with 0–6 syllables, one video per material. The save order is
 * not atomic, so every step that fails undoes what this attempt already made (rows and uploaded files).
 * The storage itself is a `WordStore`: the mock (src/mock/words.ts) or Supabase (src/data/supabaseWords.ts).
 */
import type { WordDTO } from '../api/types';
import { MAX_SYLLABLES } from '../forms/limits';
import { makeUuid } from '../user/pure';

export const BUCKET = 'rekan-wicara-tutorials';

/** A video picked on the phone. `durationMs` is milliseconds. */
export interface VideoFile {
  uri: string;
  mimeType: string;
  fileSize: number;
  durationMs: number;
}

/** In a form: a new file to upload, or the stored one kept as it is (edit). */
export type VideoInput = { kind: 'new'; file: VideoFile } | { kind: 'kept'; path: string };

export interface WordFormData {
  text: string;
  instruction: string;
  video: VideoInput | null;
  /** In order; `id` is set for a syllable that already exists (edit). */
  syllables: Array<{ id?: string; text: string; instruction: string; video: VideoInput | null }>;
}

// ---------- rows, shaped like the kontrak tables ----------

export interface WordRow { id: string; text: string; instruction: string }
export interface SyllableRow { id: string; word_id: string; text: string; position: number; instruction: string }
/** One video per material: `material_id` is the word id or a syllable id. */
export interface VideoRow { material_id: string; word_id: string; storage_path: string; sort_order: 1 }
export interface WordRows { word: WordRow; syllables: SyllableRow[]; videos: VideoRow[] }

export type SaveStage = 'upload' | 'word' | 'syllables' | 'videos';

export interface WordStore {
  /** Owner of the files (`<uid>/words/<wordId>/…`). */
  readonly uid: string;
  list(): Promise<WordRows[]>;
  insertWord(row: WordRow): Promise<void>;
  insertSyllables(rows: SyllableRow[]): Promise<void>;
  insertVideos(rows: VideoRow[]): Promise<void>;
  /** Replaces the word's text, syllables and video rows in one go (edit). */
  replace(rows: WordRows): Promise<void>;
  /** Deletes the word and, by cascade, its syllables and video rows. */
  deleteWord(id: string): Promise<void>;
  upload(path: string, file: VideoFile, onProgress?: (fraction: number) => void): Promise<void>;
  removeFiles(paths: string[]): Promise<void>;
  /** Files that could not be removed now; tried again later. */
  queueRemoval(paths: string[]): Promise<void>;
}

/** Fraction 0–1 of all new videos uploaded in this save. */
export type SaveProgress = (done: number, total: number) => void;

export class SaveFailed extends Error {
  constructor(readonly stage: SaveStage, readonly cause: unknown) {
    super(`save failed at ${stage}`);
    this.name = 'SaveFailed';
  }
}

// ---------- pure helpers ----------

export const newWordId = () => `custom_word:${makeUuid()}`;
export const newSyllableId = () => `custom_syllable:${makeUuid()}`;

/** Where a material's video lives in the bucket. The suffix keeps an edited video from overwriting the old one. */
export const videoPath = (uid: string, wordId: string, materialId: string, suffix = makeUuid()) =>
  `${uid}/words/${wordId.replace(/[^\w-]/g, '_')}/${materialId.replace(/[^\w-]/g, '_')}-${suffix}.mp4`;

/** Complete = the word and every syllable have exactly one video. An incomplete word never reaches the Tuli user. */
export function isComplete(rows: WordRows): boolean {
  const materials = [rows.word.id, ...rows.syllables.map((s) => s.id)];
  return materials.every((id) => rows.videos.filter((v) => v.material_id === id).length === 1);
}

export interface MyWord {
  id: string;
  text: string;
  syllableCount: number;
  /** The syllable texts in order ("MA", "MA"), for the list line. */
  syllables: string[];
  complete: boolean;
}

export const toMyWord = (rows: WordRows): MyWord => ({
  id: rows.word.id,
  text: rows.word.text,
  syllableCount: rows.syllables.length,
  syllables: [...rows.syllables].sort((a, b) => a.position - b.position).map((s) => s.text),
  complete: isComplete(rows),
});

/** The same DTO the v2 API would give (kontrak §4), so Pilih kata and Jalur kata need no special case. */
export function toWordDTO(rows: WordRows): WordDTO {
  const ref = (materialId: string) =>
    rows.videos.filter((v) => v.material_id === materialId).map((v) => ({ bucket: BUCKET, path: v.storage_path, position: v.sort_order }));
  return {
    id: rows.word.id,
    text: rows.word.text,
    source: 'custom',
    level_2: [...rows.syllables]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ id: s.id, text: s.text, position: s.position, instruction: s.instruction, videos: ref(s.id) })),
    level_3: { instruction: rows.word.instruction, videos: ref(rows.word.id) },
  };
}

/** Removes files; what cannot be removed now goes to the retry queue (kontrak §6). */
async function removeOrQueue(store: WordStore, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    await store.removeFiles(paths);
  } catch {
    await store.queueRemoval(paths).catch(() => undefined);
  }
}

/** Uploads every new video of the form; returns material id → stored path, plus the paths uploaded so far on failure. */
async function uploadNew(
  store: WordStore,
  wordId: string,
  materials: Array<{ id: string; video: VideoInput | null }>,
  uploaded: string[],
  onProgress?: SaveProgress,
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const paths = new Map<string, string>();
  const fresh = materials.filter((m) => m.video?.kind === 'new');
  let done = 0;
  onProgress?.(0, fresh.length);
  for (const m of materials) {
    if (!m.video) continue;
    if (m.video.kind === 'kept') {
      paths.set(m.id, m.video.path);
      continue;
    }
    if (signal?.aborted) throw new Error('cancelled');
    const path = videoPath(store.uid, wordId, m.id);
    await store.upload(path, m.video.file);
    uploaded.push(path);
    paths.set(m.id, path);
    onProgress?.(++done, fresh.length);
  }
  return paths;
}

function buildRows(wordId: string, form: WordFormData, syllableIds: string[], paths: Map<string, string>): WordRows {
  const word: WordRow = { id: wordId, text: form.text, instruction: form.instruction };
  const syllables: SyllableRow[] = form.syllables.map((s, i) => ({
    id: syllableIds[i],
    word_id: wordId,
    text: s.text,
    position: i + 1,
    instruction: s.instruction,
  }));
  const videos: VideoRow[] = [wordId, ...syllableIds]
    .filter((id) => paths.has(id))
    .map((id) => ({ material_id: id, word_id: wordId, storage_path: paths.get(id)!, sort_order: 1 }));
  return { word, syllables, videos };
}

// ---------- service ----------

export async function listMine(store: WordStore): Promise<MyWord[]> {
  return (await store.list()).map(toMyWord);
}

export async function getRows(store: WordStore, id: string): Promise<WordRows | null> {
  return (await store.list()).find((r) => r.word.id === id) ?? null;
}

/**
 * New word: upload videos → word row → syllable rows → video rows (kontrak §6). On any failure the rows and files
 * made in this attempt are removed and `SaveFailed` is thrown; the caller keeps the form as it is.
 */
export async function createWord(store: WordStore, form: WordFormData, onProgress?: SaveProgress, signal?: AbortSignal): Promise<string> {
  if (form.syllables.length > MAX_SYLLABLES) throw new Error('too many syllables');
  const wordId = newWordId();
  const syllableIds = form.syllables.map(() => newSyllableId());
  const uploaded: string[] = [];
  let wordInserted = false;
  let stage: SaveStage = 'upload';
  try {
    const paths = await uploadNew(store, wordId, [{ id: wordId, video: form.video }, ...form.syllables.map((s, i) => ({ id: syllableIds[i], video: s.video }))], uploaded, onProgress, signal);
    const rows = buildRows(wordId, form, syllableIds, paths);
    stage = 'word';
    await store.insertWord(rows.word);
    wordInserted = true;
    stage = 'syllables';
    if (rows.syllables.length > 0) await store.insertSyllables(rows.syllables);
    stage = 'videos';
    await store.insertVideos(rows.videos);
    return wordId;
  } catch (cause) {
    // Compensation: undo this attempt. If deleting the row fails too, the word stays "Belum lengkap".
    if (wordInserted) await store.deleteWord(wordId).catch(() => undefined);
    await removeOrQueue(store, uploaded);
    throw new SaveFailed(stage, cause);
  }
}

/**
 * Edit: upload the new videos → replace the rows → only after that, remove the files nothing points to any more.
 * When replacing fails, the new uploads are removed and the stored word is untouched.
 */
export async function updateWord(store: WordStore, id: string, form: WordFormData, onProgress?: SaveProgress, signal?: AbortSignal): Promise<void> {
  if (form.syllables.length > MAX_SYLLABLES) throw new Error('too many syllables');
  const before = await getRows(store, id);
  if (!before) throw new SaveFailed('word', new Error('not found'));
  const syllableIds = form.syllables.map((s) => s.id ?? newSyllableId());
  const uploaded: string[] = [];
  let stage: SaveStage = 'upload';
  try {
    const paths = await uploadNew(store, id, [{ id, video: form.video }, ...form.syllables.map((s, i) => ({ id: syllableIds[i], video: s.video }))], uploaded, onProgress, signal);
    const rows = buildRows(id, form, syllableIds, paths);
    stage = 'word';
    await store.replace(rows);
    const stillUsed = new Set(rows.videos.map((v) => v.storage_path));
    await removeOrQueue(store, before.videos.map((v) => v.storage_path).filter((p) => !stillUsed.has(p)));
  } catch (cause) {
    await removeOrQueue(store, uploaded);
    throw new SaveFailed(stage, cause);
  }
}

/** The stored word as form values; stored videos are kept unless the user replaces them. */
export function formDataOf(rows: WordRows): WordFormData {
  const kept = (id: string) => {
    const v = rows.videos.find((x) => x.material_id === id);
    return v ? ({ kind: 'kept', path: v.storage_path } as const) : null;
  };
  return {
    text: rows.word.text,
    instruction: rows.word.instruction,
    video: kept(rows.word.id),
    syllables: [...rows.syllables]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ id: s.id, text: s.text, instruction: s.instruction, video: kept(s.id) })),
  };
}

/** Delete: read the file paths first, delete the rows (cascade), then the files; files that fail are queued. */
export async function removeWord(store: WordStore, id: string): Promise<void> {
  const rows = await getRows(store, id);
  if (!rows) return;
  await store.deleteWord(id);
  await removeOrQueue(store, rows.videos.map((v) => v.storage_path));
}

/** Words that may be shown to the Tuli user: only complete ones. */
export async function completeWordDTOs(store: WordStore): Promise<WordDTO[]> {
  return (await store.list()).filter(isComplete).map(toWordDTO);
}
