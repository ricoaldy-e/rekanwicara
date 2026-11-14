import { StyleSheet, View } from 'react-native';

import { colors, radius } from '../theme';

export interface ProgressBarProps {
  /** 0..1; null shows an indeterminate (half-filled, striped-colour) bar. */
  value: number | null;
  color?: string;
  height?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function ProgressBar({ value, color = colors.text, height = 14, accessibilityLabel, testID }: ProgressBarProps) {
  const pct = value === null ? 100 : Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={value === null ? undefined : { min: 0, max: 100, now: pct }}
      style={[styles.track, { height }]}
    >
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color, opacity: value === null ? 0.4 : 1 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});
