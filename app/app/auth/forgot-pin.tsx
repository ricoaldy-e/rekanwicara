import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../src/auth/AuthProvider';
import { AuthFrame, AuthTitle, errorCountText, failureText } from '../../src/auth/authForm';
import { AuthFailure } from '../../src/auth/errors';
import { auth } from '../../src/auth/session';
import { BackButton, BigButton, FormBanner, InfoNote, PasswordField } from '../../src/components';
import { announce } from '../../src/components/form/announce';
import type { TextFieldRef } from '../../src/components/form/TextField';
import { MESSAGES } from '../../src/forms/messages';
import { colors, entry } from '../../src/theme';

/**
 * AUTH-7: a forgotten PIN is reset by entering the account password again, then making a new PIN (Figma 29:144).
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

  const goBack = () => router.back();
  const top = (
    <View style={styles.back}>
      <BackButton label="Kembali" onPress={goBack} testID="forgot-pin-back" />
    </View>
  );
  const lock = <Ionicons name="lock-closed-outline" size={entry.forgotLockIcon} color={colors.text} accessible={false} />;

  if (!session?.email) {
    return (
      <AuthFrame headerless top={top}>
        {lock}
        <AuthTitle title="Lupa PIN?" body="PIN hanya bisa dibuat ulang dengan akun." />
        <InfoNote text="PIN hanya bisa dibuat ulang dengan akun. Masuk dulu." testID="forgot-pin-no-account" />
      </AuthFrame>
    );
  }
  return (
    <AuthFrame headerless top={top}>
      {lock}
      <AuthTitle title="Lupa PIN?" body={MESSAGES.forgotPinIntro} />
      {banner ? <FormBanner text={banner} onRetry={submit} testID="forgot-pin-banner" /> : null}
      <PasswordField
        ref={field}
        testID="password"
        label="Kata sandi akun"
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
      <BigButton label={busy ? 'Memeriksa…' : 'Lanjut'} disabled={busy} onPress={submit} testID="forgot-pin-submit" />
      <BigButton label="Batal" variant="secondary" disabled={busy} onPress={goBack} testID="forgot-pin-cancel" />
    </AuthFrame>
  );
}

const styles = StyleSheet.create({ back: { alignItems: 'flex-start' } });
