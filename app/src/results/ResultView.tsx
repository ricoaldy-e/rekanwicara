import type { ReactNode } from 'react';
import { PixelRatio, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Body, InfoNote, LipIllustration, StatusBadge } from '../components';
import { describeItem } from '../data/progress';
import type { AnalyzeResult, PracticeItem } from '../data/types';
import { colors, displayFont, fontSize, lineHeight, radius, result as metrics, spacing, statusStyles, stroke, textFont } from '../theme';
import type { ResultStatus } from '../api/types';
import { LipMirror, LoudnessChart, VowelMap } from './charts';
import { soundShape } from './lipShapes';

export const DISCLAIMER = 'Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis.';

const TARGET_LABEL: Record<number, string> = { 2: 'Suku kata target', 3: 'Kata target' };

/**
 * "Bandingkan" step (flow §6, kontrak §5, design.md §6.5): target card, Bibir and Suara cards with a large badge,
 * a hint card only when there is something to say (at most two sentences, Bibir first), charts only at Level 1
 * and only from data the response carries (loudness included), and the disclaimer.
 * A retry shows its reason and no badge.
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
  const shape = levelOne ? soundShape(item.text) : null;
  const visuals = levelOne ? result.visuals : null;
  const anchors = visuals?.vowel_anchors;
  const showMap = visuals?.vowel_point && anchors?.a && anchors.i && anchors.u;
  const feedback = [result.lip_feedback, result.voice_feedback].filter((s): s is string => !!s).slice(0, 2);
  const targetName = levelOne ? describeItem(1, item.itemId, item.text).title : item.text.toLowerCase();

  return (
    <View style={styles.wrap} testID="result-ok">
      {sample}
      {shape ? (
        <View style={[styles.card, styles.targetRow]} testID="result-target">
          <LipIllustration shape={shape} size={metrics.illustration} />
          <View style={styles.targetText}>
            <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>Bentuk bibir target</Text>
            <Text maxFontSizeMultiplier={2} style={[styles.targetName, textFont(true)]}>{targetName}</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.card, styles.wordCard]} testID="result-target">
          <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>{TARGET_LABEL[result.level] ?? 'Target'}</Text>
          <Text maxFontSizeMultiplier={1.5} style={[styles.targetWord, displayFont()]}>{targetName}</Text>
        </View>
      )}

      <View style={stacked ? styles.indicatorsStacked : styles.indicatorsRow}>
        {result.lip_result ? <IndicatorCard name="Bibir" status={result.lip_result} testID="result-bibir" /> : null}
        {result.voice_result ? <IndicatorCard name="Suara" status={result.voice_result} testID="result-suara" /> : null}
      </View>

      {feedback.length > 0 ? (
        <View style={styles.hintCard} testID="result-hint">
          <Text maxFontSizeMultiplier={2} style={[styles.hintLabel, textFont()]}>Petunjuk</Text>
          {feedback.map((line) => (
            <Text key={line} maxFontSizeMultiplier={2} style={[styles.hint, textFont(true)]}>
              {line}
            </Text>
          ))}
        </View>
      ) : null}

      {result.quality_flags.includes('uncalibrated') ? (
        <InfoNote text="Hasil lebih tepat setelah kalibrasi. Kalibrasi bisa dilakukan dari beranda." testID="result-uncalibrated" />
      ) : null}

      {showMap ? (
        <ChartCard title="Peta vokal" legend={['Garis putus: target', 'Titik tebal: kamu']}>
          <VowelMap point={visuals.vowel_point!} anchors={anchors!} testID="vowel-map" />
        </ChartCard>
      ) : null}

      {visuals?.lip_contour && shape ? (
        <ChartCard title="Cermin bibir" legend={['Garis putus: contoh', 'Garis tebal: kamu']}>
          <LipMirror user={visuals.lip_contour} target={shape} testID="lip-mirror" />
        </ChartCard>
      ) : null}

      {/* Only when the response carries loudness data; there is no target loudness in the contract, so no target bar. */}
      {visuals?.loudness ? (
        <ChartCard title="Kekerasan suara" legend={['Garis: suaramu selama rekaman']}>
          <LoudnessChart loudness={visuals.loudness} testID="loudness-chart" />
        </ChartCard>
      ) : null}

      <Disclaimer />
    </View>
  );
}

function IndicatorCard({ name, status, testID }: { name: string; status: ResultStatus; testID: string }) {
  // The card is one element for screen readers ("Bibir: Sesuai"); the badge inside still shows icon + text.
  return (
    <View testID={testID} accessible accessibilityLabel={`${name}: ${statusStyles[status].label}`} style={[styles.card, styles.indicator]}>
      <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>{name}</Text>
      <StatusBadge status={status} size="lg" />
    </View>
  );
}

function ChartCard({ title, legend, children }: { title: string; legend?: string[]; children: ReactNode }) {
  return (
    <View style={[styles.card, styles.chartCard]}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={[styles.cardTitle, textFont(true)]}>
        {title}
      </Text>
      {children}
      {legend ? (
        <View style={styles.legend}>
          {legend.map((l) => (
            <Text key={l} maxFontSizeMultiplier={2} style={[styles.muted, textFont()]}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Disclaimer() {
  return (
    <Text maxFontSizeMultiplier={2} style={[styles.muted, textFont()]} testID="result-disclaimer">
      {DISCLAIMER}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  card: {
    padding: metrics.cardPadding,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: metrics.targetPadding },
  targetText: { flex: 1, minWidth: 1, gap: metrics.targetWordGap },
  targetName: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  wordCard: { gap: metrics.targetWordGap },
  targetWord: { fontSize: fontSize.display, lineHeight: lineHeight.display, color: colors.text },
  indicatorsRow: { flexDirection: 'row', gap: spacing.sm + spacing.xs },
  indicatorsStacked: { gap: spacing.sm + spacing.xs },
  indicator: { flex: 1, minWidth: 1, gap: metrics.cardGap },
  hintCard: { gap: metrics.hintGap, padding: metrics.hintPadding, borderRadius: radius.card, backgroundColor: colors.hero },
  hintLabel: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.onHeroMuted },
  hint: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.onHero },
  chartCard: { gap: metrics.cardGap },
  cardTitle: { fontSize: fontSize.label, lineHeight: lineHeight.label, color: colors.text },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: metrics.legendGap },
  muted: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
});
