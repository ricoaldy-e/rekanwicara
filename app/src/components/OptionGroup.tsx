import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontSize, radius, spacing, touchTarget } from '../theme';

export interface Option<T extends string> {
  value: T;
  label: string;
}

export interface OptionGroupProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  testID?: string;
}

/** Large radio buttons; the selected one is shown by fill + check icon + bold text (not colour alone). */
export function OptionGroup<T extends string>({ label, options, value, onChange, testID }: OptionGroupProps<T>) {
  return (
    <View style={styles.wrap} testID={testID} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={o.label}
              style={[styles.option, selected && styles.selected]}
            >
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={selected ? colors.onPrimary : colors.primary}
              />
              <Text style={[styles.text, selected && styles.textSelected]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexGrow: 1,
    minHeight: touchTarget,
    minWidth: 90,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  selected: { backgroundColor: colors.primary },
  text: { fontSize: fontSize.large, fontWeight: '600', color: colors.primary },
  textSelected: { color: colors.onPrimary, fontWeight: '800' },
});
