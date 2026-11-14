import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { BigButton, Body, InfoNote, Screen, Title } from '../components';
import { colors, fontSize, radius, spacing, touchTarget } from '../theme';
import { loginCompanion } from './companion';

export function CompanionLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function login() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await loginCompanion(email, password);
      if (active.current) setPassword('');
    } catch (reason) {
      if (active.current) setError(reason instanceof Error ? reason.message : 'Login belum berhasil. Coba lagi.');
    } finally {
      if (active.current) setBusy(false);
    }
  }

  return <Screen>
    <Title>Login pendamping</Title>
    <Body>Login dengan email dan password akun yang sudah terdaftar. Setelah login, Anda dapat membuat PIN untuk HP ini.</Body>
    <Body>Email</Body>
    <TextInput accessibilityLabel="Email pendamping" value={email} onChangeText={setEmail}
      keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
      autoComplete="email" editable={!busy} style={styles.input} />
    <Body>Password</Body>
    <TextInput accessibilityLabel="Password pendamping" value={password} onChangeText={setPassword}
      secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password"
      editable={!busy} style={styles.input} />
    {error ? <InfoNote tone="warning" text={error} /> : null}
    {busy ? <Body>Memeriksa akun…</Body> : null}
    <BigButton label={busy ? 'Sedang login…' : 'Login'} icon="log-in" disabled={busy || !email.trim() || !password} onPress={login} />
    <InfoNote text="Password akun berbeda dari PIN pendamping. PIN dibuat dan disimpan di HP ini setelah login." />
  </Screen>;
}

const styles = StyleSheet.create({
  input: { minHeight: touchTarget, borderWidth: 3, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, fontSize: fontSize.large, color: colors.text },
});
