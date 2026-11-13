import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme';
import { ProgressRing } from './ProgressRing';

export interface StatTileProps {
  value: string;
  caption: string;
  /** 0..1; omit for a tile without a ring. */
  ring?: number;
  accessibilityLabel: string;
  testID?: string;
}

/** Ring + value + caption (design.md §5.7). */
export function StatTile({ value, caption, ring, accessibilityLabel, testID }: StatTileProps) {
  return (
    <View testID={testID} accessible accessibilityLabel={accessibilityLabel} style={styles.tile}>
      {ring !== undefined ? <ProgressRing value={ring} /> : null}
      <Text maxFontSizeMultiplier={2} style={styles.value}>
        {value}
      </Text>
      <Text maxFontSizeMultiplier={2} style={styles.caption}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 96,
    gap: spacing.xs,
    padding: spacing.sm + spacing.xs,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
  },
  value: { fontSize: fontSize.label, fontWeight: '700', color: colors.text },
  caption: { fontSize: fontSize.small, color: colors.textMuted },
});
