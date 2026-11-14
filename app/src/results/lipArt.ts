import type { LipShape } from './lipShapes';

/**
 * Fixed lip drawings, exported from Figma "Ilustrasi bibir" (frames LipIllustration/a, /i, /u, /closed), 130 x 82.
 * `outer` is the lips, `inner` the open mouth (filled), `line` the closed-lip seam. Made by the team, not generated.
 * Only the sounds of Level 1 have a drawing; syllables and words show the model video or the written instruction.
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
  closed: CLOSED,
  relaxed: { outer: CLOSED.outer },
};
