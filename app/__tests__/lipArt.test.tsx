import { render, screen } from '@testing-library/react-native';

import { LipIllustration } from '../src/components/LipIllustration';
import { LIP_ART } from '../src/results/lipArt';

describe('lip art (fixed drawings from Figma)', () => {
  it('has an outer line for every shape, an open mouth for the vowels, and a seam for closed lips', () => {
    for (const shape of Object.keys(LIP_ART) as (keyof typeof LIP_ART)[]) expect(LIP_ART[shape].outer).toMatch(/^M[\d. ]+C.+Z$/);
    for (const vowel of ['a', 'i', 'u', 'e', 'o'] as const) expect(LIP_ART[vowel].inner).toBeTruthy();
    expect(LIP_ART.closed.line).toBeTruthy();
    expect(LIP_ART.closed.inner).toBeUndefined();
  });

  it('is named for assistive tech and keeps the drawing\'s proportions', async () => {
    await render(<LipIllustration shape="u" size={130} testID="lips" />);
    const svg = screen.getByTestId('lips');
    expect(svg).toHaveAccessibleName('Bibir membulat dan maju untuk bunyi u');
    expect(svg.props.height).toBe(82);
  });
});
