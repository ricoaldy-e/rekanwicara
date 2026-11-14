import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { useReduceMotion } from '../a11y/useReduceMotion';
import { buttonHeight, colors, fontSize, iconSize, radius, spacing, stroke, textFont, touchTarget, wordForm } from '../theme';

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
  /** Narrow variant for three buttons in a row (Figma 50:584): small icon, 15 text, 10 dp padding. */
  compact?: boolean;
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
  compact = false,
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
        compact && styles.compact,
        disabled && styles.disabled,
        focusStyle,
      ]}
    >
      <View style={[styles.row, compact && styles.rowCompact]}>
        {icon ? <Ionicons name={icon} size={compact ? wordForm.compactIcon : iconSize.button} color={fg} accessible={false} /> : null}
        <Text maxFontSizeMultiplier={2} style={[styles.label, textFont(true), compact && styles.labelCompact, { color: fg }]}>{label}</Text>
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
  compact: { paddingHorizontal: wordForm.compactPadding },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs / 2 },
  rowCompact: { gap: wordForm.compactGap },
  label: { flexShrink: 1, fontSize: fontSize.label, textAlign: 'center' },
  labelCompact: { fontSize: fontSize.small },
});

const pressedStyle = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed },
  danger: { backgroundColor: colors.dangerPressed },
  secondary: { backgroundColor: colors.surfaceRaised },
});
