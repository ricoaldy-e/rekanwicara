import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { createApiClient, isValidBaseUrl } from '../../../src/api/client';
import { errorMessage } from '../../../src/api/errors';
import { useAuth } from '../../../src/auth/AuthProvider';
import { auth } from '../../../src/auth/session';
import { BigButton, Body, Card, CheckRow, ConfirmDialog, InfoNote, Screen, Snackbar, Title } from '../../../src/components';
import { useFlash } from '../../../src/forms/flash';
import { usePinSession } from '../../../src/pin/PinSession';
import { useUser } from '../../../src/state/user';
import { DATASET_MODE } from '../../../src/config';
import { useContent } from '../../../src/state/content';
import { useSettings } from '../../../src/state/settings';
import { colors, fontSize, radius, spacing, stroke, touchTarget } from '../../../src/theme';

type TestResult = { ok: true; text: string } | { ok: false; text: string } | null;

/** Settings: user options first (vibration), then the demo operator's server URL and demo profile. */
export default function Settings() {
  const router = useRouter();
  const { apiUrl, envApiUrl, isOverridden, setApiUrl, resetApiUrl } = useSettings();
  const { health } = useContent();
  const { demo, setDemo, sync, ready, profile, updateSettings } = useUser();
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

  const [flash, clearFlash] = useFlash();
  const { session } = useAuth();
  const { lock } = usePinSession();
  const [confirmExit, setConfirmExit] = useState(false);

  /** Sign out: the session is removed even when the server cannot be reached; the PIN of the account stays. */
  async function signOut() {
    setConfirmExit(false);
    try {
      await auth.signOut();
    } catch {
      // offline: the local session is dropped by the SDK; nothing else to do
    }
    lock();
    router.replace('/auth/sign-in');
  }

  return (
    <Screen footer={<Snackbar message={flash} onDismiss={clearFlash} />}>
      <Title>Getar</Title>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Getar saat merekam dan saat hasil muncul</Text>
        <Text style={styles.switchState} testID="vibration-state">
          {profile.settings.vibration ? 'Aktif' : 'Mati'}
        </Text>
        <Switch
          accessibilityLabel="Getar"
          testID="vibration-toggle"
          value={profile.settings.vibration}
          onValueChange={(vibration) => updateSettings({ vibration })}
          trackColor={{ false: colors.surfaceRaised, true: colors.hero }}
          thumbColor={profile.settings.vibration ? colors.onHero : colors.textMuted}
          ios_backgroundColor={colors.surfaceRaised}
        />
      </View>
      <Title>Ukuran teks dan gerak</Title>
      <Body muted>Ukuran teks mengikuti pengaturan HP (Pengaturan → Tampilan → Ukuran font).</Body>
      <Body muted>Gerak mengikuti pengaturan HP.</Body>

      <Title>Akun dan PIN</Title>
      <Card onPress={() => router.push('/settings/change-pin')} accessibilityLabel="Ganti PIN" testID="change-pin-link">
        <Text style={styles.switchLabel}>Ganti PIN</Text>
      </Card>
      <Card onPress={() => router.push('/about')} accessibilityLabel="Tentang aplikasi" testID="about-link">
        <Text style={styles.switchLabel}>Tentang aplikasi</Text>
      </Card>
      {session ? (
        <BigButton label="Keluar" icon="log-out-outline" variant="secondary" onPress={() => setConfirmExit(true)} testID="sign-out" />
      ) : null}
      <ConfirmDialog
        visible={confirmExit}
        title="Keluar dari akun?"
        message="Riwayat latihan tetap tersimpan di akun. Untuk masuk lagi, butuh email dan kata sandi."
        confirmLabel="Keluar"
        cancelLabel="Batal"
        danger
        onCancel={() => setConfirmExit(false)}
        onConfirm={signOut}
      />

      <Text accessibilityRole="header" style={styles.section}>
        Untuk operator demo
      </Text>
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
    borderWidth: stroke.thick,
    borderColor: colors.border,
    borderRadius: radius.tile,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.large,
    color: colors.text,
    backgroundColor: colors.background,
  },
  section: { fontSize: fontSize.small, color: colors.textMuted, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: stroke.thin, borderTopColor: colors.border },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget },
  switchLabel: { flex: 1, fontSize: fontSize.body, color: colors.text },
  switchState: { fontSize: fontSize.label, fontWeight: '700', color: colors.text },
  inputInvalid: { borderColor: colors.danger },
  invalid: { fontSize: fontSize.body, color: colors.danger, fontWeight: '700' },
});
