import type { Item } from '../api/types';
import type { ItemProgress, PlanStep } from './progression';

export interface HomeStats {
  stepsDone: number;
  stepsTotal: number;
  /** Materials whose last attempt was "Sesuai". */
  greenCount: number;
  itemCount: number;
}

/** Counts for the home stat tiles (design.md §5.7). Empty data gives zeros. */
export function homeStats(
  plan: readonly PlanStep[],
  items: readonly Item[] | null | undefined,
  progress: ReadonlyMap<string, ItemProgress>,
): HomeStats {
  const list = items ?? [];
  return {
    stepsDone: plan.filter((s) => s.done).length,
    stepsTotal: plan.length,
    greenCount: list.filter((it) => progress.get(it.item_id)?.last === 'hijau').length,
    itemCount: list.length,
  };
}

/** 0..1 without dividing by zero. */
export const fraction = (part: number, whole: number) => (whole > 0 ? Math.min(part / whole, 1) : 0);

/** A level is locked when every material in it is locked. */
export function levelLocked(items: readonly Item[], progress: ReadonlyMap<string, ItemProgress>): boolean {
  return items.length > 0 && items.every((it) => progress.get(it.item_id)?.locked ?? false);
}

/**
 * Level shown by default on home: the level of the next step's material, otherwise the lowest open level,
 * otherwise the lowest level. null when there are no levels.
 */
export function defaultLevel(
  groups: readonly { level: number; items: readonly Item[] }[],
  nextItemLevel: number | undefined,
  progress: ReadonlyMap<string, ItemProgress>,
): number | null {
  if (nextItemLevel !== undefined && groups.some((g) => g.level === nextItemLevel)) return nextItemLevel;
  const open = groups.find((g) => !levelLocked(g.items, progress));
  return open?.level ?? groups[0]?.level ?? null;
}
