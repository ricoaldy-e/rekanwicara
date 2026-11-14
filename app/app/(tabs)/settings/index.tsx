import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../../../src/auth/AuthProvider';
import { BigButton, ListGroup, ListRow, Screen, Snackbar, Toggle } from '../../../src/components';
import { useRowPadding } from '../../../src/components/ListGroup';
import { useFlash } from '../../../src/forms/flash';
import { useUser } from '../../../src/state/user';
import { colors, companion, displayFont, fontSize, layout, lineHeight, radius, spacing, stroke, textFont, touchTarget } from '../../../src/theme';

/** Getar row: the group gives rows no padding of their own, so it takes it with `useRowPadding` (like ListRow). */
function VibrationRow({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  const padding = useRowPadding(companion.rowPadding);
  return (
    <View style={[styles.switchRow, padding]}>
      <View style={styles.switchText}>
        <Text maxFontSizeMultiplier={2} style={[styles.rowTitle, textFont(true)]}>Getar</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>Saat merekam dan saat hasil muncul.</Text>
      </View>
      <View style={styles.switchGroup}>
        <Text maxFontSizeMultiplier={2} style={[styles.switchState, textFont(true)]} testID="vibration-state">
          {value ? 'Aktif' : 'Mati'}
        </Text>
        <Toggle accessibilityLabel="Getar" testID="vibration-toggle" value={value} onValueChange={onChange} />
      </View>
    </View>
  );
}

/** Settings (Figma 51:268): account, Getar, Kalibrasi (optional), Ganti PIN, Tentang, Keluar. Not PIN-locked (design.md §6.7). */
export default function Settings() {
  const router = useRouter();
  const { profile, updateSettings } = useUser();

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
          <VibrationRow value={profile.settings.vibration} onChange={(vibration) => updateSettings({ vibration })} />
          <ListRow
            testID="calibration-link"
            title="Kalibrasi"
            subtitle={profile.calibrated ? 'Sudah dilakukan. Bisa diulang.' : 'Opsional. Membuat hasil lebih tepat untukmu.'}
            paddingVertical={companion.rowPadding}
            accessibilityLabel="Kalibrasi"
            onPress={() => router.push('/calibration')}
          />
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
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: layout.sectionGap, minHeight: touchTarget },
  switchGroup: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: spacing.sm + spacing.xs / 2 },
  switchState: { fontSize: fontSize.small, lineHeight: 20, color: colors.text, includeFontPadding: false, textAlignVertical: 'center' },
  inputInvalid: { borderColor: colors.danger },
  invalid: { fontSize: fontSize.body, color: colors.danger, fontWeight: '700' },
});
