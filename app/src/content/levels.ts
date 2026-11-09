import type { Item } from '../api/types';

export const LEVEL_NAMES: Record<number, string> = {
  0: 'Suara',
  1: 'Bunyi',
  2: 'Suku kata',
  3: 'Kata',
  4: 'Pasangan kata',
};

/** Groups items by level, levels ascending, preserving server order inside a level. */
export function groupByLevel(items: Item[]): { level: number; items: Item[] }[] {
  const map = new Map<number, Item[]>();
  for (const it of items) {
    const list = map.get(it.level) ?? [];
    list.push(it);
    map.set(it.level, list);
  }
  return [...map.entries()].sort(([a], [b]) => a - b).map(([level, list]) => ({ level, items: list }));
}
