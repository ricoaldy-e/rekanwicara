import AsyncStorage from '@react-native-async-storage/async-storage';

import { completion, mapActivities, mapProgress } from '../src/home/mapping';
import { readResume, writeResume } from '../src/home/resume';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const names = new Map([['l1_a', 'A'], ['custom_word:fixture', 'TOLONG']]);
const attempt = { id: 'a', user_id: UID, item_id: 'l1_a', level: 1, status: 'ok', overall: 'hijau', created_at: '2026-11-14T01:00:00Z' };

it('maps Level 1 status colors and exposes only binary feedback for Level 2 and 3', () => {
  for (const level of [0, 1, 2, 3]) {
    const result = mapActivities([{ ...attempt, level, overall: 'kuning' }], UID, names)[0];
    expect(result.level).toBe(level);
    expect(result.result).toBe(level <= 1 ? 'Mendekati' : 'Belum Sesuai');
  }
  expect(mapActivities([attempt], UID, names)[0].result).toBe('Sesuai');
  expect(mapActivities([{ ...attempt, overall: 'merah' }], UID, names)[0].result).toBe('Belum Sesuai');
});

it('does not count retry as an activity or error and resolves custom names centrally', () => {
  const results = mapActivities([{ ...attempt, status: 'retry', overall: null },
    { ...attempt, id: 'b', item_id: 'custom_word:fixture', level: 3 }], UID, names);
  expect(results).toHaveLength(1);
  expect(results[0].name).toBe('TOLONG');
});

it('sorts activities newest first, with safe text for deleted items', () => {
  const results = mapActivities([attempt, { ...attempt, id: 'b', item_id: 'deleted', created_at: '2026-11-14T02:00:00Z' }], UID, names);
  expect(results.map((item) => item.id)).toEqual(['b', 'a']);
  expect(results[0].name).toBe('Materi tidak tersedia');
});

it('rejects rows from another account or malformed evaluated data', () => {
  expect(() => mapActivities([{ ...attempt, user_id: OTHER }], UID, names)).toThrow('Akun data berbeda');
  expect(() => mapActivities([{ ...attempt, overall: 'unexpected' }], UID, names)).toThrow();
  expect(() => mapActivities([{ ...attempt, created_at: 'not-a-date' }], UID, names)).toThrow();
  expect(() => mapProgress([{ user_id: OTHER }], UID)).toThrow();
});

it('uses database graduation metadata without inferring thresholds from attempts', () => {
  const progress = mapProgress([
    { user_id: UID, item_id: 'l1_a', stage: 'lulus', passed_at: null },
    { user_id: UID, item_id: 'l1_i', stage: 'berlatih', passed_at: null },
    { user_id: UID, item_id: 'l3_tolong', stage: 'ulasan', passed_at: '2026-11-14T00:00:00Z' },
    { user_id: UID, item_id: 'removed', stage: 'lulus', passed_at: null },
  ], UID);
  expect(completion([{ id: 'l1_a' }, { id: 'l1_i' }, { id: 'l1_a' }], progress)).toEqual({ passed: 1, total: 2 });
  expect(completion([{ id: 'l3_tolong' }], progress)).toEqual({ passed: 1, total: 1 });
  expect(completion([], [])).toEqual({ passed: 0, total: 0 });
});

describe('account-scoped continuation', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });
  const point = { kind: 'word' as const, id: 'custom_word:fixture', position: 2, phase: 'tutorial' as const };

  it('persists a separate cursor per account without storing credentials or media', async () => {
    expect(await readResume(UID)).toBeNull();
    await writeResume(UID, point);
    expect(await readResume(UID)).toEqual(point);
    expect(await readResume(OTHER)).toBeNull();
    await writeResume(OTHER, { ...point, position: 1 });
    await writeResume(UID, null);
    expect(await readResume(UID)).toBeNull();
    expect(await readResume(OTHER)).toEqual({ ...point, position: 1 });
  });

  it('rejects invalid positions and account keys; safely reads malformed cache', async () => {
    await expect(writeResume(UID, { ...point, position: 0 })).rejects.toThrow();
    await expect(writeResume('unsafe/user', point)).rejects.toThrow();
    await AsyncStorage.setItem(`rw.resume.${UID}`, '{broken');
    expect(await readResume(UID)).toBeNull();
  });

  it('serializes only the allowed cursor fields', async () => {
    await writeResume(UID, { ...point, token: 'must-not-persist', uri: 'synthetic-private' } as typeof point);
    const raw = await AsyncStorage.getItem(`rw.resume.${UID}`);
    expect(JSON.parse(raw!)).toEqual(point);
    expect(raw).not.toContain('must-not-persist');
    expect(raw).not.toContain('synthetic-private');
  });
});
