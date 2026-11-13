import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCatalog, getWord } from '../src/data/catalog';
import { createWord, isComplete, listMine, removeWord, SaveFailed, updateWord, type VideoFile, type WordFormData } from '../src/data/words';
import { createMockWordStore } from '../src/mock/words';

jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
const run = <T,>(p: Promise<T>) => {
  jest.runAllTimers();
  return p;
};

const file = (name: string): VideoFile => ({ uri: `file:///${name}.mp4`, mimeType: 'video/mp4', fileSize: 1000, durationMs: 4000 });
const SUSU: WordFormData = {
  text: 'susu',
  instruction: 'Bulatkan bibir dan ucapkan susu perlahan.',
  video: { kind: 'new', file: file('susu') },
  syllables: [
    { text: 'su', instruction: 'Bulatkan bibir, ucapkan su.', video: { kind: 'new', file: file('su1') } },
    { text: 'su', instruction: 'Ucapkan su sekali lagi.', video: { kind: 'new', file: file('su2') } },
  ],
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('mock word store', () => {
  it('starts with the two sample companion words, both complete', async () => {
    const mine = await listMine(createMockWordStore());
    expect(mine.map((w) => [w.text, w.syllableCount, w.complete])).toEqual([
      ['TOLONG', 2, true],
      ['MINUM', 0, true],
    ]);
  });

  it('creates a word with syllables, one video each, and reports upload progress', async () => {
    const store = createMockWordStore();
    const progress: [number, number][] = [];
    const id = await createWord(store, SUSU, (d, t) => progress.push([d, t]));
    expect(progress).toEqual([[0, 3], [1, 3], [2, 3], [3, 3]]);
    const rows = (await store.list()).find((r) => r.word.id === id)!;
    expect(rows.syllables.map((s) => [s.text, s.position])).toEqual([['su', 1], ['su', 2]]);
    expect(rows.videos).toHaveLength(3);
    expect(isComplete(rows)).toBe(true);
    expect(await store.files()).toHaveLength(3);
  });

  it('creates a word without syllables', async () => {
    const store = createMockWordStore();
    const id = await createWord(store, { ...SUSU, syllables: [] });
    expect((await listMine(store)).find((w) => w.id === id)).toMatchObject({ syllableCount: 0, complete: true });
  });

  it.each(['word', 'syllables', 'videos'] as const)('a failure at "%s" removes the rows and the files of this attempt', async (stage) => {
    const store = createMockWordStore({ failAt: { stage } });
    const err = await createWord(store, SUSU).catch((e) => e);
    expect(err).toBeInstanceOf(SaveFailed);
    expect(err.stage).toBe(stage);
    expect((await listMine(store)).map((w) => w.text)).toEqual(['TOLONG', 'MINUM']);
    expect(await store.files()).toEqual([]);
  });

  it('a failed second upload removes the first uploaded file', async () => {
    const store = createMockWordStore({ failAt: { stage: 'upload', nth: 2 } });
    await expect(createWord(store, SUSU)).rejects.toMatchObject({ stage: 'upload' });
    expect(await store.files()).toEqual([]);
  });

  it('when the compensation cannot delete the row, the word stays "Belum lengkap" and is hidden from Pilih kata', async () => {
    // Fail at the video rows and also refuse the delete: the word row stays without videos.
    const failing = createMockWordStore({ failAt: { stage: 'videos' } });
    const deleteWord = failing.deleteWord;
    failing.deleteWord = async () => {
      throw new Error('offline');
    };
    await expect(createWord(failing, SUSU)).rejects.toBeInstanceOf(SaveFailed);
    failing.deleteWord = deleteWord;
    const mine = await listMine(failing);
    expect(mine.find((w) => w.text === 'susu')).toMatchObject({ complete: false });
    const catalog = await run(getCatalog({ baseUrl: '', mock: true }));
    expect(catalog.words.map((w) => w.text)).not.toContain('susu');
  });

  it('a file that cannot be removed goes to the retry queue', async () => {
    const store = createMockWordStore({ failAt: { stage: 'remove' } });
    const id = await createWord(store, SUSU);
    await removeWord(store, id);
    expect((await listMine(store)).map((w) => w.text)).not.toContain('susu');
    expect(await store.queue()).toHaveLength(3);
  });

  it('edit: keeps unchanged videos, removes the old file only after the rows are saved', async () => {
    const store = createMockWordStore();
    const id = await createWord(store, SUSU);
    const before = (await store.list()).find((r) => r.word.id === id)!;
    const wordPath = before.videos.find((v) => v.material_id === id)!.storage_path;
    const keep = (sid: string) => ({ kind: 'kept' as const, path: before.videos.find((v) => v.material_id === sid)!.storage_path });
    await updateWord(store, id, {
      text: 'susu',
      instruction: 'Instruksi baru yang cukup panjang.',
      video: { kind: 'new', file: file('susu-baru') },
      syllables: [{ id: before.syllables[0].id, text: 'su', instruction: 'Bulatkan bibir, ucapkan su.', video: keep(before.syllables[0].id) }],
    });
    const after = (await store.list()).find((r) => r.word.id === id)!;
    expect(after.syllables).toHaveLength(1);
    expect(after.videos).toHaveLength(2);
    const files = await store.files();
    expect(files).not.toContain(wordPath); // replaced video gone
    expect(files).not.toContain(before.videos.find((v) => v.material_id === before.syllables[1].id)!.storage_path); // removed syllable's video gone
    expect(files).toContain(keep(before.syllables[0].id).path);
  });

  it('edit: when saving the rows fails, the stored word and its files stay as they were', async () => {
    const ok = createMockWordStore();
    const id = await createWord(ok, SUSU);
    const before = (await ok.list()).find((r) => r.word.id === id)!;
    const failing = createMockWordStore({ failAt: { stage: 'word' } });
    await expect(updateWord(failing, id, { ...SUSU, video: { kind: 'new', file: file('x') } })).rejects.toBeInstanceOf(SaveFailed);
    expect((await ok.list()).find((r) => r.word.id === id)).toEqual(before);
    expect(await ok.files()).toHaveLength(3);
  });

  it('companion words reach Pilih kata and Jalur kata through the mock catalog', async () => {
    const store = createMockWordStore();
    const id = await createWord(store, SUSU);
    const catalog = await run(getCatalog({ baseUrl: '', mock: true }));
    expect(catalog.words.find((w) => w.id === id)).toEqual({ id, text: 'susu', source: 'custom', has_level_2: true });
    expect(catalog.words.filter((w) => w.source === 'default').map((w) => w.id)).toEqual(['l3_mama', 'l3_papa']);
    const word = await run(getWord(id, { baseUrl: '', mock: true }));
    expect(word.level_2.map((s) => [s.text, s.position, s.videos.length])).toEqual([['su', 1, 1], ['su', 2, 1]]);
    expect(word.level_3.videos).toHaveLength(1);
    await removeWord(store, id);
    await expect(run(getWord(id, { baseUrl: '', mock: true }))).rejects.toMatchObject({ code: 'ITEM_NOT_FOUND' });
  });
});
