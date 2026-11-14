import Ionicons from '@expo/vector-icons/Ionicons';
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

/** "Belum dicoba": empty circle + muted text (design.md §5.4). Same metrics as the `md` StatusBadge. */
export function UntriedBadge({ testID }: { testID?: string }) {
  const m = statusBadge.md;
  return (
    <View testID={testID} accessible accessibilityLabel="Belum dicoba" style={[styles.row, { gap: m.gap }]}>
      <Ionicons name="ellipse-outline" size={m.glyph} color={colors.textMuted} accessible={false} />
      <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.untried, textFont(), { fontSize: m.fontSize, lineHeight: 22 }]}>
        Belum dicoba
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: statusBadge.paddingVertical },
  text: { color: colors.text, flexShrink: 1 },
  untried: { color: colors.textMuted, flexShrink: 1 },
});
