import { StyleSheet, View } from 'react-native';

import type { V2AnalyzeResponse } from '../api/types';
import { Body, InfoNote, StatusBadge } from '../components';
import { spacing } from '../theme';
import { resultStatus } from '../user/pure';
import { LipMirror, LoudnessChart, VowelMap } from './charts';
import { targetShape } from './lipShapes';
import { DISCLAIMER } from './ResultView';

export function V2ResultView({ result, target }: { result: V2AnalyzeResponse; target: string }) {
  if (result.status === 'retry') return <View style={styles.wrap}>
    <InfoNote tone="warning" text={result.feedback.message} />
    <Body>Rekaman ini tidak dihitung sebagai percobaan.</Body>
  </View>;
  const visual = result.visuals;
  const shape = targetShape([target]);
  return <View style={styles.wrap}>
    {result.result ? <StatusBadge label="Hasil" status={resultStatus[result.result]} size="lg" /> : null}
    {result.lip_result ? <StatusBadge label="Bibir" status={resultStatus[result.lip_result]} /> : null}
    {result.voice_result ? <StatusBadge label="Suara" status={resultStatus[result.voice_result]} /> : null}
    <Body>{result.feedback.message}</Body>
    {result.quality_flags.includes('uncalibrated') ? <InfoNote text="Hasil lebih tepat setelah kalibrasi." /> : null}
    {visual?.vowel_point && visual.vowel_anchors ? <>
      <Body>Peta vokal</Body>
      <VowelMap point={visual.vowel_point} anchors={visual.vowel_anchors} />
    </> : null}
    {visual?.lip_contour && shape ? <>
      <Body>Cermin bibir</Body>
      <LipMirror user={visual.lip_contour} target={shape} />
    </> : null}
    {visual?.loudness && !visual.vowel_point ? <>
      <Body>Kekerasan suara</Body>
      <LoudnessChart loudness={visual.loudness} />
    </> : null}
    <Body muted>{DISCLAIMER}</Body>
  </View>;
}

const styles = StyleSheet.create({ wrap: { gap: spacing.md } });
