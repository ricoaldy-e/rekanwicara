import { colors } from '../src/theme';

type Token = keyof typeof colors;

const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// design.md §3.1: text 4.5:1, control lines and focus ring 3:1.
const TEXT = 4.5;
const LINE = 3;
const pairs: [Token, Token, number][] = [
  ['text', 'background', TEXT],
  ['text', 'surface', TEXT],
  ['text', 'surfaceRaised', TEXT],
  ['textMuted', 'background', TEXT],
  ['textMuted', 'surface', TEXT],
  ['textMuted', 'surfaceRaised', TEXT],
  ['onHero', 'hero', TEXT],
  ['onHeroMuted', 'hero', TEXT],
  ['onPrimary', 'primary', TEXT],
  ['onPrimary', 'primaryPressed', TEXT],
  ['onPrimary', 'accent', TEXT],
  ['onPrimary', 'danger', TEXT],
  ['onPrimary', 'dangerPressed', TEXT],
  ['success', 'surface', TEXT],
  ['success', 'surfaceRaised', TEXT],
  ['warning', 'surface', TEXT],
  ['warning', 'surfaceRaised', TEXT],
  ['danger', 'surface', TEXT],
  ['danger', 'surfaceRaised', TEXT],
  ['border', 'background', LINE],
  ['border', 'surface', LINE],
  ['border', 'surfaceRaised', LINE],
  ['focus', 'background', LINE],
];

describe('theme contrast (design.md §3.1)', () => {
  it.each(pairs)('%s on %s is at least %d:1 when measured', (fg, bg, min) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });

  it('matches the documented values', () => {
    expect(contrast(colors.text, colors.background)).toBeCloseTo(17.16, 1);
    expect(contrast(colors.onHero, colors.hero)).toBeCloseTo(6.67, 1);
  });
});
