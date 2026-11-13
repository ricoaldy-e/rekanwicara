import type { Item } from '../src/api/types';
import { defaultLevel, fraction, homeStats, levelLocked } from '../src/state/homeStats';
import type { ItemProgress } from '../src/state/progression';

const item = (id: string, level: number): Item => ({
  item_id: id, level, text: id, units: ['a'], priority: 'required', emoji: null, active: true,
});
const prog = (itemId: string, over: Partial<ItemProgress>): ItemProgress => ({
  itemId, stage: 'berlatih', locked: false, pattern: 'berblok', attempts: 0, last10: [], last: null,
  sessions: 0, passedAt: null, nextReviewAt: null, ...over,
});

describe('homeStats', () => {
  it('gives zeros for empty data', () => {
    expect(homeStats([], null, new Map())).toEqual({ stepsDone: 0, stepsTotal: 0, greenCount: 0, itemCount: 0 });
    expect(fraction(0, 0)).toBe(0);
  });

  it('counts done steps and materials whose last status is hijau', () => {
    const items = [item('a', 0), item('b', 1), item('c', 1)];
    const progress = new Map([
      ['a', prog('a', { last: 'hijau' })],
      ['b', prog('b', { last: 'kuning' })],
    ]);
    const plan = [
      { itemId: 'a', role: 'pemanasan' as const, done: true },
      { itemId: 'b', role: 'inti' as const, done: false },
    ];
    expect(homeStats(plan, items, progress)).toEqual({ stepsDone: 1, stepsTotal: 2, greenCount: 1, itemCount: 3 });
    expect(fraction(1, 3)).toBeCloseTo(1 / 3);
  });
});

describe('defaultLevel', () => {
  const groups = [
    { level: 0, items: [item('a', 0)] },
    { level: 1, items: [item('b', 1)] },
    { level: 2, items: [item('c', 2)] },
  ];

  it('prefers the level of the next step', () => {
    expect(defaultLevel(groups, 2, new Map())).toBe(2);
  });

  it('falls back to the lowest open level', () => {
    const progress = new Map([['a', prog('a', { locked: true })]]);
    expect(levelLocked(groups[0].items, progress)).toBe(true);
    expect(defaultLevel(groups, undefined, progress)).toBe(1);
  });

  it('returns the lowest level when all are locked and null without levels', () => {
    const progress = new Map(['a', 'b', 'c'].map((id) => [id, prog(id, { locked: true })]));
    expect(defaultLevel(groups, undefined, progress)).toBe(0);
    expect(defaultLevel([], undefined, new Map())).toBeNull();
  });
});
