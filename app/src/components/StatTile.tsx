import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, lineHeight, radius, spacing, statTile, stroke, textFont } from '../theme';
import { ProgressRing } from './ProgressRing';

export interface StatTileProps {
  /** e.g. "2 / 6". */
  value: string;
  /** e.g. "vokal sesuai". */
  caption: string;
  /** 0..1 */
  ring: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  testID?: string;
}

/** Ring with icon + value + caption, left-aligned (design.md §5.10, Figma 57:449). */
export function StatTile({ value, caption, ring, icon, accessibilityLabel, testID }: StatTileProps) {
  return (
    <View testID={testID} accessible accessibilityLabel={accessibilityLabel} style={styles.tile}>
      <ProgressRing value={ring} icon={icon} />
      <View style={styles.text}>
        <Text maxFontSizeMultiplier={2} style={[styles.value, textFont(true)]}>
          {value}
        </Text>
        <Text maxFontSizeMultiplier={2} style={[styles.caption, textFont()]}>
          {caption}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: statTile.gap,
    padding: statTile.padding,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  text: { flex: 1, minWidth: 1, gap: spacing.xs / 2 },
  value: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  caption: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
});
