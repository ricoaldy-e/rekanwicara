import Constants from 'expo-constants';
import type { ReactNode } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { InfoNote, Screen } from '../src/components';
import { useContent } from '../src/state/content';
import { colors, displayFont, fontSize, layout, lineHeight, radius, spacing, stroke, textFont } from '../src/theme';

/** Tentang Rekan Wicara (Figma 51:558): intro, product boundary, sections separated by a thin line, and the versions in a card. */
export default function About() {
  const { health } = useContent();
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
        <Section title="Batas penggunaan" first>
          <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>
            Materi mencakup vokal a, i, u dan konsonan m, p, b. Bunyi yang mirip masih dapat mendapat hasil sama. Hasil bisa berbeda dari penilaian guru atau terapis.
          </Text>
          <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>
            Deteksi kata belum andal pada semua ucapan. Kalibrasi dan pendamping membantu penggunaan; hasil bukan ukuran kemampuan seseorang.
          </Text>
        </Section>
        <Section title="Privasi">
          <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>
            Wajah dipakai untuk mengukur bentuk bibir, tanpa pengenalan identitas. Rekaman latihan dihapus setelah diproses. Rekaman yang gagal dikirim dapat dikirim ulang dan dibuang saat merekam ulang atau meninggalkan layar.
          </Text>
          <Text maxFontSizeMultiplier={2} style={[styles.body, textFont()]}>
            Yang disimpan adalah hasil latihan dan angka kalibrasi. Supabase menyimpan hasil dan progres, tanpa video atau audio. Mode demo memakai profil contoh terpisah dan tidak mengirim hasil ke Supabase.
          </Text>
        </Section>
        <Section title="Versi">
          <View style={styles.card}>
            <VersionRow name="Aplikasi" value={Constants.expoConfig?.version ?? 'Tidak tersedia'} />
            <View style={styles.rowLine} />
            <VersionRow name="Mesin" value={health?.engine_version ?? 'Belum terhubung ke server'} />
          </View>
          {health?.mock_mode ? <InfoNote text="Server sedang memakai data contoh. Hasilnya bukan analisis rekaman." /> : null}
        </Section>
      </View>
    </Screen>
  );
}

function Section({ title, first = false, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, !first && styles.sectionLine]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.sectionTitle, textFont(true)]}>{title}</Text>
      {children}
    </View>
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
  section: { gap: spacing.sm, paddingVertical: layout.sectionGap },
  // The thin line between sections (Figma "Divider", `surfaceRaised`).
  sectionLine: { borderTopWidth: stroke.hairline, borderTopColor: colors.surfaceRaised },
  sectionTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
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
