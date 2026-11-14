import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { editRows } from '../../forms/instructionSteps';
import { LIMITS, MAX_STEPS } from '../../forms/limits';
import { MESSAGES, UI } from '../../forms/messages';
import { colors, fontSize, iconSize, lineHeight, spacing, textFont, touchTarget } from '../../theme';
import { BigButton } from '../BigButton';
import { FieldError } from './FieldError';
import { TextField, type TextFieldRef } from './TextField';

export interface InstructionStepsProps {
  /** The instruction as one string: the steps are its lines. */
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  /** Rows become `${testID}-1`, `${testID}-2`, ...; the add button `${testID}-add`. */
  testID: string;
  /** Names the block for assistive tech, e.g. "Suku kata 1". */
  name?: string;
  editable?: boolean;
}

/**
 * The instruction as 1–5 steps, one field each (Figma 50:548). Steps are joined by a line break in the data, so the
 * schema and the API stay as they are. Focus goes to the first step through the ref.
 */
export const InstructionSteps = forwardRef<TextFieldRef, InstructionStepsProps>(function InstructionSteps(
  { value, onChange, error, testID, name, editable = true },
  ref,
) {
  const rows = editRows(value);
  const set = (next: string[]) => onChange(next.join('\n'));
  const prefix = name ? `${name}: ` : '';
  return (
    <View style={styles.wrap} testID={testID}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.label, textFont(true)]}>Instruksi pelafalan</Text>
      {rows.map((row, i) => (
        <TextField
          key={i}
          ref={i === 0 ? ref : undefined}
          testID={`${testID}-${i + 1}`}
          label={`Langkah ${i + 1}`}
          spokenLabel={`${prefix}instruksi pelafalan, langkah ${i + 1}`}
          value={row}
          onChangeText={(t) => set(rows.map((r, j) => (j === i ? t.replace(/\r?\n/g, ' ') : r)))}
          maxLength={LIMITS.instructionStep.max}
          multiline
          editable={editable}
          accessory={
            rows.length > 1 && editable ? (
              <Pressable
                onPress={() => set(rows.filter((_, j) => j !== i))}
                accessibilityRole="button"
                accessibilityLabel={`Hapus langkah ${i + 1}`}
                testID={`${testID}-${i + 1}-remove`}
                style={styles.remove}
              >
                <Ionicons name="trash-outline" size={iconSize.chip} color={colors.text} accessible={false} />
                <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.removeText, textFont(true)]}>{UI.removeSyllable}</Text>
              </Pressable>
            ) : undefined
          }
        />
      ))}
      <BigButton
        label="Tambah langkah"
        icon="add"
        variant="secondary"
        disabled={!editable || rows.length >= MAX_STEPS}
        accessibilityLabel={`Tambah langkah, ${prefix}instruksi`}
        onPress={() => set([...rows, ''])}
        testID={`${testID}-add`}
      />
      {error ? <FieldError text={error} testID={`${testID}-error`} /> : <Text maxFontSizeMultiplier={2} style={[styles.hint, textFont()]}>{rows.length >= MAX_STEPS ? MESSAGES.stepsFull : MESSAGES.stepsHint}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: { fontSize: fontSize.small, color: colors.text },
  remove: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.xs + spacing.xs / 2 },
  removeText: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.text },
  hint: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
});
