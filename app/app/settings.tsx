import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { createApiClient, isValidBaseUrl } from '../src/api/client';
import { errorMessage } from '../src/api/errors';
import { BigButton, Body, Card, CheckRow, InfoNote, Screen, Title } from '../src/components';
import { useUser } from '../src/state/user';
import { DATASET_MODE } from '../src/config';
import { useContent } from '../src/state/content';
import { useSettings } from '../src/state/settings';
import { colors, fontSize, radius, spacing, touchTarget } from '../src/theme';

type TestResult = { ok: true; text: string } | { ok: false; text: string } | null;

/** Hidden settings (long-press the Home title). Lets the demo operator change the server URL. */
export default function Settings() {
  const router = useRouter();
  const { apiUrl, envApiUrl, isOverridden, setApiUrl, resetApiUrl } = useSettings();
  const { health } = useContent();
  const { demo, setDemo, sync, ready } = useUser();
  const [draft, setDraft] = useState(apiUrl);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult>(null);

  useEffect(() => setDraft(apiUrl), [apiUrl]);

  const valid = isValidBaseUrl(draft);

  async function testConnection() {
    setBusy(true);
    setResult(null);
    try {
      const h = await createApiClient(draft, { timeoutMs: 5000 }).getHealth();
      setResult({ ok: true, text: `Terhubung. Versi mesin ${h.engine_version}${h.mock_mode ? ', mode contoh (mock)' : ''}.` });
    } catch (e) {
      setResult({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await setApiUrl(draft);
      setResult({ ok: true, text: 'Alamat server disimpan.' });
    } catch {
      setResult({ ok: false, text: 'Gagal menyimpan. Coba lagi.' });
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await resetApiUrl();
      setResult({ ok: true, text: 'Kembali ke alamat bawaan.' });
    } catch {
      setResult({ ok: false, text: 'Alamat bawaan belum bisa dipulihkan. Coba lagi.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Alamat server</Title>
      <Body muted>Contoh: http://192.168.1.10:8000</Body>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        accessibilityLabel="Alamat server"
        style={[styles.input, !valid && styles.inputInvalid]}
        testID="settings-url"
      />
      {!valid ? <Text style={styles.invalid}>Alamat harus diawali http:// atau https://</Text> : null}

      <BigButton label="Tes koneksi" icon="pulse" onPress={testConnection} disabled={busy || !valid} />
      <BigButton label="Simpan" icon="save" onPress={save} disabled={busy || !valid || draft === apiUrl} />
      {result ? <InfoNote tone={result.ok ? 'info' : 'warning'} text={result.text} /> : null}

      <Card>
        <Body>Dipakai sekarang: {apiUrl || '(kosong)'}</Body>
        <Body muted>Bawaan (.env): {envApiUrl || '(kosong)'}</Body>
        <Body muted>Server: {health ? `versi ${health.engine_version}${health.mock_mode ? ', mock' : ''}` : 'belum terhubung'}</Body>
        <Body muted>Mode Dataset: {DATASET_MODE ? 'aktif' : 'tidak aktif'}</Body>
      </Card>
      {isOverridden ? (
        <View>
          <BigButton label="Kembalikan ke bawaan" variant="secondary" icon="arrow-undo" onPress={reset} disabled={busy} />
        </View>
      ) : null}
      {__DEV__ ? (
        <>
          <BigButton label="Uji Wav2Vec2" icon="chatbox-ellipses" variant="secondary" onPress={() => router.push('/wav2vec2')} />
          <BigButton label="Uji Gabungan" icon="layers" variant="secondary" onPress={() => router.push('/combined')} />
          <BigButton label="Uji Allosaurus" icon="flask" variant="secondary" onPress={() => router.push('/allosaurus')} />
        </>
      ) : null}
      <Title>Mode demo</Title>
      <Body>Contoh progres: a dan ma sudah lulus. Latihan tetap dianalisis server. Progres demo tidak dikirim online dan hilang saat keluar dari mode demo atau app dimulai ulang.</Body>
      {ready && !sync.running ? (
        <CheckRow checked={demo} onToggle={() => setDemo(!demo)} text="Gunakan profil demo" testID="demo-toggle" />
      ) : <Body>Tunggu penyimpanan selesai sebelum mengganti profil.</Body>}
      <InfoNote text={demo ? 'Mode demo aktif. Data latihan asli tetap tersimpan.' : 'Profil latihan pribadi aktif.'} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: touchTarget,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.large,
    color: colors.text,
    backgroundColor: colors.background,
  },
  inputInvalid: { borderColor: colors.danger },
  invalid: { fontSize: fontSize.body, color: colors.danger, fontWeight: '700' },
});
