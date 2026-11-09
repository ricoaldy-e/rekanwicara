import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

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
      style={({ pressed }) => [styles.card, styles.pressable, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pressable: { minHeight: touchTarget, justifyContent: 'center' },
  pressed: { backgroundColor: colors.infoBg },
});
