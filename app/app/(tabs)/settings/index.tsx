import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { createApiClient, isValidBaseUrl } from '../../../src/api/client';
import { errorMessage } from '../../../src/api/errors';
import { useAuth } from '../../../src/auth/AuthProvider';
import { BigButton, Body, Card, CheckRow, InfoNote, ListGroup, ListRow, Screen, Snackbar, Title } from '../../../src/components';
import { useFlash } from '../../../src/forms/flash';
import { useUser } from '../../../src/state/user';
import { DATASET_MODE } from '../../../src/config';
import { useContent } from '../../../src/state/content';
import { useSettings } from '../../../src/state/settings';
import { colors, companion, displayFont, fontSize, layout, lineHeight, radius, spacing, stroke, textFont, touchTarget } from '../../../src/theme';

type TestResult = { ok: true; text: string } | { ok: false; text: string } | null;

/** Settings (Figma 51:268): account, Getar, Ganti PIN, Tentang, Keluar; then the demo operator's server URL and demo profile. Not PIN-locked (design.md §6.7). */
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
      setResult({ ok: true, text: `Terhubung. Versi mesin ${h.engine_version}${h.mock_mode ? ', data contoh' : ''}.` });
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
  const name = session?.displayName?.trim() || null;

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} footer={<Snackbar message={flash} onDismiss={clearFlash} />} contentStyle={styles.content}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.pageTitle, displayFont()]}>Pengaturan</Text>

      {session ? (
        <View style={styles.account} accessible accessibilityLabel={[name, session.email].filter(Boolean).join(', ')} testID="account-card">
          <View style={styles.avatar}>
            <Text accessible={false} style={[styles.avatarText, textFont(true)]}>{(name ?? session.email ?? '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.accountText}>
            {name ? <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.accountName, textFont(true)]}>{name}</Text> : null}
            {session.email ? <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>{session.email}</Text> : null}
          </View>
        </View>
      ) : null}

      <View style={styles.group}>
        <ListGroup title="Umum" inset={0} paddingVertical={companion.groupPadding} paddingRight={layout.sectionGap + spacing.xs}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text maxFontSizeMultiplier={2} style={[styles.rowTitle, textFont(true)]}>Getar</Text>
              <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>Saat merekam dan saat hasil muncul.</Text>
            </View>
            <View style={styles.switchGroup}>
              <Text maxFontSizeMultiplier={2} style={[styles.switchState, textFont(true)]} testID="vibration-state">
                {profile.settings.vibration ? 'Aktif' : 'Mati'}
              </Text>
              <Switch
                accessibilityLabel="Getar"
                testID="vibration-toggle"
                value={profile.settings.vibration}
                onValueChange={(vibration) => updateSettings({ vibration })}
                trackColor={{ false: colors.surfaceRaised, true: colors.success }}
                thumbColor={colors.primary}
                ios_backgroundColor={colors.surfaceRaised}
              />
            </View>
          </View>
        </ListGroup>
        <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>Ukuran teks dan gerak mengikuti pengaturan HP.</Text>
      </View>

      <ListGroup title="Akun dan aplikasi" inset={0} paddingVertical={companion.groupPadding} paddingRight={layout.sectionGap + spacing.xs}>
        <ListRow
          testID="change-pin-link"
          title="Ganti PIN"
          subtitle="Meminta PIN Pendamping"
          trailing={<Ionicons name="lock-closed-outline" size={companion.deleteIcon} color={colors.textMuted} accessible={false} />}
          paddingVertical={companion.rowPadding}
          accessibilityLabel="Ganti PIN"
          onPress={() => router.push('/settings/change-pin')}
        />
        <ListRow
          testID="about-link"
          title="Tentang Rekan Wicara"
          paddingVertical={companion.rowPadding}
          accessibilityLabel="Tentang aplikasi"
          onPress={() => router.push({ pathname: '/about', params: { from: 'Pengaturan' } })}
        />
      </ListGroup>

      {session ? (
        <BigButton label="Keluar" icon="log-out-outline" variant="secondary" onPress={() => router.push('/settings/sign-out')} testID="sign-out" />
      ) : null}
      <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>
        Getar dan Tentang bisa dibuka siapa saja. Ganti PIN dan Keluar meminta PIN Pendamping.
      </Text>
      <Text maxFontSizeMultiplier={2} style={[styles.muted, styles.center, textFont()]}>
        Rekan Wicara · versi {Constants.expoConfig?.version ?? '-'}
      </Text>

      <Text accessibilityRole="header" style={styles.section}>
        Lanjutan
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
        </>
      ) : null}
      <Title>Profil contoh</Title>
      <Body>Profil contoh berisi riwayat latihan sebagai gambaran. Latihan tetap dianalisis server. Hasilnya tidak dikirim online dan hilang saat profil contoh ditutup atau app dimulai ulang.</Body>
      {ready && !sync.running ? (
        <CheckRow checked={demo} onToggle={() => setDemo(!demo)} text="Gunakan profil contoh" testID="demo-toggle" />
      ) : <Body>Tunggu penyimpanan selesai sebelum mengganti profil.</Body>}
      <InfoNote text={demo ? 'Profil contoh aktif. Data latihan asli tetap tersimpan.' : 'Profil latihan pribadi aktif.'} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.md, gap: layout.groupGap },
  pageTitle: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: companion.rowPadding,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  avatar: { width: companion.avatar, height: companion.avatar, borderRadius: companion.avatar / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.hero },
  avatarText: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.onHero },
  accountText: { flex: 1, minWidth: 1, gap: spacing.xs / 2 },
  accountName: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  group: { gap: spacing.sm },
  switchText: { flex: 1, minWidth: 1, gap: spacing.xs / 2 },
  rowTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  muted: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  center: { textAlign: 'center' },
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: layout.sectionGap, minHeight: touchTarget, paddingVertical: companion.rowPadding },
  switchLabel: { flex: 1, fontSize: fontSize.body, color: colors.text },
  switchGroup: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: spacing.sm + spacing.xs / 2 },
  switchState: { fontSize: fontSize.small, lineHeight: 20, color: colors.text, includeFontPadding: false, textAlignVertical: 'center' },
  inputInvalid: { borderColor: colors.danger },
  invalid: { fontSize: fontSize.body, color: colors.danger, fontWeight: '700' },
});
