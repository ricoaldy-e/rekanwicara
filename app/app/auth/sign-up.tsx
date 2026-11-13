import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AuthFailure } from '../../src/auth/errors';
import { AuthFrame, errorCountText, failureText, PasswordChecklist } from '../../src/auth/authForm';
import { auth } from '../../src/auth/session';
import { BigButton, Body, Checkbox, FormBanner, PasswordField, TextField, Title } from '../../src/components';
import { announce } from '../../src/components/form/announce';
import type { TextFieldRef } from '../../src/components/form/TextField';
import { LIMITS } from '../../src/forms/limits';
import { messageOf } from '../../src/forms/messages';
import { useFormState, type Rules } from '../../src/forms/useFormState';
import * as validate from '../../src/forms/validators/auth';
import { colors, fontSize, spacing, touchTarget } from '../../src/theme';

type Values = { username: string; email: string; password: string; repeat: string; consent: boolean };
const INITIAL: Values = { username: '', email: '', password: '', repeat: '', consent: false };
const RULES: Rules<Values> = {
  username: (v) => validate.username(v),
  email: (v) => validate.email(v),
  password: (v, all) => validate.newPassword(v, { username: all.username, email: all.email }),
  repeat: (v, all) => validate.repeatPassword(all.password, v),
  consent: (v) => (v ? null : 'privacyConsent'),
};

/** Daftar: username (display name, not unique), email, password. Consent to the privacy note is required. */
export default function SignUp() {
  const router = useRouter();
  const form = useFormState<Values>(INITIAL, RULES);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const refs = {
    username: useRef<TextFieldRef>(null),
    email: useRef<TextFieldRef>(null),
    password: useRef<TextFieldRef>(null),
    repeat: useRef<TextFieldRef>(null),
    consent: useRef<TextFieldRef>(null),
  };
  const err = (k: keyof Values) => (form.errors[k] ? messageOf(form.errors[k]!) : null);

  const submit = async () => {
    if (busy) return;
    setBanner(null);
    const result = form.submit();
    if (!result.ok) {
      if (result.firstInvalid) refs[result.firstInvalid].current?.focus();
      announce(errorCountText(result.count));
      return;
    }
    setBusy(true);
    try {
      const session = await auth.signUp({
        username: validate.normalizeUsername(form.values.username),
        email: validate.normalizeEmail(form.values.email),
        password: form.values.password,
      });
      router.replace(session ? '/' : '/auth/check-email'); // with a session the gate goes on to "Buat PIN"
    } catch (e) {
      const code = e instanceof AuthFailure ? e.code : 'SERVER';
      if (code === 'EMAIL_TAKEN') {
        form.setError('email', 'emailTaken');
        refs.email.current?.focus();
      } else {
        setBanner(failureText(code) ?? failureText('SERVER'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame>
      <Title>Daftar</Title>
      <Body>Semua isian wajib diisi.</Body>
      {banner ? <FormBanner text={banner} onRetry={submit} testID="sign-up-banner" /> : null}
      <TextField
        ref={refs.username}
        testID="username"
        label="Username"
        hint={`Nama yang tampil. ${LIMITS.username.min}–${LIMITS.username.max} karakter, diawali huruf.`}
        value={form.values.username}
        onChangeText={(t) => form.setValue('username', t)}
        onBlur={() => form.blur('username')}
        error={err('username')}
        maxLength={LIMITS.username.max}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => refs.email.current?.focus()}
        blurOnSubmit={false}
      />
      <TextField
        ref={refs.email}
        testID="email"
        label="Email"
        value={form.values.email}
        onChangeText={(t) => form.setValue('email', t)}
        onBlur={() => form.blur('email')}
        error={err('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => refs.password.current?.focus()}
        blurOnSubmit={false}
      />
      <PasswordField
        ref={refs.password}
        testID="password"
        label="Kata sandi"
        value={form.values.password}
        onChangeText={(t) => form.setValue('password', t)}
        onBlur={() => form.blur('password')}
        error={err('password')}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => refs.repeat.current?.focus()}
        blurOnSubmit={false}
      />
      <PasswordChecklist password={form.values.password} />
      <PasswordField
        ref={refs.repeat}
        testID="repeat"
        label="Ulangi kata sandi"
        value={form.values.repeat}
        onChangeText={(t) => form.setValue('repeat', t)}
        onBlur={() => form.blur('repeat')}
        error={err('repeat')}
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Checkbox
        testID="consent"
        checked={form.values.consent}
        onToggle={() => form.setValue('consent', !form.values.consent)}
        text="Saya setuju dengan kebijakan privasi."
        error={err('consent')}
      />
      <Pressable onPress={() => router.push('/about')} accessibilityRole="link" accessibilityLabel="Baca kebijakan privasi" style={styles.link}>
        <Text style={styles.linkText}>Baca kebijakan privasi</Text>
      </Pressable>
      <BigButton label={busy ? 'Mendaftar…' : 'Daftar'} icon="person-add-outline" disabled={busy} onPress={submit} testID="sign-up-submit" />
      <Pressable onPress={() => router.back()} accessibilityRole="link" accessibilityLabel="Sudah punya akun? Masuk" style={styles.link}>
        <Text style={styles.linkText}>Sudah punya akun? Masuk</Text>
      </Pressable>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: touchTarget, justifyContent: 'center', paddingVertical: spacing.sm },
  linkText: { fontSize: fontSize.label, fontWeight: '700', color: colors.text, textDecorationLine: 'underline' },
});
