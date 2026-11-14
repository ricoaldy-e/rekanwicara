import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogoMark, Screen } from '../components';
import { fill, MESSAGES, UI } from '../forms/messages';
import { LIMITS } from '../forms/limits';
import { colors, displayFont, entry, fontSize, lineHeight, spacing, textFont, touchTarget } from '../theme';
import type { AuthCode } from './errors';

/**
 * The screen frame of the account forms: the keyboard must not cover the button.
 * `headerless` screens (Masuk, Daftar) hide the stack header, so the frame adds the top inset and the 24 dp gutter (Figma 27:38).
 */
export function AuthFrame({ children, top, headerless = false }: { children: ReactNode; top?: ReactNode; headerless?: boolean }) {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={headerless ? ['top', 'bottom', 'left', 'right'] : undefined} contentStyle={headerless ? styles.headerless : undefined}>
        {top}
        {children}
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Logo + wordmark at the top of Masuk (Figma 27:50). */
export function BrandRow() {
  return (
    <View style={styles.brand} accessible accessibilityLabel="Rekan Wicara">
      <LogoMark size={entry.brandLogo} />
      <Text accessible={false} maxFontSizeMultiplier={1.5} style={[styles.brandName, displayFont()]}>Rekan Wicara</Text>
    </View>
  );
}

/** Serif title with a muted line under it. */
export function AuthTitle({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.titleBlock}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.title, displayFont()]}>{title}</Text>
      <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>{body}</Text>
    </View>
  );
}

/** "Belum punya akun? Daftar": muted question and an underlined bold link (Figma 27:79). One link for assistive tech. */
export function AuthLinkRow({ question, link, onPress, testID }: { question: string; link: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="link" accessibilityLabel={`${question} ${link}`} style={styles.linkRow}>
      <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.linkMuted, textFont()]}>{question}</Text>
      <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.linkText, textFont(true)]}>{link}</Text>
    </Pressable>
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
          <Ionicons name={r.ok ? 'checkmark-circle-outline' : 'ellipse-outline'} size={20} color={r.ok ? colors.success : colors.textMuted} accessible={false} />
          <Text maxFontSizeMultiplier={2} style={[styles.text, textFont()]}>{r.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerless: { paddingHorizontal: entry.gutter, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg - spacing.xs },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  brandName: { flexShrink: 1, fontSize: fontSize.title, lineHeight: lineHeight.title, color: colors.text },
  titleBlock: { gap: spacing.sm },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted },
  linkRow: { minHeight: touchTarget, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: spacing.xs + spacing.xs / 2 },
  linkMuted: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted },
  linkText: { fontSize: fontSize.body, lineHeight: lineHeight.label, color: colors.text, textDecorationLine: 'underline' },
  list: { gap: spacing.xs + spacing.xs / 2, paddingLeft: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.text },
});
