import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, fontSize, radius, spacing, touchTarget } from '../theme';

export interface CheckRowProps {
  checked: boolean;
  onToggle: () => void;
  text: string;
  testID?: string;
}

/** A large checkbox row: state shown by icon + fill + the accessibility state, not colour alone. */
export function CheckRow({ checked, onToggle, text, testID }: CheckRowProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={text}
      style={[styles.row, checked && styles.on]}
    >
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={34} color={colors.primary} />
      <Text style={styles.text}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  on: { backgroundColor: colors.infoBg, borderColor: colors.primary },
  text: { flex: 1, fontSize: fontSize.body, color: colors.text },
});
