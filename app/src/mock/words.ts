/**
 * Mock storage for companion words (USE_MOCK): rows and "uploaded" files in AsyncStorage. Video files are not
 * copied; the stored path points at the picked file on the phone. Seeded with the two sample words of
 * src/mock/words (TOLONG, MINUM) so Pilih kata looks the same as before.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SaveStage, WordRows, WordStore } from '../data/words';
import { MOCK_UID } from './auth';
import custom1111 from './words/custom_1111.json';
import custom2222 from './words/custom_2222.json';

const ROWS_KEY = 'rw.mock.customWords';
const FILES_KEY = 'rw.mock.files';
const QUEUE_KEY = 'rw.mock.removeQueue';

/** Sample videos do not exist on the phone; the path only marks the material as having one. */
const SAMPLE = (id: string) => `sample/${id.replace(/[^\w-]/g, '_')}.mp4`;

function seed(): WordRows[] {
  return [custom1111, custom2222].map((w) => ({
    word: { id: w.id, text: w.text, instruction: w.level_3.instruction },
    syllables: w.level_2.map((s) => ({ id: s.id, word_id: w.id, text: s.text, position: s.position, instruction: s.instruction })),
    videos: [w.id, ...w.level_2.map((s) => s.id)].map((id) => ({ material_id: id, word_id: w.id, storage_path: SAMPLE(id), sort_order: 1 as const })),
  }));
}

async function readJson<T>(key: string, fallback: () => T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? fallback() : (JSON.parse(raw) as T);
}

export interface MockStoreOptions {
  /** Tests: make one save stage fail. 'upload' fails on the given upload count (1 = first file). */
  failAt?: { stage: SaveStage | 'remove' | 'delete'; nth?: number };
  uid?: string;
}

export function createMockWordStore(options: MockStoreOptions = {}): WordStore & { files(): Promise<string[]>; queue(): Promise<string[]> } {
  let uploads = 0;
  const fail = (stage: string) => {
    if (options.failAt?.stage !== stage) return;
    if (stage === 'upload' && uploads !== (options.failAt.nth ?? 1)) return;
    throw new Error(`mock failure at ${stage}`);
  };
  const rows = () => readJson<WordRows[]>(ROWS_KEY, seed);
  const setRows = (r: WordRows[]) => AsyncStorage.setItem(ROWS_KEY, JSON.stringify(r));
  const files = () => readJson<string[]>(FILES_KEY, () => []);
  const update = async (id: string, change: (r: WordRows) => WordRows) =>
    setRows((await rows()).map((r) => (r.word.id === id ? change(r) : r)));

  return {
    uid: options.uid ?? MOCK_UID,
    list: rows,
    async insertWord(word) {
      fail('word');
      await setRows([...(await rows()), { word, syllables: [], videos: [] }]);
    },
    async insertSyllables(syllables) {
      fail('syllables');
      await update(syllables[0].word_id, (r) => ({ ...r, syllables: [...r.syllables, ...syllables] }));
    },
    async insertVideos(videos) {
      fail('videos');
      if (videos.length) await update(videos[0].word_id, (r) => ({ ...r, videos: [...r.videos, ...videos] }));
    },
    async replace(next) {
      fail('word');
      await update(next.word.id, () => next);
    },
    async deleteWord(id) {
      fail('delete');
      await setRows((await rows()).filter((r) => r.word.id !== id));
    },
    async upload(path, file, onProgress) {
      uploads += 1;
      fail('upload');
      onProgress?.(1);
      // The mock keeps the picked file's uri as the stored "path" target.
      await AsyncStorage.setItem(FILES_KEY, JSON.stringify([...(await files()), path]));
      await AsyncStorage.setItem(`rw.mock.file.${path}`, file.uri);
    },
    async removeFiles(paths) {
      fail('remove');
      const gone = new Set(paths);
      await AsyncStorage.setItem(FILES_KEY, JSON.stringify((await files()).filter((p) => !gone.has(p))));
      await Promise.all(paths.map((p) => AsyncStorage.removeItem(`rw.mock.file.${p}`)));
    },
    async queueRemoval(paths) {
      const q = await readJson<string[]>(QUEUE_KEY, () => []);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...q, ...paths]));
    },
    files,
    queue: () => readJson<string[]>(QUEUE_KEY, () => []),
  };
}

/** The local file behind a mock stored path (for playback), or null for the sample words. */
export async function mockFileUri(path: string): Promise<string | null> {
  return AsyncStorage.getItem(`rw.mock.file.${path}`);
}

export const mockWordStore = createMockWordStore();
