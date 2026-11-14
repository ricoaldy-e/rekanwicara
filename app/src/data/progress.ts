/** Progress read from the stored attempts (v1 hijau/kuning/merah), shown as v2 statuses (kontrak §8). */
import type { ResultStatus } from '../api/types';
import type { Attempt } from '../user/pure';
import { fromStored } from './mappers';

const RANK: Record<ResultStatus, number> = { sesuai: 2, mendekati: 1, belum_sesuai: 0 };

/** Best status ever reached for an item; null when it was never tried. */
export function bestStatus(attempts: readonly Attempt[], itemId: string): ResultStatus | null {
  let best: ResultStatus | null = null;
  for (const a of attempts) {
    if (a.itemId !== itemId) continue;
    const s = fromStored(a.overall);
    if (best === null || RANK[s] > RANK[best]) best = s;
  }
  return best;
}

/** Status of the most recent attempt for an item; null when it was never tried. */
export function lastStatus(attempts: readonly Attempt[], itemId: string): ResultStatus | null {
  let last: Attempt | null = null;
  for (const a of attempts) if (a.itemId === itemId && (!last || a.at > last.at)) last = a;
  return last ? fromStored(last.overall) : null;
}

/** "x dari N sesuai": counted per unique itemId, by its best status. */
export function summary(attempts: readonly Attempt[], itemIds: readonly string[]): { done: number; total: number } {
  const unique = [...new Set(itemIds)];
  return { done: unique.filter((id) => bestStatus(attempts, id) === 'sesuai').length, total: unique.length };
}

/**
 * Item for the home hero "Lanjutkan": the first one, in catalog order, that is not yet "Sesuai".
 * null when nothing was ever tried (the new-user state) or when every item is already "Sesuai".
 * `status` is the best status so far, null for an item never tried.
 */
export function nextItem<T extends { itemId: string }>(
  attempts: readonly Attempt[],
  items: readonly T[],
): { item: T; status: ResultStatus | null } | null {
  if (attempts.length === 0) return null;
  for (const item of items) {
    const status = bestStatus(attempts, item.itemId);
    if (status !== 'sesuai') return { item, status };
  }
  return null;
}

export interface RecentActivity {
  itemId: string;
  level: number;
  status: ResultStatus;
  at: string;
}

/** Last attempt of each item, newest first (home "Aktivitas terakhir"). */
export function recentActivity(attempts: readonly Attempt[], limit = 3): RecentActivity[] {
  const latest = new Map<string, Attempt>();
  for (const a of attempts) {
    const seen = latest.get(a.itemId);
    if (!seen || a.at > seen.at) latest.set(a.itemId, a);
  }
  return [...latest.values()]
    .sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0))
    .slice(0, limit)
    .map((a) => ({ itemId: a.itemId, level: a.level, status: fromStored(a.overall), at: a.at }));
}

/**
 * Title and tile letter of a material for the home hero and activity list.
 * Level 1 vowels read "Vokal “a”"; a syllable id (`l2_ma`) is shown without its prefix; words are lower-case.
 */
export function describeItem(level: number, itemId: string, text?: string): { title: string; letter: string } {
  if (level === 2) {
    const syllable = (text ?? itemId.replace(/^l2_/, '')).toLowerCase();
    return { title: `Suku kata “${syllable}”`, letter: syllable.charAt(0) };
  }
  const base = text ?? itemId;
  if (level === 1) {
    const held = /^([aiueo]) panjang$/i.exec(base);
    const title = /^[aiueo]$/i.test(base) ? `Vokal “${base.toLowerCase()}”` : held ? `“${held[1].toLowerCase()}” panjang` : base;
    return { title, letter: base.charAt(0).toLowerCase() };
  }
  const word = base.toLowerCase();
  return { title: word, letter: word.charAt(0) };
}
