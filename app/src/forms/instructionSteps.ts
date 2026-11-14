import { LIMITS, MAX_STEPS } from './limits';

/**
 * An instruction is one string in the data (`instruction`); its steps are its lines. The form shows one field per
 * step and the "Lihat" screen shows one card per step, so the schema, the API and old data do not change.
 */

const length = (s: string) => [...s].length;
const tidy = (s: string) => s.trim().replace(/[ \t]+/g, ' ');
/** "1. ", "2) ", "- ", "• " at the start of a line. */
const LEADING_MARK = /^\s*(?:\d+\s*[.)]|[-•*])\s+/;

/** The rows of the step fields while editing: empty rows are kept so a new empty step can be typed into. */
export function editRows(value: string): string[] {
  return value === '' ? [''] : value.split(/\r?\n/);
}

/** The text to keep: every row tidied, empty rows dropped, rows joined by a line break. */
export function cleanInstruction(value: string): string {
  return value.split(/\r?\n/).map(tidy).filter((r) => r !== '').join('\n');
}

/** Sentences of a paragraph, the end mark kept with its sentence. */
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).map(tidy).filter((s) => s !== '');

/**
 * Steps to show or to load into the form: by line, marks like "1." removed. A single long paragraph (an old
 * instruction, or an AI answer without line breaks) is split by sentence. At most MAX_STEPS: the rest joins the last.
 */
export function splitSteps(text: string): string[] {
  let steps = text.split(/\r?\n/).map((r) => tidy(r.replace(LEADING_MARK, ''))).filter((r) => r !== '');
  if (steps.length === 1 && length(steps[0]) > LIMITS.instructionStep.max) steps = sentences(steps[0]);
  if (steps.length > MAX_STEPS) steps = [...steps.slice(0, MAX_STEPS - 1), steps.slice(MAX_STEPS - 1).join(' ')];
  return steps;
}

/** Text from an AI answer, ready for the step fields: same as splitSteps, joined again. */
export const fromAi = (text: string): string => splitSteps(text).join('\n');
