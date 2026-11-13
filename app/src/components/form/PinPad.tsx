import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fill, UI } from '../../forms/messages';
import { colors, fontSize, pinKey, radius, spacing, stroke } from '../../theme';

const ROWS = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']] as const;

export interface PinPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  /** True while locked after too many wrong tries. */
  disabled?: boolean;
}

/** Digit keys 0-9 and Hapus, each at least 64 dp. Used instead of the system keyboard. */
export function PinPad({ onDigit, onDelete, disabled = false }: PinPadProps) {
  const digit = (d: string) => (
    <Key key={d} label={fill(UI.pinDigit, { d })} disabled={disabled} onPress={() => onDigit(d)} testID={`pin-${d}`}>
      <Text style={[styles.digit, disabled && styles.muted]}>{d}</Text>
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
          <Ionicons name="backspace-outline" size={24} color={disabled ? colors.textMuted : colors.text} />
          <Text style={[styles.deleteText, disabled && styles.muted]}>{UI.delete}</Text>
        </Key>
      </View>
    </View>
  );
}

function Key({ label, disabled, onPress, testID, children }: { label: string; disabled: boolean; onPress: () => void; testID: string; children: React.ReactNode }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.key, styles.keyFace, (pressed || disabled) && styles.keyRaised]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pad: { gap: spacing.sm, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  key: { width: pinKey + spacing.md, height: pinKey, alignItems: 'center', justifyContent: 'center' },
  keyFace: { borderRadius: radius.tile, backgroundColor: colors.surface, borderWidth: stroke.thick, borderColor: colors.border },
  keyRaised: { backgroundColor: colors.surfaceRaised },
  digit: { fontSize: fontSize.title, fontWeight: '700', color: colors.text },
  deleteText: { fontSize: fontSize.small, color: colors.text },
  muted: { color: colors.textMuted },
});
