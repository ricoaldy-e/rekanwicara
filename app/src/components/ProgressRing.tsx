import Svg, { Circle } from 'react-native-svg';

import { colors } from '../theme';

const SIZE = 34;
const WIDTH = 4;
const R = (SIZE - WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** Decorative ring (design.md §5.7); the number beside it carries the information. */
export function ProgressRing({ value }: { value: number }) {
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <Svg width={SIZE} height={SIZE} accessible={false}>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.surfaceRaised} strokeWidth={WIDTH} fill="none" />
      {v > 0 ? (
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={colors.accent}
          strokeWidth={WIDTH}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * v} ${CIRCUMFERENCE}`}
          // Start at the top.
          rotation={-90}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      ) : null}
    </Svg>
  );
}
