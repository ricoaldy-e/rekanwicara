import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { AuthFailure } from '../../src/auth/errors';
import { AuthFrame, AuthLinkRow, AuthTitle, BrandRow, errorCountText, failureText } from '../../src/auth/authForm';
import { auth } from '../../src/auth/session';
import { BigButton, FormBanner, InfoNote, PasswordField, TextField } from '../../src/components';
import { announce } from '../../src/components/form/announce';
import type { TextFieldRef } from '../../src/components/form/TextField';
import { MESSAGES, messageOf } from '../../src/forms/messages';
import { useFormState, type Rules } from '../../src/forms/useFormState';
import * as validate from '../../src/forms/validators/auth';
import { colors, fontSize, lineHeight, spacing, textFont } from '../../src/theme';

type Values = { email: string; password: string };
const INITIAL: Values = { email: '', password: '' };
const RULES: Rules<Values> = {
  email: (_v, all) => validate.signIn(all).email,
  password: (_v, all) => validate.signIn(all).password,
};

/** Masuk: email + password only (kontrak FE §1 #4). The password is never trimmed, stored or logged. */
export default function SignIn() {
  const router = useRouter();
  const form = useFormState<Values>(INITIAL, RULES);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<'wrong' | 'banner' | null>(null);
  const [failureLine, setFailureLine] = useState<string | null>(null);
  const refs = { email: useRef<TextFieldRef>(null), password: useRef<TextFieldRef>(null) };

  const submit = async () => {
    if (busy) return; // no double send
    setFailure(null);
    const result = form.submit();
    if (!result.ok) {
      if (result.firstInvalid) refs[result.firstInvalid].current?.focus();
      announce(errorCountText(result.count));
      return;
    }
    setBusy(true);
    try {
      await auth.signIn({ email: validate.normalizeEmail(form.values.email), password: form.values.password });
      router.replace('/'); // the start gate decides: PIN, onboarding or Beranda
    } catch (e) {
      const code = e instanceof AuthFailure ? e.code : 'SERVER';
      if (code === 'INVALID_CREDENTIALS') {
        setFailure('wrong');
      } else {
        setFailureLine(failureText(code));
        setFailure('banner');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame headerless top={<BrandRow />}>
      <AuthTitle title="Masuk" body="Masuk dengan akun Pendamping. Pendamping hanya perlu masuk sekali di HP ini." />
      {failure === 'banner' && failureLine ? <FormBanner text={failureLine} onRetry={submit} testID="sign-in-banner" /> : null}
      {failure === 'wrong' ? <InfoNote tone="warning" text={MESSAGES.signInFailed} testID="sign-in-failed" /> : null}
      <TextField
        ref={refs.email}
        testID="email"
        label="Email"
        value={form.values.email}
        onChangeText={(t) => form.setValue('email', t)}
        onBlur={() => form.blur('email')}
        error={form.errors.email ? messageOf(form.errors.email) : null}
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
        error={form.errors.password ? messageOf(form.errors.password) : null}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <BigButton label={busy ? 'Memeriksa…' : 'Masuk'} icon="log-in-outline" disabled={busy} onPress={submit} testID="sign-in-submit" />
      <AuthLinkRow question="Belum punya akun?" link="Daftar" onPress={() => router.push('/auth/sign-up')} testID="to-sign-up" />
      <Text maxFontSizeMultiplier={2} style={[styles.note, textFont()]}>Rekan Wicara adalah alat bantu latihan, bukan pengganti terapis wicara.</Text>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  note: { marginTop: spacing.lg, fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted, textAlign: 'center' },
});
