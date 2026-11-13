/** Pure rules for the word and syllable form (flow §7.7.3). A validator returns a Problem or null. */
import { LIMITS, MAX_SYLLABLES } from '../limits';
import type { MessageKey, Problem } from '../messages';

const WORD_SHAPE = /^[A-Za-z]+([ -][A-Za-z]+)*$/;
const LETTERS = /^[A-Za-z]+$/;

/** Trim and turn runs of spaces into one; nothing else is changed. */
export const normalizeWord = (s: string) => s.trim().replace(/\s+/g, ' ');
export const normalizeSyllable = (s: string) => s.trim();
/** Trim ends and collapse spaces and tabs; line breaks stay. */
export const normalizeInstruction = (s: string) => s.trim().replace(/[ \t]+/g, ' ');

const length = (s: string) => [...s].length;
const letters = (s: string) => s.toLowerCase().replace(/[ -]/g, '');

/** `others`: the other words (companion's and built-in) to compare with, ignoring letter case. */
export function wordText(value: string, others: readonly string[] = []): MessageKey | null {
  const v = normalizeWord(value);
  if (v === '') return 'wordEmpty';
  if (length(v) > LIMITS.word.max) return 'wordLong';
  if (!WORD_SHAPE.test(v)) return 'wordChars';
  if (others.some((o) => normalizeWord(o).toLowerCase() === v.toLowerCase())) return 'wordDuplicate';
  return null;
}

/** One row. Two rows may hold the same syllable (ma, ma). */
export function syllableText(value: string): MessageKey | null {
  const v = normalizeSyllable(value);
  if (v === '') return 'syllableEmpty';
  if (!LETTERS.test(v)) return 'syllableChars';
  if (length(v) > LIMITS.syllable.max) return 'syllableLong';
  return null;
}

/** A warning, not an error: spelling has exceptions. Null when there are no syllables or they add up to the word. */
export function syllablesMatch(word: string, syllables: readonly string[]): Problem | null {
  const parts = syllables.map(normalizeSyllable).filter((s) => s !== '');
  if (parts.length === 0) return null;
  const w = normalizeWord(word);
  if (parts.join('').toLowerCase() === letters(w)) return null;
  return { key: 'syllablesMismatch', vars: { joined: parts.join('-').toLowerCase(), word: w.toLowerCase() } };
}

/** True while another syllable row may still be added. */
export const canAddSyllable = (count: number) => count < MAX_SYLLABLES;

/** The "full" note for the Add button, or null while there is room. */
export const maxSyllables = (count: number): MessageKey | null => (canAddSyllable(count) ? null : 'syllablesFull');

export function instruction(value: string): MessageKey | null {
  const v = normalizeInstruction(value);
  if (v === '') return 'instructionEmpty';
  if (length(v) < LIMITS.instruction.min) return 'instructionShort';
  if (length(v) > LIMITS.instruction.max) return 'instructionLong';
  return null;
}
