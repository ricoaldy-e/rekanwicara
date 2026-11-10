import type { QualityFlag } from '../api/types';
import hints from './hints.json';

/** Copy of server/app/content/hints.json (kept identical by __tests__/content.test.ts). */
export const HINTS: Readonly<Record<string, string>> = hints;

export function getHint(hintId: string | null | undefined): string | null {
  if (!hintId) return null;
  return HINTS[hintId] ?? null;
}

/** SPEC §6.2 flag order and §6.9 hints; /calibrate answers with flags only, no hint_id. */
const RETRY_HINT_BY_FLAG: [QualityFlag, string][] = [
  ['no_face', 'retry_no_face'],
  ['face_off_frame', 'retry_off_frame'],
  ['too_quiet', 'retry_quiet'],
  ['too_noisy', 'retry_noisy'],
  ['clipping', 'retry_clipping'],
  ['too_short', 'retry_short'],
];

/** The retry sentence for the first quality flag that needs a new recording; null when none does. */
export function retryHint(flags: readonly QualityFlag[]): string | null {
  const found = RETRY_HINT_BY_FLAG.find(([flag]) => flags.includes(flag));
  return found ? getHint(found[1]) : null;
}
