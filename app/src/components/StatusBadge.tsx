import { StyleSheet, Text, View } from 'react-native';

import type { Status } from '../api/types';
import { colors, fontSize, radius, spacing, statusStyles } from '../theme';
import { StatusIcon } from './StatusIcon';

export interface StatusBadgeProps {
  status: Status;
  /** Optional indicator name shown before the status, e.g. "Bibir" or "Suara". */
  label?: string;
  size?: 'md' | 'lg';
  testID?: string;
}

/** Status shown as color + icon + text, never color alone (SPEC §8.3, CLAUDE.md). */
export function StatusBadge({ status, label, size = 'md', testID }: StatusBadgeProps) {
  const s = statusStyles[status];
  const text = label ? `${label}: ${s.label}` : s.label;
  const big = size === 'lg';
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[styles.badge, { borderLeftColor: s.foreground }, big && styles.badgeLg]}
    >
      <StatusIcon testID={testID ? `${testID}-icon` : undefined} status={status} size={big ? 28 : 22} />
      <Text maxFontSizeMultiplier={2} style={[styles.text, { color: s.foreground }, big && styles.textLg]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
  },
  badgeLg: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  text: { fontSize: fontSize.label, fontWeight: '700' },
  textLg: { fontSize: fontSize.large },
});
