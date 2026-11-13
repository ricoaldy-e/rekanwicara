import { PixelRatio, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Body, InfoNote, LipIllustration, StatusBadge } from '../components';
import type { AnalyzeResult, PracticeItem } from '../data/types';
import { colors, displayFont, fontSize, radius, spacing } from '../theme';
import { LipMirror, LoudnessChart, VowelMap } from './charts';
import { targetShape } from './lipShapes';

export const DISCLAIMER = 'Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis.';

/**
 * "Bandingkan" step (flow §6, kontrak §5): Bibir and Suara badges, at most two feedback sentences
 * (Bibir first), charts only at Level 1, and the disclaimer. A retry shows its reason and no badge.
 */
export function ResultView({ result, item }: { result: AnalyzeResult; item: PracticeItem }) {
  const { width } = useWindowDimensions();
  const stacked = width < 360 || PixelRatio.getFontScale() > 1.3;
  const sample = result.sample ? (
    <InfoNote tone="warning" text="Hasil contoh, bukan analisis rekaman." testID="result-sample" />
  ) : null;

  if (result.status === 'retry') {
    return (
      <View style={styles.wrap} testID="result-retry">
        {sample}
        <InfoNote tone="warning" text={result.feedback.message || 'Rekaman belum bisa dinilai. Coba rekam lagi.'} testID="result-retry-reason" />
        <Body muted>Rekaman ini tidak dihitung sebagai percobaan.</Body>
        <Disclaimer />
      </View>
    );
  }

  const levelOne = result.level === 1;
  // Level 1 sounds are single vowels ("A", "I", "U"); words have no single lip shape.
  const shape = levelOne ? targetShape([item.text.toLowerCase()]) : null;
  const visuals = levelOne ? result.visuals : null;
  const anchors = visuals?.vowel_anchors;
  const showMap = visuals?.vowel_point && anchors?.a && anchors.i && anchors.u;
  const feedback = [result.lip_feedback, result.voice_feedback].filter((s): s is string => !!s).slice(0, 2);

  return (
    <View style={styles.wrap} testID="result-ok">
      {sample}
      <View style={styles.target} testID="result-target">
        {shape ? <LipIllustration shape={shape} size={96} /> : null}
        <View style={styles.targetText}>
          <Text style={styles.targetLabel}>{shape ? 'Bentuk bibir' : 'Target'}</Text>
          <Text style={[styles.targetWord, displayFont()]}>{item.text}</Text>
        </View>
      </View>

      <View style={stacked ? styles.badgesStacked : styles.badgesRow}>
        {result.lip_result ? <StatusBadge status={result.lip_result} label="Bibir" size="lg" testID="result-bibir" /> : null}
        {result.voice_result ? <StatusBadge status={result.voice_result} label="Suara" size="lg" testID="result-suara" /> : null}
      </View>

      {feedback.length > 0 ? (
        <View style={styles.hintCard} testID="result-hint">
          <Text style={styles.hintLabel}>Petunjuk</Text>
          {feedback.map((line) => (
            <Text key={line} style={styles.hint}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {result.quality_flags.includes('uncalibrated') ? (
        <InfoNote text="Hasil lebih tepat setelah kalibrasi. Kalibrasi bisa dilakukan dari beranda." testID="result-uncalibrated" />
      ) : null}

      {visuals?.loudness ? (
        <Section title="Kekerasan suara">
          <LoudnessChart loudness={visuals.loudness} testID="loudness-chart" />
        </Section>
      ) : null}

      {showMap ? (
        <Section title="Peta vokal">
          <VowelMap point={visuals.vowel_point!} anchors={anchors!} testID="vowel-map" />
        </Section>
      ) : null}

      {visuals?.lip_contour && shape ? (
        <Section title="Cermin bibir">
          <LipMirror user={visuals.lip_contour} target={shape} testID="lip-mirror" />
          <Body muted>Garis putus-putus: bentuk target. Garis tebal: bibirmu.</Body>
        </Section>
      ) : null}

      <Disclaimer />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Disclaimer() {
  return (
    <Text style={styles.disclaimer} testID="result-disclaimer">
      {DISCLAIMER}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badgesStacked: { gap: spacing.sm },
  target: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md },
  targetText: { flex: 1, gap: spacing.xs },
  targetLabel: { fontSize: fontSize.small, color: colors.textMuted },
  targetWord: { fontSize: fontSize.title, color: colors.text },
  hintCard: { backgroundColor: colors.hero, borderRadius: radius.card, padding: 20, gap: spacing.xs },
  hintLabel: { fontSize: fontSize.small, color: colors.onHeroMuted },
  hint: { fontSize: fontSize.large, fontWeight: '700', color: colors.onHero },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  disclaimer: { fontSize: fontSize.small, color: colors.textMuted },
});
