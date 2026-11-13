import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';

import { useAuth } from '../../src/auth/AuthProvider';
import { AuthFrame, errorCountText, failureText } from '../../src/auth/authForm';
import { AuthFailure } from '../../src/auth/errors';
import { auth } from '../../src/auth/session';
import { BigButton, Body, FormBanner, InfoNote, PasswordField, Title } from '../../src/components';
import { announce } from '../../src/components/form/announce';
import type { TextFieldRef } from '../../src/components/form/TextField';
import { MESSAGES } from '../../src/forms/messages';

/**
 * AUTH-7: a forgotten PIN is reset by entering the account password again, then making a new PIN.
 * The old PIN is replaced when the new one is saved. The password is only sent to the sign-in call.
 */
export default function ForgotPin() {
  const router = useRouter();
  const { session } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = useRef<TextFieldRef>(null);

  const submit = async () => {
    if (busy || !session?.email) return;
    setBanner(null);
    if (password === '') {
      setError(MESSAGES.passwordEmpty);
      announce(errorCountText(1));
      field.current?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await auth.signIn({ email: session.email, password });
      router.replace('/auth/create-pin');
    } catch (e) {
      const code = e instanceof AuthFailure ? e.code : 'SERVER';
      if (code === 'INVALID_CREDENTIALS') setError(MESSAGES.passwordWrong);
      else setBanner(failureText(code) ?? MESSAGES.authServer);
    } finally {
      setBusy(false);
    }
  };

  if (!session?.email) {
    return (
      <AuthFrame>
        <Title>Lupa PIN</Title>
        <InfoNote text="PIN hanya bisa dibuat ulang dengan akun. Masuk dulu." testID="forgot-pin-no-account" />
        <BigButton label="Kembali" variant="secondary" onPress={() => router.back()} />
      </AuthFrame>
    );
  }
  return (
    <AuthFrame>
      <Title>Lupa PIN</Title>
      <Body>{MESSAGES.forgotPinIntro}</Body>
      {banner ? <FormBanner text={banner} onRetry={submit} testID="forgot-pin-banner" /> : null}
      <PasswordField
        ref={field}
        testID="password"
        label="Kata sandi"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          if (error) setError(null);
        }}
        error={error}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <BigButton label={busy ? 'Memeriksa…' : 'Lanjut'} icon="arrow-forward" disabled={busy} onPress={submit} testID="forgot-pin-submit" />
      <BigButton label="Batal" variant="secondary" disabled={busy} onPress={() => router.back()} />
    </AuthFrame>
  );
}
