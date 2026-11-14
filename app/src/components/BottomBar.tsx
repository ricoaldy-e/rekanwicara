import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { bottomBar, colors, fontSize, radius, spacing, textFont } from '../theme';

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

/** Capsule bar, 80 dp, icon above an always-visible label (design.md §5.11, Figma 25:88). The parent Screen supplies the safe area. */
export function BottomBar({ items }: { items: BottomBarItem[] }) {
  return (
    <View style={styles.bar}>
      {items.map((it) => (
        <Item key={it.key} item={it} />
      ))}
    </View>
  );
}

function Item({ item: it }: { item: BottomBarItem }) {
  const { focusProps, focusStyle } = useFocusRing();
  return (
    <Pressable
      onPress={it.onPress}
      accessibilityRole="button"
      accessibilityLabel={it.accessibilityLabel ?? it.label}
      accessibilityState={{ selected: !!it.active }}
      {...focusProps}
      style={[styles.item, focusStyle]}
    >
      <View testID="bar-circle" style={[styles.circle, it.active && styles.circleActive]}>
        <Ionicons name={it.icon} size={bottomBar.icon} color={it.active ? colors.onAccent : colors.textMuted} accessible={false} />
      </View>
      <Text maxFontSizeMultiplier={2} style={[styles.label, textFont(!!it.active), it.active && styles.labelActive]}>
        {it.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: bottomBar.height,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: bottomBar.inset,
    marginBottom: spacing.sm,
    padding: bottomBar.padding,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  item: { flex: 1, minWidth: 1, alignItems: 'center', justifyContent: 'center', gap: bottomBar.gap, height: '100%' },
  circle: { width: bottomBar.circle, height: bottomBar.circle, borderRadius: bottomBar.circle / 2, alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: colors.accent },
  label: { fontSize: fontSize.small, lineHeight: 22, color: colors.textMuted },
  labelActive: { lineHeight: 20, color: colors.text },
});
