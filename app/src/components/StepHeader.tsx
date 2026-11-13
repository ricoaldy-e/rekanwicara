import { StyleSheet, Text, View } from 'react-native';

import { colors, fontFamily, fontSize, radius, spacing } from '../theme';

export interface StepHeaderProps {
  step: number;
  total: number;
  title: string;
}

/** "Langkah 2 dari 4" + title + a visual progress bar (no sound cues). */
export function StepHeader({ step, total, title }: StepHeaderProps) {
  const progress = total > 0 ? Math.min(Math.max(step / total, 0), 1) : 0;
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`Langkah ${step} dari ${total}. ${title}`} style={styles.wrap}>
      <Text style={styles.step}>
        Langkah {step} dari {total}
      </Text>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.md },
  step: { fontSize: fontSize.small, color: colors.textMuted },
  title: { fontFamily: fontFamily.display, fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  track: {
    height: 12,
    borderRadius: radius.tile,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: colors.text },
});
