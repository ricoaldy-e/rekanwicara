import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

import { deviceLabel, sanitizeDevice } from '../src/dataset/device';
import { MODEL_VIDEO_ITEMS, MODEL_VIDEOS } from '../src/dataset/modelVideos';
import {
  BLOCK_ORDER,
  buildSessionScript,
  durationForItem,
  ERROR_INSTRUCTIONS,
  INTENDED_ERROR_ITEMS,
  itemText,
  shuffle,
  type Block,
} from '../src/dataset/script';
import {
  clearSession,
  createSession,
  isComplete,
  loadSession,
  makeSessionId,
  markDone,
  nextClipIndex,
  saveSession,
  SESSION_STORAGE_KEY,
} from '../src/dataset/session';

const SERVER = path.resolve(__dirname, '../../server/app');

/** Deterministic PRNG (mulberry32) for reproducible shuffles. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('session script (SPEC §10.2)', () => {
  const clips = buildSessionScript('quiet', seeded(1));

  it('has 27 clips with the per-block counts of §10.2', () => {
    expect(clips).toHaveLength(27);
    const counts: Record<string, number> = {};
    clips.forEach((c) => (counts[c.block] = (counts[c.block] ?? 0) + 1));
    expect(counts).toEqual({ A: 2, B: 6, C: 1, D: 6, E: 6, F: 4, G: 2 });
  });

  it('keeps blocks in order A..G (shuffling only inside a block)', () => {
    const order = clips.map((c) => c.block);
    const sorted = [...order].sort((a, b) => BLOCK_ORDER.indexOf(a) - BLOCK_ORDER.indexOf(b));
    expect(order).toEqual(sorted);
  });

  it('shuffles inside blocks: different seeds give different orders, same content', () => {
    const orders = new Set(
      [1, 2, 3, 4, 5].map((s) =>
        buildSessionScript('quiet', seeded(s))
          .map((c) => c.key)
          .join(','),
      ),
    );
    expect(orders.size).toBeGreaterThan(1);
    const keys = (s: number) => buildSessionScript('quiet', seeded(s)).map((c) => c.key).sort();
    expect(keys(1)).toEqual(keys(2));
  });

  it('contains exactly the §10.2 items', () => {
    const byBlock = (b: Block) => clips.filter((c) => c.block === b).map((c) => `${c.item_id}#${c.rep}`).sort();
    expect(byBlock('A')).toEqual(['l0_hold_a#1', 'l0_soft_loud#1']);
    expect(byBlock('B')).toEqual(['l1_a#1', 'l1_a#2', 'l1_i#1', 'l1_i#2', 'l1_u#1', 'l1_u#2']);
    expect(byBlock('C')).toEqual(['l1_m#1']);
    expect(byBlock('D')).toEqual(['l2_ba#1', 'l2_bu#1', 'l2_ma#1', 'l2_mi#1', 'l2_pa#1', 'l2_pi#1']);
    expect(byBlock('E')).toEqual(['l3_apa#1', 'l3_bibi#1', 'l3_bumi#1', 'l3_ibu#1', 'l3_mama#1', 'l3_papa#1']);
  });

  it('uses each §10.3 intended error once, on its allowed item, with an instruction', () => {
    const errors = clips.filter((c) => c.intended_error !== 'none');
    expect(errors.map((c) => c.intended_error).sort()).toEqual(
      ['a_narrow', 'bad_face', 'bad_noise', 'mama_as_papa', 'mama_no_closure', 'u_flat_lips'].sort(),
    );
    for (const c of errors) {
      const allowed = INTENDED_ERROR_ITEMS[c.intended_error];
      if (allowed !== null) expect(c.item_id).toBe(allowed);
      expect(c.instruction).toBe(ERROR_INSTRUCTIONS[c.intended_error]);
    }
    expect(clips.filter((c) => c.block === 'F').every((c) => c.intended_error !== 'none')).toBe(true);
    expect(clips.filter((c) => c.block === 'G').map((c) => c.intended_error).sort()).toEqual(['bad_face', 'bad_noise']);
  });

  it('records bad_noise as "noisy" and everything else with the session condition', () => {
    for (const cond of ['quiet', 'noisy'] as const) {
      for (const c of buildSessionScript(cond, seeded(9))) {
        expect(c.condition).toBe(c.intended_error === 'bad_noise' ? 'noisy' : cond);
      }
    }
  });

  it('gives every clip a unique key equal to the server clip_id suffix', () => {
    expect(new Set(clips.map((c) => c.key)).size).toBe(27);
    for (const c of clips) {
      expect(c.key).toBe(`${c.item_id}__r${c.rep}__${c.intended_error}__${c.condition}`);
    }
  });

  it('records Level 0 for 4 s and everything else for 2.5 s (SPEC §8.2)', () => {
    for (const c of clips) expect(c.durationMs).toBe(c.item_id.startsWith('l0_') ? 4000 : 2500);
    expect(durationForItem('l3_mama')).toBe(2500);
  });

  it('shows readable text for every item', () => {
    expect(itemText('l0_hold_a')).toBe('Tahan "aaa"');
    expect(itemText('l1_m')).toBe('mmm');
    expect(itemText('l2_ma')).toBe('ma');
    expect(itemText('l3_bumi')).toBe('bumi');
  });

  it('shuffle keeps all elements', () => {
    expect(shuffle([1, 2, 3, 4], seeded(3)).sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('server sync', () => {
  it('INTENDED_ERROR_ITEMS matches INTENDED_ERRORS in server/app/core/storage.py', () => {
    const src = fs.readFileSync(path.join(SERVER, 'core/storage.py'), 'utf8');
    const block = src.slice(src.indexOf('INTENDED_ERRORS'), src.indexOf('}', src.indexOf('INTENDED_ERRORS')));
    const server: Record<string, string | null> = {};
    for (const m of block.matchAll(/"(\w+)":\s*(None|"(\w+)")/g)) server[m[1]] = m[3] ?? null;
    expect(Object.keys(server).length).toBeGreaterThan(5);
    expect(INTENDED_ERROR_ITEMS).toEqual(server);
  });

  it('every script and model-video item exists and is active in server items.json', () => {
    const items: { item_id: string; active: boolean }[] = JSON.parse(
      fs.readFileSync(path.join(SERVER, 'content/items.json'), 'utf8'),
    );
    const active = new Set(items.filter((i) => i.active).map((i) => i.item_id));
    for (const c of buildSessionScript('quiet')) expect(active.has(c.item_id)).toBe(true);
    for (const id of MODEL_VIDEO_ITEMS) expect(active.has(id)).toBe(true);
  });
});

describe('model videos (SPEC §10.4)', () => {
  it('lists the 16 items once each', () => {
    expect(MODEL_VIDEOS).toHaveLength(16);
    expect(new Set(MODEL_VIDEO_ITEMS).size).toBe(16);
    expect(MODEL_VIDEO_ITEMS.filter((i) => i.startsWith('l3_'))).toHaveLength(9);
    expect(MODEL_VIDEO_ITEMS).toEqual(expect.arrayContaining(['l1_a', 'l1_i', 'l1_u', 'l1_m', 'l2_ma', 'l2_pa', 'l2_ba']));
  });
});

describe('dataset session persistence', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('builds ids that pass the server ID pattern', () => {
    const id = makeSessionId('P2', new Date(2026, 10, 11, 9, 5));
    expect(id).toBe('P2_20261111_0905');
    expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it('walks through clips and resumes after a reload', async () => {
    let s = createSession('P1', 'quiet', 'samsung SM-A525F', new Date(2026, 10, 11, 9, 0), seeded(4));
    expect(nextClipIndex(s)).toBe(0);
    s = markDone(s, s.clips[0].key);
    s = markDone(s, s.clips[0].key); // idempotent (re-upload of the same clip)
    s = markDone(s, s.clips[1].key);
    await saveSession(s);

    const loaded = await loadSession();
    expect(loaded).toEqual(s);
    expect(nextClipIndex(loaded!)).toBe(2);
    expect(loaded!.done).toHaveLength(2);
    expect(isComplete(loaded!)).toBe(false);

    const full = loaded!.clips.reduce((acc, c) => markDone(acc, c.key), loaded!);
    expect(isComplete(full)).toBe(true);
    expect(nextClipIndex(full)).toBe(-1);

    await clearSession();
    expect(await loadSession()).toBeNull();
  });

  it('ignores corrupt or foreign stored state', async () => {
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, '{not json');
    expect(await loadSession()).toBeNull();
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(await loadSession()).toBeNull();
  });
});

describe('device label', () => {
  const pattern = /^[A-Za-z0-9][A-Za-z0-9 _.-]{0,39}$/;

  it('builds "brand model" on Android without repeating the brand', () => {
    expect(deviceLabel('android', { Brand: 'samsung', Model: 'SM-A525F' })).toBe('samsung SM-A525F');
    expect(deviceLabel('android', { Brand: 'Xiaomi', Model: 'Xiaomi 13T' })).toBe('Xiaomi 13T');
    expect(deviceLabel('ios', {}, '18.1')).toBe('iOS 18.1');
    expect(deviceLabel('web', {})).toBeUndefined();
  });

  it('sanitizes to the server pattern', () => {
    expect(sanitizeDevice('  =HYPERLINK("x")  Pixel 8 (Pro)')).toMatch(pattern);
    expect(sanitizeDevice('=cmd')).toBe('cmd');
    expect(sanitizeDevice('a'.repeat(80))).toHaveLength(40);
    expect(sanitizeDevice('###')).toBeUndefined();
    expect(sanitizeDevice(undefined)).toBeUndefined();
  });
});
