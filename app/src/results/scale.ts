/** Chart geometry without UI (SPEC §8.3). Plot values map to the unit square. */

import type { FormantPoint, VowelAnchors } from '../api/types';

/** Axis ranges in Hz for the vowel map; values outside are clamped to the edge. */
export const F1_RANGE = [200, 1000] as const;
export const F2_RANGE = [600, 2800] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** F2 runs right-to-left (high F2 on the left) and F1 top-to-bottom (low F1 on top), as in phonetics. */
export function vowelMapXY(p: FormantPoint): { x: number; y: number } {
  return {
    x: clamp01((F2_RANGE[1] - p.f2) / (F2_RANGE[1] - F2_RANGE[0])),
    y: clamp01((p.f1 - F1_RANGE[0]) / (F1_RANGE[1] - F1_RANGE[0])),
  };
}

export type AnchorName = 'a' | 'i' | 'u';

/** The anchor vowel closest to the point on the map, for the text alternative of the chart. */
export function nearestAnchor(point: FormantPoint, anchors: VowelAnchors): AnchorName | null {
  const here = vowelMapXY(point);
  let best: AnchorName | null = null;
  let bestDistance = Infinity;
  for (const name of ['a', 'i', 'u'] as const) {
    const anchor = anchors[name];
    if (!anchor) continue;
    const there = vowelMapXY(anchor);
    const d = Math.hypot(here.x - there.x, here.y - there.y);
    if (d < bestDistance) {
      best = name;
      bestDistance = d;
    }
  }
  return best;
}

/** Keeps at most `max` evenly spaced values (always the last one) so long series stay cheap to draw. */
export function downsample<T>(values: readonly T[], max: number): T[] {
  if (values.length <= max) return [...values];
  const out: T[] = [];
  for (let k = 0; k < max - 1; k++) out.push(values[Math.floor((k * (values.length - 1)) / (max - 1))]);
  out.push(values[values.length - 1]);
  return out;
}

/** Loudness series scaled to the unit square: x by time, y by dB (louder = higher = smaller y). */
export function loudnessXY(t_ms: readonly number[], db: readonly number[]): { x: number; y: number }[] {
  const n = Math.min(t_ms.length, db.length);
  if (n === 0) return [];
  const t0 = t_ms[0];
  const span = Math.max(1, t_ms[n - 1] - t0);
  const lo = Math.min(...db.slice(0, n));
  const range = Math.max(1, Math.max(...db.slice(0, n)) - lo);
  return Array.from({ length: n }, (_, k) => ({ x: (t_ms[k] - t0) / span, y: 1 - (db[k] - lo) / range }));
}
