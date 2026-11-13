import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { colors, radius, spacing, touchTarget } from '../theme';

export interface CardProps {
  children: ReactNode;
  /** When set, the whole card is a large touch target. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({ children, onPress, accessibilityLabel, accessibilityHint, style, testID }: CardProps) {
  const { focusProps, focusStyle } = useFocusRing();
  if (!onPress) {
    return (
      <View testID={testID} style={[styles.card, style]}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      {...focusProps}
      style={({ pressed }) => [styles.card, styles.pressable, pressed && styles.pressed, style, focusStyle]}
    >
      <View style={styles.row}>
        <View style={styles.content}>{children}</View>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} accessible={false} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  pressable: { minHeight: touchTarget, justifyContent: 'center' },
  pressed: { backgroundColor: colors.surfaceRaised },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  content: { flex: 1 },
});
