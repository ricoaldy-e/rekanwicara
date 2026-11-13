import { StyleSheet, Text, View } from 'react-native';

import type { AnalyzeResponse } from '../api/types';
import { Body, Card, InfoNote, StatusBadge } from '../components';
import { getHint } from '../content/hints';
import type { Detail } from '../state/progression';
import { colors, fontSize, spacing } from '../theme';
import { LipMirror, LoudnessChart, VowelMap } from './charts';
import { targetShape } from './lipShapes';

export const DISCLAIMER = 'Hasil ini perkiraan sistem untuk latihan, bukan penilaian klinis.';

/**
 * "Bandingkan" step (SPEC §8.3): two indicators, one hint, the charts that apply, and the disclaimer.
 * `detail` is the reduced feedback of SPEC §8.4 (the machine scored the attempt either way):
 * 'overall' shows only the overall status, 'hidden' only says the attempt was recorded.
 */
export function ResultView({ result, detail = 'full' }: { result: AnalyzeResponse; detail?: Detail }) {
  const hint = getHint(result.hint_id);

  if (result.status === 'ok' && detail === 'hidden') {
    return (
      <View style={styles.wrap} testID="result-hidden">
        <InfoNote text="Percobaan tercatat. Ucapkan sekali lagi, hasilnya ditampilkan setiap dua percobaan." />
        <Disclaimer />
      </View>
    );
  }

  if (result.status === 'ok' && detail === 'overall' && result.overall) {
    return (
      <View style={styles.wrap} testID="result-overall">
        <StatusBadge status={result.overall} label="Hasil" size="lg" testID="result-overall-badge" />
        <Disclaimer />
      </View>
    );
  }

  if (result.status === 'retry') {
    return (
      <View style={styles.wrap} testID="result-retry">
        <InfoNote tone="warning" text={hint ?? 'Rekaman belum bisa dinilai. Coba rekam lagi.'} testID="result-hint" />
        <Body muted>Rekaman ini tidak dihitung sebagai percobaan.</Body>
        <Disclaimer />
      </View>
    );
  }

  const { indicators, visuals } = result;
  const shape = targetShape((result.units ?? []).map((u) => u.target));
  const anchors = visuals.vowel_anchors;
  const showMap = visuals.vowel_point && anchors?.a && anchors.i && anchors.u;

  return (
    <View style={styles.wrap} testID="result-ok">
      <View style={styles.badges}>
        {indicators?.bibir ? <StatusBadge status={indicators.bibir} label="Bibir" size="lg" testID="result-bibir" /> : null}
        {indicators ? <StatusBadge status={indicators.suara} label="Suara" size="lg" testID="result-suara" /> : null}
      </View>

      {hint ? (
        <Card>
          <Text style={styles.hint} testID="result-hint">
            {hint}
          </Text>
        </Card>
      ) : null}

      {result.quality_flags.includes('uncalibrated') ? (
        <InfoNote text="Hasil lebih tepat setelah kalibrasi. Kalibrasi bisa dilakukan dari beranda." testID="result-uncalibrated" />
      ) : null}

      {result.level === 0 && visuals.loudness ? (
        <Section title="Kekerasan suara">
          <LoudnessChart loudness={visuals.loudness} testID="loudness-chart" />
        </Section>
      ) : null}

      {showMap ? (
        <Section title="Peta vokal">
          <VowelMap point={visuals.vowel_point!} anchors={anchors!} testID="vowel-map" />
        </Section>
      ) : null}

      {visuals.lip_contour && shape ? (
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
  badges: { gap: spacing.sm },
  hint: { fontSize: fontSize.large, fontWeight: '700', color: colors.text, lineHeight: 32 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.large, fontWeight: '700', color: colors.primary },
  disclaimer: { fontSize: fontSize.small, color: colors.textMuted },
});
