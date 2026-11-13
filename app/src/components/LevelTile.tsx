import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing, stroke } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<number, IconName> = {
  0: 'volume-medium-outline',
  1: 'happy-outline',
  2: 'chatbubble-outline',
  3: 'text-outline',
  4: 'swap-horizontal-outline',
};

export interface LevelTileProps {
  level: number;
  name: string;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}

/** One tile per level (design.md §5.8). Choosing it only changes which level is listed below. */
export function LevelTile({ level, name, selected, locked, onPress }: LevelTileProps) {
  const fg = locked ? colors.textMuted : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Level ${level}: ${name}${locked ? ', terkunci' : ''}`}
      testID={`level-${level}`}
      style={({ pressed }) => [styles.tile, (selected || pressed) && styles.raised, selected && styles.selected]}
    >
      <Ionicons name={locked ? 'lock-closed' : (ICONS[level] ?? 'ellipse-outline')} size={22} color={fg} />
      <Text maxFontSizeMultiplier={2} style={[styles.label, { color: fg }]}>
        Level {level}
      </Text>
      {locked ? (
        <Text maxFontSizeMultiplier={2} style={styles.locked}>
          Terkunci
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: 72,
    minHeight: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.tile,
    borderWidth: stroke.thick,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  raised: { backgroundColor: colors.surfaceRaised },
  selected: { borderColor: colors.border },
  label: { fontSize: fontSize.small, fontWeight: '700', textAlign: 'center' },
  locked: { fontSize: fontSize.small, color: colors.textMuted, textAlign: 'center' },
});
