import type { LipShape } from './lipShapes';

/**
 * Fixed lip drawings, exported from Figma "Ilustrasi bibir" (frames LipIllustration/a, /i, /u, /e, /o, /closed), 130 x 82.
 * `outer` is the lips, `inner` the open mouth (filled), `line` the closed-lip seam. Made by the team, not generated.
 * Only the vowels of Level 1 (a, i, u, e, o) and the closed lips have a drawing; syllables and words show the model video or the written instruction.
 */
export const LIP_ART_VIEWBOX = { width: 130, height: 82 } as const;

export interface LipArt {
  outer: string;
  inner?: string;
  line?: string;
}

const CLOSED: LipArt = {
  outer: 'M19.5 41C38 25.5 55 27 65 31.5C75 27 92 25.5 110.5 41C92 54 38 54 19.5 41Z',
  line: 'M24 41C45 44.5 85 44.5 106 41',
};

export const LIP_ART: Record<LipShape, LipArt> = {
  a: {
    outer: 'M16.25 40.625C36.5625 14.625 56.875 17.875 65 24.375C73.125 17.875 93.4375 14.625 113.75 40.625C93.4375 71.5 36.5625 71.5 16.25 40.625Z',
    inner: 'M34.125 40.625C50.375 32.5 79.625 32.5 95.875 40.625C79.625 56.875 50.375 56.875 34.125 40.625Z',
  },
  i: {
    outer: 'M8 41C31 20 52 22 65 27C78 22 99 20 122 41C99 60 31 60 8 41Z',
    inner: 'M24 41C47 34.5 83 34.5 106 41C83 48.5 47 48.5 24 41Z',
  },
  u: {
    outer: 'M35 42C35 27 50 22 65 28C80 22 95 27 95 42C95 56 82 63 65 63C48 63 35 56 35 42Z',
    inner: 'M55 42C55 37 59.5 33 65 33C70.5 33 75 37 75 42C75 47 70.5 51 65 51C59.5 51 55 47 55 42Z',
  },
  e: {
    outer: 'M12 41C34 19 54 22 65 26.5C76 22 96 19 118 41C96 62 34 62 12 41Z',
    inner: 'M30 41C48 34 82 34 100 41C82 52 48 52 30 41Z',
  },
  o: {
    outer: 'M30 42C30 25 47 19 65 26C83 19 100 25 100 42C100 59 84 66 65 66C46 66 30 59 30 42Z',
    inner: 'M52 43C52 36 57.5 31 65 31C72.5 31 78 36 78 43C78 50 72.5 55 65 55C57.5 55 52 50 52 43Z',
  },
  closed: CLOSED,
  relaxed: { outer: CLOSED.outer },
};
