import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useReduceMotion } from '../a11y/useReduceMotion';
import { buttonHeight, colors, fontSize, radius, spacing, stroke } from '../theme';

type Variant = 'primary' | 'secondary';

export interface BigButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

export function BigButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  accessibilityHint,
  testID,
}: BigButtonProps) {
  const reduceMotion = useReduceMotion();
  const fg = disabled ? colors.textMuted : variant === 'primary' ? colors.onPrimary : colors.text;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && !disabled && (variant === 'primary' ? styles.primaryPressed : styles.secondaryPressed),
        pressed && !disabled && !reduceMotion && styles.scaled,
        disabled && styles.disabled,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Ionicons name={icon} size={22} color={fg} accessible={false} /> : null}
        <Text maxFontSizeMultiplier={2} style={[styles.label, { color: fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: buttonHeight,
    borderRadius: radius.pill,
    borderWidth: stroke.thick,
    borderColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: 'transparent', borderColor: colors.border },
  secondaryPressed: { backgroundColor: colors.surfaceRaised },
  disabled: { backgroundColor: colors.surfaceRaised, borderColor: 'transparent' },
  scaled: { transform: [{ scale: 0.98 }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flexShrink: 1, fontSize: fontSize.label, fontWeight: '700', textAlign: 'center' },
});
