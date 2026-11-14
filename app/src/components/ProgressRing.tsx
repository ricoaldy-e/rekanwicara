import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, statTile } from '../theme';

const WIDTH = statTile.ringWidth;
const DOTS = 14;

export interface ProgressRingProps {
  /** 0..1. */
  value: number;
  /** Icon drawn in the middle (20 dp). */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Dotted empty ring for "no data yet": no fill, no icon. */
  dashed?: boolean;
  /** Outer size in dp; defaults to 40 (StatTile). */
  size?: number;
}

/** 40 dp ring: `hairline` track, `accent` fill. Decorative; the number beside it carries the information (design.md §5.10). */
export function ProgressRing({ value, icon, dashed = false, size: SIZE = statTile.ring }: ProgressRingProps) {
  const v = Math.min(Math.max(value, 0), 1);
  const R = (SIZE - WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE} accessible={false} style={StyleSheet.absoluteFill}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={colors.hairline}
          strokeWidth={WIDTH}
          fill="none"
          strokeLinecap={dashed ? 'round' : undefined}
          strokeDasharray={dashed ? `0.1 ${CIRCUMFERENCE / DOTS}` : undefined}
        />
        {!dashed && v > 0 ? (
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
      {icon && !dashed ? <Ionicons name={icon} size={statTile.icon} color={colors.text} accessible={false} /> : null}
    </View>
  );
}

