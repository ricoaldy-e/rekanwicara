import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { colors, fontSize, levelTile, lineHeight, radius, stroke, textFont } from '../theme';

export interface LevelTileProps {
  /** e.g. "Level 1". */
  level: string;
  /** e.g. "Bunyi vokal". */
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Spoken name; defaults to "level, title". */
  accessibilityLabel?: string;
  testID?: string;
}

/** Level shortcut, two per row (design.md §5.10, Figma 57:422): icon on top, level and name at the bottom. */
export function LevelTile({ level, title, icon, onPress, accessibilityLabel, testID }: LevelTileProps) {
  const { focusProps, focusStyle } = useFocusRing();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${level}, ${title}`}
      {...focusProps}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed, focusStyle]}
    >
      <Ionicons name={icon} size={levelTile.icon} color={colors.text} accessible={false} />
      <View style={styles.spacer} />
      <Text maxFontSizeMultiplier={2} style={[styles.level, textFont()]}>
        {level}
      </Text>
      <Text maxFontSizeMultiplier={2} style={[styles.title, textFont(true)]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 1,
    minHeight: levelTile.height,
    padding: levelTile.padding,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  spacer: { flex: 1 },
  level: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  title: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
});
