import Svg, { Path } from 'react-native-svg';

import { LIP_ART, LIP_ART_VIEWBOX } from '../results/lipArt';
import { LIP_LABELS, type LipShape } from '../results/lipShapes';
import { colors } from '../theme';

export interface LipIllustrationProps {
  shape: LipShape;
  /** Width in dp; the height follows the drawing (130 x 82). */
  size?: number;
  /** `hero`: cream line on the green hero card (design.md §5.9). */
  tone?: 'surface' | 'hero';
  testID?: string;
}

const STROKE = 2.6;

/** Fixed lip drawing from Figma: closed, /a/ open, /i/ spread, /u/ rounded (design.md §5.9). */
export function LipIllustration({ shape, size = 140, tone = 'surface', testID }: LipIllustrationProps) {
  const art = LIP_ART[shape];
  const hero = tone === 'hero';
  const line = hero ? colors.onHero : colors.text;
  const soft = hero ? colors.onHeroMuted : colors.textMuted;
  const join = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <Svg
      testID={testID}
      width={size}
      height={(size * LIP_ART_VIEWBOX.height) / LIP_ART_VIEWBOX.width}
      viewBox={`0 0 ${LIP_ART_VIEWBOX.width} ${LIP_ART_VIEWBOX.height}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={LIP_LABELS[shape]}
    >
      <Path d={art.outer} fill="none" stroke={line} strokeWidth={STROKE} {...join} />
      {art.inner ? <Path d={art.inner} fill={hero ? colors.hero : colors.background} stroke={soft} strokeWidth={STROKE} {...join} /> : null}
      {art.line ? <Path d={art.line} fill="none" stroke={soft} strokeWidth={STROKE} {...join} /> : null}
    </Svg>
  );
}
