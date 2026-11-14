import { StyleSheet, Text, View } from 'react-native';

import type { ResultStatus } from '../api/types';
import { colors, statusBadge, statusStyles, textFont } from '../theme';
import { StatusIcon } from './StatusIcon';

export interface StatusBadgeProps {
  status: ResultStatus;
  /** Optional indicator name shown before the status, e.g. "Bibir" or "Suara". */
  label?: string;
  size?: 'md' | 'lg';
  testID?: string;
}

/**
 * Status as glyph + text, no container (design.md §5.4, Figma 25:86). The glyph shape differs per status,
 * so it is never color alone. Level 2–3 "mendekati" is mapped to "belum_sesuai" before it reaches here (data/mappers.ts).
 */
export function StatusBadge({ status, label, size = 'md', testID }: StatusBadgeProps) {
  const s = statusStyles[status];
  const text = label ? `${label}: ${s.label}` : s.label;
  const m = statusBadge[size];
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      style={[styles.row, { gap: m.gap }]}
    >
      <StatusIcon testID={testID ? `${testID}-icon` : undefined} status={status} size={m.glyph} />
      <Text
        maxFontSizeMultiplier={2}
        style={[styles.text, textFont(true), { fontSize: m.fontSize, lineHeight: m.lineHeight }]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: statusBadge.paddingVertical },
  text: { color: colors.text, flexShrink: 1 },
});
