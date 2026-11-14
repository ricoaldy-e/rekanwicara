import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { COUNTER_FROM } from '../../forms/limits';
import { fill, UI } from '../../forms/messages';
import { colors, fieldAccessory, fieldHeight, fontSize, radius, spacing, stroke, textFont, touchTarget } from '../../theme';
import { FieldError } from './FieldError';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'accessibilityLabel' | 'accessibilityHint'> {
  /** Always visible above the field; a placeholder is only an example. */
  label: string;
  /** Spoken name when the visible label alone would be ambiguous ("Suku kata 1: instruksi, langkah 2"). */
  spokenLabel?: string;
  /** One line with the rule or an example; replaced by the error while there is one. */
  hint?: string;
  /** Already-formatted error text. */
  error?: string | null;
  optional?: boolean;
  /** Sits inside the box at the right edge, e.g. "Tampilkan" of a password field. */
  accessory?: ReactNode;
  testID?: string;
}

/** Labelled text field with hint, error (icon + text + line), focus line and a counter near the limit (flow §7.7.1). */
export type TextFieldRef = ComponentRef<typeof TextInput>;

export const TextField = forwardRef<TextFieldRef, TextFieldProps>(function TextField(
  { label, spokenLabel, hint, error, optional, accessory, testID, onFocus, onBlur, value, maxLength, multiline, ...input },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const length = [...(value ?? '')].length;
  const showCounter = maxLength !== undefined && length >= maxLength * COUNTER_FROM;
  // Figma draws a 1 dp line in every state (default, focus, error); only its color changes.
  const borderColor = focused ? colors.focus : error ? colors.danger : colors.border;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, textFont(true)]}>
        {label}
        {optional ? ` ${UI.optional}` : ''}
      </Text>
      <View>
        <TextInput
          ref={ref}
          testID={testID}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          accessibilityLabel={spokenLabel ?? (optional ? `${label} ${UI.optional}` : label)}
          accessibilityHint={error ? undefined : hint}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            textFont(),
            multiline && styles.multiline,
            { borderWidth: stroke.hairline, borderColor, padding: spacing.md },
            accessory ? styles.withAccessory : null,
          ]}
          {...input}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>
      {error ? <FieldError text={error} testID={testID ? `${testID}-error` : undefined} /> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {showCounter ? (
        <Text style={styles.counter} accessibilityLabel={fill(UI.counter, { n: length, max: maxLength })}>
          {fill(UI.counter, { n: length, max: maxLength })}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  withAccessory: { paddingRight: fieldAccessory },
  accessory: { position: 'absolute', top: 0, bottom: 0, right: spacing.md, justifyContent: 'center' },
  wrap: { gap: spacing.xs + spacing.xs / 2 },
  label: { fontSize: fontSize.small, color: colors.text },
  input: {
    minHeight: fieldHeight,
    borderRadius: radius.tile,
    backgroundColor: colors.surface,
    fontSize: fontSize.body,
    color: colors.text,
  },
  multiline: { minHeight: fieldHeight + touchTarget, textAlignVertical: 'top' },
  hint: { fontSize: fontSize.small, color: colors.textMuted },
  counter: { fontSize: fontSize.small, color: colors.textMuted, alignSelf: 'flex-end' },
});
