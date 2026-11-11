/** Weekly summary for the companion (SPEC §8.1) and the text report to share. No UI, no clock. */

import { REVIEW_DAYS, type AttemptRecord, type ItemProgress } from '../state/progression';

const DAY_MS = 86_400_000;
export { REVIEW_DAYS };

export interface Weekly {
  /** Distinct sessions with at least one attempt in the last 7 days. */
  sessions: number;
  attempts: number;
  green: number;
  /** Items passed in the last 7 days. */
  passed: string[];
  /** Items whose review is due now. */
  reviews: string[];
  /** Items that are stuck ("macet"). */
  stuck: string[];
}

export function weeklySummary(
  progress: ReadonlyMap<string, ItemProgress>,
  attempts: readonly AttemptRecord[],
  now: Date,
): Weekly {
  const since = now.getTime() - 7 * DAY_MS;
  const week = attempts.filter((a) => Date.parse(a.at) >= since);
  const ids = (keep: (p: ItemProgress) => boolean) => [...progress.values()].filter(keep).map((p) => p.itemId);
  return {
    sessions: new Set(week.map((a) => a.sessionId)).size,
    attempts: week.length,
    green: week.filter((a) => a.overall === 'hijau').length,
    passed: ids((p) => p.passedAt !== null && Date.parse(p.passedAt) >= since),
    reviews: ids((p) => p.stage === 'ulasan'),
    stuck: ids((p) => p.stage === 'macet'),
  };
}

export const CONSULT_ADVICE =
  'Materi ini belum berkembang dalam 3 sesi terakhir. Sebaiknya dibicarakan dengan guru atau terapis wicara; ' +
  'aplikasi ini hanya alat bantu latihan.';

/** Plain text for the Share sheet. `name` turns an item id into its text ("mama"). */
export function reportText(w: Weekly, name: (itemId: string) => string): string {
  const list = (ids: string[]) => (ids.length > 0 ? ids.map(name).join(', ') : '-');
  const lines = [
    'Laporan latihan Cermin Wicara (7 hari terakhir)',
    `Sesi latihan: ${w.sessions}`,
    `Percobaan: ${w.attempts}` + (w.attempts > 0 ? `, ${w.green} sesuai` : ''),
    `Materi lulus: ${list(w.passed)}`,
    `Perlu diulas: ${list(w.reviews)}`,
    `Macet: ${list(w.stuck)}`,
  ];
  if (w.stuck.length > 0) lines.push('', `Saran: ${CONSULT_ADVICE}`);
  lines.push('', 'Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis.');
  return lines.join('\n');
}
