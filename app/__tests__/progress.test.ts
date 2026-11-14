import { bestStatus, describeItem, lastStatus, nextItem, recentActivity, summary } from '../src/data/progress';
import type { Attempt } from '../src/user/pure';

const a = (itemId: string, overall: Attempt['overall'], at: string): Attempt => ({
  id: `${itemId}-${at}`, itemId, level: 1, sessionId: 's', at, overall, score: 0,
  indicators: { bibir: overall, suara: overall }, hintId: '', scorer: 'rules', engineVersion: 't', synced: false,
});

it('counts 0 of N without attempts', () => {
  expect(summary([], ['l1_a', 'l1_i'])).toEqual({ done: 0, total: 2 });
});

it('counts a repeated itemId once, by its best status', () => {
  const attempts = [a('l2_pa', 'merah', '2026-01-01'), a('l2_pa', 'hijau', '2026-01-02'), a('l2_pa', 'merah', '2026-01-03')];
  expect(summary(attempts, ['l2_pa', 'l2_pa', 'l3_papa'])).toEqual({ done: 1, total: 2 });
  expect(bestStatus(attempts, 'l2_pa')).toBe('sesuai');
  expect(lastStatus(attempts, 'l2_pa')).toBe('belum_sesuai');
});

it('does not count kuning (mendekati) as sesuai', () => {
  const attempts = [a('l1_a', 'kuning', '2026-01-01'), a('l1_a', 'merah', '2026-01-02')];
  expect(bestStatus(attempts, 'l1_a')).toBe('mendekati');
  expect(summary(attempts, ['l1_a'])).toEqual({ done: 0, total: 1 });
  expect(bestStatus(attempts, 'l1_i')).toBeNull();
});

describe('nextItem', () => {
  const items = [{ itemId: 'l1_a' }, { itemId: 'l1_i' }, { itemId: 'l1_u' }];

  it('is null without any attempt (new user) and when every item is sesuai', () => {
    expect(nextItem([], items)).toBeNull();
    const all = items.map((i, n) => a(i.itemId, 'hijau', `2026-01-0${n + 1}`));
    expect(nextItem(all, items)).toBeNull();
  });

  it('skips items that are sesuai and returns the first one that is not, with its best status', () => {
    const attempts = [a('l1_a', 'hijau', '2026-01-01'), a('l1_i', 'merah', '2026-01-02'), a('l1_i', 'kuning', '2026-01-03')];
    expect(nextItem(attempts, items)).toEqual({ item: items[1], status: 'mendekati' });
  });

  it('returns an item never tried with a null status, even if only other items were tried', () => {
    expect(nextItem([a('l2_ma', 'merah', '2026-01-01')], items)).toEqual({ item: items[0], status: null });
  });
});

describe('recentActivity', () => {
  it('keeps one row per item (its last attempt), newest first, up to the limit', () => {
    const attempts = [
      a('l1_a', 'hijau', '2026-01-01'),
      a('l1_i', 'merah', '2026-01-02'),
      a('l1_a', 'kuning', '2026-01-04'),
      a('l1_u', 'hijau', '2026-01-03'),
    ];
    expect(recentActivity(attempts, 2).map((r) => [r.itemId, r.status])).toEqual([
      ['l1_a', 'mendekati'],
      ['l1_u', 'sesuai'],
    ]);
    expect(recentActivity([])).toEqual([]);
  });
});

describe('describeItem', () => {
  it('titles vowels, syllables and words', () => {
    expect(describeItem(1, 'l1_u', 'U')).toEqual({ title: 'Vokal “u”', letter: 'u' });
    expect(describeItem(1, 'l0_hold_a', 'A panjang')).toEqual({ title: '“a” panjang', letter: 'a' });
    expect(describeItem(1, 'l0_soft_loud', 'Pelan ke keras')).toEqual({ title: 'Pelan ke keras', letter: 'p' });
    expect(describeItem(2, 'l2_ma')).toEqual({ title: 'Suku kata “ma”', letter: 'm' });
    expect(describeItem(3, 'l3_mama', 'MAMA')).toEqual({ title: 'mama', letter: 'm' });
  });
});
