/** Broad Indonesian reading labels; these are phone labels, not a word transcription. */
export const INDONESIAN_PHONE_LABELS: Readonly<Record<string, string>> = {
  a: 'a', b: 'b', d: 'd', 'dʒ': 'j', e: 'e', f: 'f', h: 'h', i: 'i',
  j: 'y', k: 'k', l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', r: 'r',
  s: 's', t: 't', 'tʃ': 'c', u: 'u', v: 'v', w: 'w', x: 'kh', z: 'z',
  'ŋ': 'ng', 'ə': 'e', 'ɛ': 'e', 'ɡ': 'g', 'ɲ': 'ny', 'ʃ': 'sy',
  'ʔ': 'henti glotal', 'ɔ': 'o',
};

export function readableIndonesianPhones(prediction: string): string {
  return prediction.trim().split(/\s+/).filter(Boolean)
    .map((phone) => Object.hasOwn(INDONESIAN_PHONE_LABELS, phone) ? INDONESIAN_PHONE_LABELS[phone] : 'bunyi lain')
    .join(' ');
}
