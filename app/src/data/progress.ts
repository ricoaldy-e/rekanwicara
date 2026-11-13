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
