import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { useReduceMotion } from '../a11y/useReduceMotion';
import { buttonHeight, colors, fontSize, radius, spacing, stroke, textFont, touchTarget } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger';

export interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  accessibilityHint?: string;
  /** Spoken name when the visible label is not enough on its own (e.g. "Hapus TOLONG"); defaults to the label. */
  accessibilityLabel?: string;
  testID?: string;
}

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  accessibilityHint,
  accessibilityLabel,
  testID,
}: BigButtonProps) {
  const reduceMotion = useReduceMotion();
  const { focusProps, focusStyle } = useFocusRing();
  const fg = disabled ? colors.textMuted : variant === 'secondary' ? colors.text : colors.onPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      {...focusProps}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !disabled && pressedStyle[variant],
        pressed && !disabled && !reduceMotion && styles.scaled,
        disabled && styles.disabled,
        focusStyle,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={24} color={fg} accessible={false} /> : null}
        <Text maxFontSizeMultiplier={2} style={[styles.label, textFont(true), { color: fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: buttonHeight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  // Secondary is 48 dp (design.md §5.1); the 2 dp line is its only edge.
  secondary: { minHeight: touchTarget, backgroundColor: 'transparent', borderWidth: stroke.thick, borderColor: colors.border },
  // Disabled: fill only, no line, no opacity (design.md §5.1).
  disabled: { backgroundColor: colors.surfaceRaised, borderWidth: 0 },
  scaled: { transform: [{ scale: 0.98 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs / 2 },
  label: { flexShrink: 1, fontSize: fontSize.label, textAlign: 'center' },
});

const pressedStyle = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed },
  danger: { backgroundColor: colors.dangerPressed },
  secondary: { backgroundColor: colors.surfaceRaised },
});
