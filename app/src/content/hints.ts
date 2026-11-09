import hints from './hints.json';

/** Copy of server/app/content/hints.json (kept identical by __tests__/content.test.ts). */
export const HINTS: Readonly<Record<string, string>> = hints;

export function getHint(hintId: string | null | undefined): string | null {
  if (!hintId) return null;
  return HINTS[hintId] ?? null;
}
