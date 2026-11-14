/** Lip shapes drawn by the app itself (SPEC §8.1: no image files). Pure geometry, no UI. */

export type LipShape = 'relaxed' | 'a' | 'i' | 'u' | 'o' | 'closed';
export type Point = [number, number];

export const LIP_LABELS: Record<LipShape, string> = {
  relaxed: 'Bibir rileks',
  a: 'Mulut terbuka lebar untuk bunyi a',
  i: 'Bibir melebar ke samping untuk bunyi i',
  u: 'Bibir membulat dan maju untuk bunyi u',
  o: 'Bibir bulat setengah terbuka untuk bunyi o',
  closed: 'Bibir rapat',
};

interface Spec {
  /** Outer width in a 120 x 80 drawing. */
  width: number;
  /** Width / height of the outer ring. */
  aspect: number;
  /** Superellipse exponent: 2 is an ellipse, lower is pointier at the corners. */
  power: number;
  /** Height of the dark opening relative to the outer ring (0 = no opening). */
  gap: number;
}

const SPECS: Record<LipShape, Spec> = {
  relaxed: { width: 80, aspect: 4, power: 2, gap: 0 },
  a: { width: 70, aspect: 1.6, power: 2, gap: 0.7 },
  i: { width: 100, aspect: 5, power: 1.6, gap: 0.3 },
  u: { width: 44, aspect: 1.1, power: 2.4, gap: 0.55 },
  o: { width: 54, aspect: 1.3, power: 2.2, gap: 0.62 },
  closed: { width: 84, aspect: 9, power: 1.8, gap: 0 },
};

/** Same number of points as the server's lip_contour (SPEC §6.4). */
export const RING_POINTS = 20;

/** The outer lip ring scaled to the unit square, like the server's lip_contour (0-1 in the mouth box). */
export function lipRing(shape: LipShape): Point[] {
  const e = 2 / SPECS[shape].power;
  return Array.from({ length: RING_POINTS }, (_, k) => {
    const a = (2 * Math.PI * k) / RING_POINTS;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [(Math.sign(c) * Math.abs(c) ** e + 1) / 2, (Math.sign(s) * Math.abs(s) ** e + 1) / 2];
  });
}

/** Outer ring in drawing units, centred on (cx, cy). */
export function lipPolygon(shape: LipShape, cx: number, cy: number, scale = 1): Point[] {
  const { width, aspect } = SPECS[shape];
  const w = width * scale;
  const h = w / aspect;
  return lipRing(shape).map(([x, y]) => [cx + (x - 0.5) * w, cy + (y - 0.5) * h]);
}

/** The dark mouth opening, or null for shapes with closed lips. */
export function lipOpening(shape: LipShape, cx: number, cy: number, scale = 1): Point[] | null {
  const { width, aspect, gap } = SPECS[shape];
  if (gap === 0) return null;
  const w = width * scale;
  const h = w / aspect;
  return lipRing(shape).map(([x, y]) => [cx + (x - 0.5) * w * 0.78, cy + (y - 0.5) * h * gap]);
}

export function toSvgPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

/** Shapes to show for one unit: closed lips first for a consonant, then the vowel. */
export function unitShapes(unit: string): LipShape[] {
  if (unit === 'm_hum') return ['closed'];
  const v = unit[unit.length - 1];
  const vowel: LipShape = v === 'a' || v === 'i' || v === 'u' || v === 'o' ? v : 'relaxed';
  return unit.length === 2 ? ['closed', vowel] : [vowel];
}

/** The target shape for a result: the vowel of the last unit, or null (e.g. the "mmm" hum). */
export function targetShape(unitTargets: readonly string[]): LipShape | null {
  const last = unitTargets[unitTargets.length - 1];
  const v = last?.[last.length - 1];
  return v === 'a' || v === 'i' || v === 'u' || v === 'o' ? v : null;
}

/** The shape of a Level 1 sound by its name: "A", "o", or a held vowel such as "A panjang". Null for "Pelan ke keras". */
export function soundShape(text: string): LipShape | null {
  const t = text.trim().toLowerCase();
  const held = /^([aiueo]) panjang$/.exec(t);
  return targetShape([held ? held[1] : t.length === 1 ? t : '']);
}
