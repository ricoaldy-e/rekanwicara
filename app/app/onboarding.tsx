import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BigButton, CheckRow, InfoNote, Screen } from '../src/components';
import { useUser } from '../src/state/user';
import { colors, displayFont, entry, fontSize, lineHeight, radius, session, spacing, stroke, textFont, wordList } from '../src/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const CYCLE: { icon: IconName; text: string }[] = [
  { icon: 'eye-outline', text: 'Lihat contoh bentuk bibir.' },
  { icon: 'videocam-outline', text: 'Tiru dan rekam wajah dan suaramu.' },
  { icon: 'swap-horizontal-outline', text: 'Bandingkan hasilnya.' },
  { icon: 'refresh-outline', text: 'Ulangi sampai terasa pas.' },
];
const TITLES = ['Kenali Rekan Wicara', 'Persetujuan'];
const TOTAL = 2;

/** Onboarding (flow ONB, Figma 29:182 and 29:235): two steps, then Kalibrasi. */
export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useUser();
  const [step, setStep] = useState(1);
  const [consentUser, setConsentUser] = useState(false);
  const [consentCompanion, setConsentCompanion] = useState(false);
  const bothConsents = consentUser && consentCompanion;
  const finish = () => {
    completeOnboarding();
    router.replace('/calibration');
  };

  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={styles.content}
      footer={
        step === 1 ? (
          <View style={styles.footer}>
            <BigButton label="Lanjut" icon="arrow-forward" onPress={() => setStep(2)} />
          </View>
        ) : (
          <View style={styles.footer}>
            {!bothConsents ? (
              <Text maxFontSizeMultiplier={2} style={[styles.hint, textFont()]}>Centang kedua persetujuan untuk lanjut.</Text>
            ) : null}
            <BigButton label="Lanjut ke kalibrasi" icon="arrow-forward" disabled={!bothConsents} onPress={finish} />
            <BigButton label="Kembali" variant="secondary" onPress={() => setStep(1)} />
          </View>
        )
      }
    >
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`Langkah ${step} dari ${TOTAL}. ${TITLES[step - 1]}`}
        style={styles.stepHeader}
      >
        <View style={styles.bars} importantForAccessibility="no-hide-descendants">
          {Array.from({ length: TOTAL }, (_, i) => (
            <View key={i} style={[styles.bar, i < step ? styles.barDone : styles.barTodo]} />
          ))}
        </View>
        <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>Langkah {step} dari {TOTAL}</Text>
        <Text accessible={false} maxFontSizeMultiplier={1.5} style={[styles.title, displayFont()]}>{TITLES[step - 1]}</Text>
      </View>

      {step === 1 ? (
        <>
          <Text maxFontSizeMultiplier={2} style={[styles.lead, textFont()]}>
            Rekan Wicara membantu kamu berlatih mengucapkan bunyi dengan melihat bentuk bibir dan merasakan suara.
          </Text>
          <View style={styles.cycle}>
            {CYCLE.map((c) => (
              <View key={c.text} style={styles.cycleCard}>
                <View style={styles.cycleIcon}>
                  <Ionicons name={c.icon} size={session.stage.icon} color={colors.text} accessible={false} />
                </View>
                <Text maxFontSizeMultiplier={2} style={[styles.cycleText, textFont()]}>{c.text}</Text>
              </View>
            ))}
          </View>
          <InfoNote text="Aplikasi ini alat bantu latihan mandiri. Bukan pengganti guru atau terapis, dan bukan penilaian klinis." />
        </>
      ) : (
        <>
          <View style={styles.privacy}>
            <Ionicons name="shield-outline" size={wordList.chipIcon + spacing.sm} color={colors.onHero} accessible={false} />
            <Text maxFontSizeMultiplier={2} style={[styles.privacyText, textFont()]}>
              Rekaman wajah dan suaramu hanya dikirim ke server latihan untuk dinilai, lalu dihapus. Yang disimpan hanya
              hasil berupa angka. Angka hasil latihan juga disimpan online tanpa namamu, supaya kemajuanmu tidak hilang.
            </Text>
          </View>
          <ConsentCard>
            <CheckRow
              checked={consentUser}
              onToggle={() => setConsentUser((v) => !v)}
              text="Saya mengerti ini alat bantu latihan dan setuju rekaman saya dinilai."
            />
          </ConsentCard>
          <ConsentCard>
            <CheckRow
              checked={consentCompanion}
              onToggle={() => setConsentCompanion((v) => !v)}
              text="Pendamping (orang tua, keluarga, atau guru) tahu dan setuju."
            />
          </ConsentCard>
        </>
      )}
    </Screen>
  );
}

function ConsentCard({ children }: { children: ReactNode }) {
  return <View style={styles.consentCard}>{children}</View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: entry.gutter, paddingTop: spacing.sm + spacing.xs, gap: spacing.sm + spacing.xs },
  footer: { gap: spacing.sm + spacing.xs, paddingHorizontal: entry.gutter, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  stepHeader: { gap: spacing.sm + spacing.xs },
  bars: { flexDirection: 'row', gap: entry.stepBarGap },
  bar: { flex: 1, minWidth: 1, height: session.stepBar.height, borderRadius: session.stepBar.height / 2 },
  barDone: { backgroundColor: colors.text },
  barTodo: { backgroundColor: colors.surfaceRaised },
  muted: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  title: { fontSize: fontSize.titleLarge, lineHeight: lineHeight.titleLarge, color: colors.text },
  lead: { fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.textMuted },
  cycle: { gap: spacing.sm },
  cycleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
    padding: spacing.sm + spacing.xs,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  cycleIcon: { width: wordList.tile, height: wordList.tile, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
  cycleText: { flex: 1, minWidth: 1, fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.text },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + spacing.xs, padding: spacing.md, borderRadius: radius.card, backgroundColor: colors.hero },
  privacyText: { flex: 1, minWidth: 1, fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.onHero },
  consentCard: { padding: spacing.md, borderRadius: radius.card, borderWidth: stroke.hairline, borderColor: colors.hairline, backgroundColor: colors.surface },
  hint: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted, textAlign: 'center' },
});
