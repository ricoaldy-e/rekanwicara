import Svg, { Ellipse, Line, Path, Polygon, Circle } from 'react-native-svg';

import { lipOpening, lipPolygon, LIP_LABELS, toSvgPoints, type LipShape } from '../results/lipShapes';
import { colors } from '../theme';


function Lips({
  shape,
  cx,
  cy,
  scale = 1,
  line = colors.text,
  inner = colors.background,
}: {
  shape: LipShape;
  cx: number;
  cy: number;
  scale?: number;
  line?: string;
  inner?: string;
}) {
  const opening = lipOpening(shape, cx, cy, scale);
  return (
    <>
      <Polygon
        points={toSvgPoints(lipPolygon(shape, cx, cy, scale))}
        fill="none"
        stroke={line}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {opening ? <Polygon points={toSvgPoints(opening)} fill={inner} stroke={line} strokeWidth={3} strokeLinejoin="round" /> : null}
      {shape === 'closed' ? (
        <Line x1={cx - 36 * scale} y1={cy} x2={cx + 36 * scale} y2={cy} stroke={line} strokeWidth={3} />
      ) : null}
    </>
  );
}

export interface LipIllustrationProps {
  shape: LipShape;
  /** Width in dp; height is two thirds of it. */
  size?: number;
  /** `hero`: cream line on the green hero card (design.md §5.9). */
  tone?: 'surface' | 'hero';
  testID?: string;
}

/** Drawn lip shape: relaxed, /a/ open, /i/ spread, /u/ rounded, closed (SPEC §8.1). */
export function LipIllustration({ shape, size = 140, tone = 'surface', testID }: LipIllustrationProps) {
  return (
    <Svg
      testID={testID}
      width={size}
      height={(size * 2) / 3}
      viewBox="0 0 120 80"
      accessible
      accessibilityRole="image"
      accessibilityLabel={LIP_LABELS[shape]}
    >
      <Lips
        shape={shape}
        cx={60}
        cy={40}
        line={tone === 'hero' ? colors.onHero : colors.text}
        inner={tone === 'hero' ? colors.hero : colors.background}
      />
    </Svg>
  );
}

export interface FaceGuideProps {
  shape: LipShape;
  size?: number;
  testID?: string;
}

/** A face inside the oval, showing where the head goes and which mouth shape to make. */
export function FaceGuide({ shape, size = 150, testID }: FaceGuideProps) {
  return (
    <Svg
      testID={testID}
      width={size}
      height={(size * 5) / 4}
      viewBox="0 0 120 150"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Wajah di tengah oval. ${LIP_LABELS[shape]}.`}
    >
      <Ellipse cx={60} cy={75} rx={50} ry={68} fill={colors.background} stroke={colors.text} strokeWidth={4} />
      <Circle cx={42} cy={56} r={4.5} fill={colors.text} />
      <Circle cx={78} cy={56} r={4.5} fill={colors.text} />
      <Path d="M60 64 L55 86 L65 86" fill="none" stroke={colors.text} strokeWidth={2} strokeLinecap="round" />
      <Lips shape={shape} cx={60} cy={108} scale={0.6} />
    </Svg>
  );
}
