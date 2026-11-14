import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { colors, fontSize, radius, spacing, stroke, textFont, touchTarget } from '../theme';

export interface BackButtonProps {
  /** Names the destination ("Latihan", "Keluar latihan"), not just "Kembali" (design.md §5.2). */
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/** Back capsule: chevron + destination label inside a 48 dp pill (design.md §5.2). */
export function BackButton({ label, onPress, accessibilityLabel, testID }: BackButtonProps) {
  const { focusProps, focusStyle } = useFocusRing();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...focusProps}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, focusStyle]}
    >
      <Ionicons name="chevron-back" size={22} color={colors.text} accessible={false} />
      <Text maxFontSizeMultiplier={2} numberOfLines={1} style={[styles.label, textFont()]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.sm + spacing.xs,
    paddingRight: spacing.md + spacing.xs / 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  label: { flexShrink: 1, fontSize: fontSize.body, color: colors.text },
});
