import { bestStatus, lastStatus, summary } from '../src/data/progress';
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
