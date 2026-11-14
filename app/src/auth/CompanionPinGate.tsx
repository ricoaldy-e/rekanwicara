import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { BigButton, Body, InfoNote, Screen, Title } from '../components';
import { colors, fontSize, radius, spacing, touchTarget } from '../theme';
import { isValidPin } from '../user/pure';
import { hasPin, savePin } from '../user/storage';

export function CompanionPinGate({ children, onCreated }: { children: ReactNode; onCreated: () => void }) {
  const [presence, setPresence] = useState<'checking' | 'present' | 'missing' | 'error'>('checking');
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const check = useCallback(() => hasPin().then(
    exists => { if (active.current) setPresence(exists ? 'present' : 'missing'); },
    () => { if (active.current) setPresence('error'); },
  ), []);
  useEffect(() => {
    active.current = true;
    void check();
    return () => { active.current = false; };
  }, [check]);

  async function create() {
    if (busy || !isValidPin(pin) || pin !== again) return;
    setBusy(true);
    setError(null);
    try {
      await savePin(pin);
      if (!active.current) return;
      setPin('');
      setAgain('');
      onCreated();
      setPresence('present');
    } catch {
      if (active.current) setError('PIN belum berhasil disimpan. Coba lagi. PIN yang sudah ada tidak ditimpa.');
    } finally {
      if (active.current) setBusy(false);
    }
  }

  if (presence === 'present') return children;
  if (presence === 'checking') return <Screen><Body>Memeriksa PIN akun di HP ini…</Body></Screen>;
  if (presence === 'error') return <Screen>
    <InfoNote tone="warning" text="PIN akun belum dapat diperiksa. Coba lagi." />
    <BigButton label="Periksa PIN lagi" onPress={() => { setPresence('checking'); void check(); }} />
  </Screen>;
  return <Screen>
    <Title>Buat PIN pendamping</Title>
    <Body>Akun ini belum memiliki PIN di HP ini. Buat empat angka untuk membuka Mode Pendamping.</Body>
    <Body>PIN baru</Body>
    <TextInput accessibilityLabel="PIN baru, 4 angka" value={pin} onChangeText={value => setPin(value.replace(/\D/g, '').slice(0, 4))}
      secureTextEntry keyboardType="number-pad" maxLength={4} editable={!busy} style={styles.input} />
    <Body>Ulangi PIN baru</Body>
    <TextInput accessibilityLabel="Ulangi PIN baru" value={again} onChangeText={value => setAgain(value.replace(/\D/g, '').slice(0, 4))}
      secureTextEntry keyboardType="number-pad" maxLength={4} editable={!busy} style={styles.input} />
    {again && pin !== again ? <InfoNote tone="warning" text="Kedua PIN belum sama." /> : null}
    {error ? <InfoNote tone="warning" text={error} /> : null}
    <BigButton label={busy ? 'Menyimpan PIN…' : 'Simpan PIN baru'} icon="lock-closed"
      disabled={busy || !isValidPin(pin) || pin !== again} onPress={() => void create()} />
  </Screen>;
}

const styles = StyleSheet.create({
  input: { minHeight: touchTarget, borderWidth: 3, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, fontSize: fontSize.large, color: colors.text, letterSpacing: 6 },
});
