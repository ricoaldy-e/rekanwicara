import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fontSize, lineHeight, session, spacing, textFont } from '../theme';
import { InfoNote } from './InfoNote';
import { ProgressBar } from './ProgressBar';

type StageState = 'done' | 'active' | 'pending';

export interface AnalyzingViewProps {
  /** Upload progress 0..1; null while unknown. */
  fraction: number | null;
  /** Shown when the upload was retried automatically. */
  attempt?: number;
}

const R = (session.stage.icon - session.stage.ring) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

function StageIcon({ state }: { state: StageState }) {
  const size = session.stage.icon;
  if (state === 'done') return <Ionicons name="checkmark-circle-outline" size={size} color={colors.success} accessible={false} />;
  if (state === 'pending') return <Ionicons name="ellipse-outline" size={size} color={colors.textMuted} accessible={false} />;
  // Static three-quarter ring: no spinning (design.md §8, Reduce Motion).
  return (
    <Svg width={size} height={size} accessible={false}>
      <Circle cx={size / 2} cy={size / 2} r={R} stroke={colors.hairline} strokeWidth={session.stage.ring} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={R}
        stroke={colors.accent}
        strokeWidth={session.stage.ring}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${CIRCUMFERENCE * 0.25} ${CIRCUMFERENCE}`}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

function Stage({ state, label }: { state: StageState; label: string }) {
  const text = state === 'done' ? `${label}, selesai` : state === 'active' ? `${label}, sedang berjalan` : `${label}, menunggu`;
  return (
    <View accessible accessibilityLabel={text} style={styles.stage}>
      <StageIcon state={state} />
      <Text accessible={false} maxFontSizeMultiplier={2} style={[styles.stageText, textFont(), state === 'pending' && styles.muted]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * "Menganalisis…" (design.md §6.4, Figma 46:253): bar, three stages and the privacy note.
 * Only the upload gives a real signal; once it is sent, lip and voice scoring are shown as the stages in progress
 * and waiting (the server reports no per-stage events).
 */
export function AnalyzingView({ fraction, attempt = 1 }: AnalyzingViewProps) {
  const sent = fraction !== null && fraction >= 1;
  return (
    <View style={styles.wrap} testID="analyzing-view">
      <View style={styles.progress}>
        <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={2} style={[styles.heading, textFont(true)]}>
          Menganalisis…
        </Text>
        <ProgressBar value={fraction} height={session.stepBar.height} accessibilityLabel="Kemajuan analisis" />
        {attempt > 1 ? <Text style={[styles.attempt, textFont()]}>Percobaan ke-{attempt}</Text> : null}
      </View>
      <View style={styles.stages}>
        <Stage state={sent ? 'done' : 'active'} label={sent ? 'Rekaman terkirim' : 'Mengirim rekaman'} />
        <Stage state={sent ? 'active' : 'pending'} label="Menilai bentuk bibir" />
        <Stage state="pending" label="Menilai suara" />
      </View>
      <InfoNote text="Rekaman dihapus setelah dianalisis. Yang disimpan hanya hasil berupa angka." />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg - spacing.xs },
  progress: { gap: spacing.sm },
  heading: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
  attempt: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  stages: { gap: session.stage.gap },
  stage: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs },
  stageText: { flex: 1, minWidth: 1, fontSize: fontSize.body, lineHeight: lineHeight.body, color: colors.text },
  muted: { color: colors.textMuted },
});
