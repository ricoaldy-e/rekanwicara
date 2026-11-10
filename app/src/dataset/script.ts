import type { RecordingCondition } from '../api/types';

/**
 * Dataset session script, SPEC §10.2 (27 clips per speaker) with intended errors from §10.3.
 * Blocks run A → G in order; clips are shuffled WITHIN each block.
 */

export type Block = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type SpeakerId = 'P1' | 'P2' | 'P3';
export const SPEAKER_IDS: readonly SpeakerId[] = ['P1', 'P2', 'P3'];

export const BLOCK_NAMES: Record<Block, string> = {
  A: 'Suara (Level 0)',
  B: 'Vokal',
  C: 'Dengung mmm',
  D: 'Suku kata',
  E: 'Kata',
  F: 'Kesalahan disengaja',
  G: 'Klip buruk',
};

/**
 * intended_error → the only item it applies to (null = any item). Mirrors INTENDED_ERRORS in
 * server/app/core/storage.py (a jest test keeps them in sync).
 */
export const INTENDED_ERROR_ITEMS: Record<string, string | null> = {
  none: null,
  mama_as_papa: 'l3_mama',
  u_flat_lips: 'l1_u',
  a_narrow: 'l1_a',
  mama_no_closure: 'l3_mama',
  bad_face: null,
  bad_noise: 'l1_a',
};

/** Recorder instructions for intended-error clips (SPEC §10.3). */
export const ERROR_INSTRUCTIONS: Record<string, string> = {
  mama_as_papa: 'Ucapkan "mama", tapi TAHAN suara saat bibir rapat (terdengar seperti "papa").',
  u_flat_lips: 'Ucapkan "u" dengan bibir DATAR, jangan dibulatkan.',
  a_narrow: 'Ucapkan "a" dengan mulut HAMPIR TERTUTUP.',
  mama_no_closure: 'Ucapkan "mama" TANPA merapatkan bibir.',
  bad_face: 'Geser wajah KELUAR bingkai saat merekam.',
  bad_noise: 'Nyalakan musik atau kipas KERAS, lalu ucapkan "a".',
};

export const DEFAULT_INSTRUCTION = 'Ucapkan dengan jelas seperti biasa. Tekan Ulang bila salah ucap.';

/** SPEC §8.2: 2.5 s by default, 4 s for Level 0. */
export function durationForItem(itemId: string): number {
  return itemId.startsWith('l0_') ? 4000 : 2500;
}

const ITEM_TEXT: Record<string, string> = {
  l0_hold_a: 'Tahan "aaa"',
  l0_soft_loud: 'Pelan lalu keras',
  l1_m: 'mmm',
};

/** Display text for an item id (no server round trip needed while recording). */
export function itemText(itemId: string): string {
  return ITEM_TEXT[itemId] ?? itemId.replace(/^l\d_/, '');
}

export interface ClipSpec {
  /** Unique within a session; equals the server clip_id without the speaker prefix. */
  key: string;
  block: Block;
  item_id: string;
  rep: number;
  intended_error: string;
  condition: RecordingCondition;
  durationMs: number;
  instruction: string;
}

interface ClipSeed {
  item_id: string;
  rep?: number;
  intended_error?: string;
  /** Overrides the session condition (bad_noise is always "noisy"). */
  condition?: RecordingCondition;
}

const BLOCKS: Record<Block, ClipSeed[]> = {
  A: [{ item_id: 'l0_hold_a' }, { item_id: 'l0_soft_loud' }],
  B: ['l1_a', 'l1_i', 'l1_u'].flatMap((item_id) => [
    { item_id, rep: 1 },
    { item_id, rep: 2 },
  ]),
  C: [{ item_id: 'l1_m' }],
  D: ['l2_ma', 'l2_pa', 'l2_ba', 'l2_mi', 'l2_pi', 'l2_bu'].map((item_id) => ({ item_id })),
  E: ['l3_mama', 'l3_papa', 'l3_bibi', 'l3_apa', 'l3_ibu', 'l3_bumi'].map((item_id) => ({ item_id })),
  F: [
    { item_id: 'l3_mama', intended_error: 'mama_as_papa' },
    { item_id: 'l1_u', intended_error: 'u_flat_lips' },
    { item_id: 'l1_a', intended_error: 'a_narrow' },
    { item_id: 'l3_mama', intended_error: 'mama_no_closure' },
  ],
  G: [
    // bad_face may use any item (SPEC §10.3); team decision B1: l3_mama.
    { item_id: 'l3_mama', intended_error: 'bad_face' },
    { item_id: 'l1_a', intended_error: 'bad_noise', condition: 'noisy' },
  ],
};

export const BLOCK_ORDER: readonly Block[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export function clipKey(itemId: string, rep: number, intendedError: string, condition: string): string {
  return `${itemId}__r${rep}__${intendedError}__${condition}`;
}

/** Fisher–Yates shuffle (returns a new array). */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildSessionScript(
  sessionCondition: RecordingCondition,
  random: () => number = Math.random,
): ClipSpec[] {
  return BLOCK_ORDER.flatMap((block) =>
    shuffle(BLOCKS[block], random).map((seed): ClipSpec => {
      const rep = seed.rep ?? 1;
      const intended_error = seed.intended_error ?? 'none';
      const condition = seed.condition ?? sessionCondition;
      return {
        key: clipKey(seed.item_id, rep, intended_error, condition),
        block,
        item_id: seed.item_id,
        rep,
        intended_error,
        condition,
        durationMs: durationForItem(seed.item_id),
        instruction: ERROR_INSTRUCTIONS[intended_error] ?? DEFAULT_INSTRUCTION,
      };
    }),
  );
}
