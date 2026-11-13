import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components';
import { fill, MESSAGES, UI } from '../forms/messages';
import { LIMITS } from '../forms/limits';
import { colors, fontSize, spacing } from '../theme';
import type { AuthCode } from './errors';

/** The screen frame of the account forms: the keyboard must not cover the button. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>{children}</Screen>
    </KeyboardAvoidingView>
  );
}

/** Text of a whole-form failure from the server (not the "wrong email or password" line, which is shown apart). */
export function failureText(code: AuthCode): string | null {
  switch (code) {
    case 'NETWORK':
      return MESSAGES.authNetwork;
    case 'SERVER':
      return MESSAGES.authServer;
    case 'EMAIL_NOT_CONFIRMED':
      return MESSAGES.emailNotConfirmed;
    default:
      return null;
  }
}

export const errorCountText = (n: number) => fill(MESSAGES.errorCount, { n });

/** "8 karakter atau lebih / Ada huruf / Ada angka": a guide that updates while typing, icon + text. Not a strength meter. */
export function PasswordChecklist({ password }: { password: string }) {
  const rules = [
    { text: UI.pwRule8, ok: [...password].length >= LIMITS.password.min },
    { text: UI.pwRuleLetter, ok: /\p{L}/u.test(password) },
    { text: UI.pwRuleDigit, ok: /[0-9]/.test(password) },
  ];
  return (
    <View style={styles.list} testID="password-checklist">
      {rules.map((r) => (
        <View key={r.text} style={styles.row} accessible accessibilityLabel={`${r.text}, ${r.ok ? UI.ruleMet : UI.ruleNotMet}`}>
          <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={colors.text} accessible={false} />
          <Text style={styles.text}>{r.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { fontSize: fontSize.small, color: colors.text },
});
