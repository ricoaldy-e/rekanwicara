/** Form limits in one place (flow §7.7.3, kontrak §6). The video values are first guesses the BE may change. */

/** Most syllable rows a word may have. */
export const MAX_SYLLABLES = 6;

export const VIDEO_LIMITS = {
  maxBytes: 50 * 1024 * 1024,
  maxDurationMs: 30_000,
  types: ['video/mp4', 'video/quicktime'],
} as const;

export const LIMITS = {
  username: { min: 3, max: 20 },
  email: { max: 254 },
  password: { min: 8, max: 64 },
  word: { max: 30 },
  syllable: { max: 10 },
  instruction: { min: 10, max: 500 },
} as const;

/** The counter "n / max" shows from this share of the limit (flow §7.7.1). */
export const COUNTER_FROM = 0.8;
