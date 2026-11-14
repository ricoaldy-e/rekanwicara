import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, statTile } from '../theme';

const SIZE = statTile.ring;
const WIDTH = statTile.ringWidth;
const R = (SIZE - WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;
const DOTS = 14;

export interface ProgressRingProps {
  /** 0..1. */
  value: number;
  /** Icon drawn in the middle (20 dp). */
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Dotted empty ring for "no data yet": no fill, no icon. */
  dashed?: boolean;
}

/** 40 dp ring: `hairline` track, `accent` fill. Decorative; the number beside it carries the information (design.md §5.10). */
export function ProgressRing({ value, icon, dashed = false }: ProgressRingProps) {
  const v = Math.min(Math.max(value, 0), 1);
  return (
    <View style={styles.box}>
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

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
});
