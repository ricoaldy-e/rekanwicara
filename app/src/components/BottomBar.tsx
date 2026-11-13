import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface BottomBarItem {
  key: string;
  label: string;
  /** Spoken name; defaults to the label. */
  accessibilityLabel?: string;
  icon: IconName;
  active?: boolean;
  onPress: () => void;
}

const CIRCLE = 48;

/** Capsule bar with icon above an always-visible label (design.md §5.9). The parent Screen supplies the safe area. */
export function BottomBar({ items }: { items: BottomBarItem[] }) {
  return (
    <View style={styles.bar}>
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={it.onPress}
          accessibilityRole="button"
          accessibilityLabel={it.accessibilityLabel ?? it.label}
          accessibilityState={{ selected: !!it.active }}
          style={styles.item}
        >
          <View style={[styles.circle, it.active && styles.circleActive]}>
            <Ionicons name={it.icon} size={24} color={it.active ? colors.onAccent : colors.textMuted} />
          </View>
          <Text maxFontSizeMultiplier={2} style={[styles.label, it.active && styles.labelActive]}>
            {it.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  item: { flex: 1, alignItems: 'center', minHeight: 48 },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: colors.accent },
  label: { fontSize: fontSize.small, color: colors.textMuted },
  labelActive: { fontWeight: '700', color: colors.text },
});
