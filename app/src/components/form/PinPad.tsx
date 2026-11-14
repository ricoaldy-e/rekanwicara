import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fill, UI } from '../../forms/messages';
import { colors, fontSize, iconSize, pin, spacing, textFont } from '../../theme';

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']] as const;

export interface PinPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** True while locked after too many wrong tries. */
  disabled?: boolean;
}

/** Round keys 0-9 and Hapus, 76 dp each (design.md §5.6, Figma 50:186). Used instead of the system keyboard. */
export function PinPad({ onDigit, onDelete, disabled = false }: PinPadProps) {
  const digit = (d: string) => (
    <Key key={d} label={fill(UI.pinDigit, { d })} disabled={disabled} onPress={() => onDigit(d)} testID={`pin-${d}`}>
      <Text style={[styles.digit, textFont(), disabled && styles.muted]}>{d}</Text>
    </Key>
  );
  return (
    <View style={styles.pad} testID="pin-pad">
      {ROWS.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map(digit)}
        </View>
      ))}
      <View style={styles.row}>
        <View style={styles.key} />
        {digit('0')}
        <Key label={UI.delete} disabled={disabled} onPress={onDelete} testID="pin-delete">
          <Ionicons name="backspace-outline" size={iconSize.base} accessible={false} color={disabled ? colors.textMuted : colors.text} />
          <Text maxFontSizeMultiplier={2} style={[styles.deleteText, textFont(true), disabled && styles.muted]}>{UI.delete}</Text>
        </Key>
      </View>
    </View>
  );
}

function Key({ label, disabled, onPress, testID, children }: { label: string; disabled: boolean; onPress: () => void; testID: string; children: React.ReactNode }) {
  const isDelete = testID === 'pin-delete'; // Figma: Hapus has no fill until pressed
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.key, isDelete ? null : styles.keyFace, (pressed || disabled) && styles.keyRaised]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { gap: pin.rowGap, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: pin.columnGap, justifyContent: 'center' },
  key: { width: pin.key, height: pin.key, borderRadius: pin.key / 2, alignItems: 'center', justifyContent: 'center', gap: spacing.xs / 2 },
  keyFace: { backgroundColor: colors.surface },
  keyRaised: { backgroundColor: colors.surfaceRaised },
  digit: { fontSize: pin.digit, lineHeight: 28, color: colors.text },
  deleteText: { fontSize: fontSize.small, lineHeight: 20, color: colors.text },
  muted: { color: colors.textMuted },
});
