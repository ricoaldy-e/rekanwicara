import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useFocusRing } from '../a11y/useFocusRing';
import { colors, entry, fontSize, lineHeight, stroke, textFont, touchTarget } from '../theme';

export interface CheckRowProps {
  checked: boolean;
  onToggle: () => void;
  text: string;
  testID?: string;
}

/** A checkbox row (Figma 27:224): 28 dp box, filled cream with a check when selected, outlined when not. State is also in the accessibility state. */
export function CheckRow({ checked, onToggle, text, testID }: CheckRowProps) {
  const { focusProps, focusStyle } = useFocusRing();
  return (
    <Pressable
      testID={testID}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={text}
      {...focusProps}
      style={[styles.row, focusStyle]}
    >
      <View style={[styles.box, checked ? styles.boxOn : styles.boxOff]}>
        {checked ? <Ionicons name="checkmark" size={entry.check.icon} color={colors.onPrimary} accessible={false} /> : null}
      </View>
      <Text maxFontSizeMultiplier={2} style={[styles.text, textFont()]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: entry.check.gap, minHeight: touchTarget },
  box: { width: entry.check.box, height: entry.check.box, borderRadius: entry.check.radius, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary },
  boxOff: { borderWidth: stroke.thick, borderColor: colors.border },
  text: { flex: 1, minWidth: 1, fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.text },
});
