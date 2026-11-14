import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InfoNote, InfoSection, Screen } from '../src/components';
import { useFocusRing } from '../src/a11y/useFocusRing';
import { useContent } from '../src/state/content';
import { colors, displayFont, fontSize, iconSize, layout, lineHeight, radius, spacing, stroke, textFont, touchTarget } from '../src/theme';

/** Tentang Rekan Wicara (Figma 51:558): intro, product boundary, sections separated by a thin line, and the versions in a card. */
export default function About() {
  const { health } = useContent();
  const router = useRouter();
  const { focusProps, focusStyle } = useFocusRing();
  const { from } = useLocalSearchParams<{ from?: string }>();
  return (
    <Screen edges={['bottom', 'left', 'right']} contentStyle={styles.content}>
      <Stack.Screen options={{ headerBackTitle: from }} />
      <View style={styles.intro}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.5} style={[styles.title, displayFont()]}>Tentang Rekan Wicara</Text>
        <Text maxFontSizeMultiplier={2} style={[styles.body, styles.muted, textFont()]}>
          Alat bantu latihan pelafalan bagi teman Tuli yang memilih berlatih bicara.
        </Text>
      </View>
      <InfoNote text="Hasil adalah perkiraan sistem untuk latihan. Bukan pengganti guru atau terapis wicara, dan bukan penilaian klinis." />

      <View>
        <InfoSection title="Batas penggunaan" first>
          <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>
            Latihan mencakup vokal a, i, u, e, o (Level 1), suku kata (Level 2), dan kata sederhana (Level 3). Bunyi yang mirip masih dapat mendapat hasil sama, dan hasil bisa berbeda dari penilaian guru atau terapis.
          </Text>
          <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>
            Penilaian kata masih lebih lemah daripada penilaian bunyi. Evaluasi awal berasal dari tiga anggota tim dan belum diuji pada pengguna Tuli. Hasil bukan ukuran kemampuan seseorang.
          </Text>
        </InfoSection>
        <InfoSection title="Privasi">
          <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>
            Wajah dipakai untuk mengukur bentuk bibir, tanpa pengenalan identitas. Rekaman latihan dihapus setelah diproses. Yang disimpan hanya hasil latihan dan angka kalibrasi; layanan online menyimpan hasil dan kemajuan, tanpa video atau audio.
          </Text>
          <Pressable
            testID="privacy-link"
            onPress={() => router.push({ pathname: '/privacy', params: { from: 'Tentang' } })}
            accessibilityRole="link"
            accessibilityLabel="Baca kebijakan privasi"
            {...focusProps}
            style={[styles.link, focusStyle]}
          >
            <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.linkText, textFont(true)]}>Baca kebijakan privasi</Text>
            <Ionicons name="chevron-forward" size={iconSize.base} color={colors.textMuted} accessible={false} />
          </Pressable>
        </InfoSection>
        <InfoSection title="Versi">
          <View style={styles.card}>
            <VersionRow name="Aplikasi" value={Constants.expoConfig?.version ?? 'Tidak tersedia'} />
            <View style={styles.rowLine} />
            <VersionRow name="Mesin" value={health?.engine_version ?? 'Belum terhubung ke server'} />
          </View>
          {health?.mock_mode ? <InfoNote text="Server sedang memakai data contoh. Hasilnya bukan analisis rekaman." /> : null}
        </InfoSection>
      </View>
    </Screen>
  );
}

function VersionRow({ name, value }: { name: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${name}: ${value}`} style={styles.row}>
      <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.body, styles.muted, textFont()]}>{name}</Text>
      <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.value, textFont(true)]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, gap: layout.groupGap },
  intro: { gap: spacing.sm },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.text },
  muted: { color: colors.textMuted },
  link: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  linkText: { fontSize: fontSize.body, lineHeight: lineHeight.label, color: colors.text, textDecorationLine: 'underline' },
  card: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.sm + spacing.xs + spacing.xs / 2 },
  rowLine: { height: stroke.hairline, backgroundColor: colors.surfaceRaised },
  value: { flexShrink: 1, fontSize: fontSize.body, lineHeight: lineHeight.label, color: colors.text, textAlign: 'right' },
});
