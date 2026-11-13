import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, PixelRatio, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { AnalyzeResponse } from '../../src/api/types';
import { BigButton, Body, Card, InfoNote, Screen, StepHeader } from '../../src/components';
import { UploadStatus } from '../../src/components/UploadStatus';
import { ModelVideo } from '../../src/practice/ModelVideo';
import { deleteLocalFile, videoUpload } from '../../src/recording/localFile';
import { DEFAULT_DURATION_MS } from '../../src/recording/recorder';
import { RecordPanel } from '../../src/recording/RecordPanel';
import { useUpload } from '../../src/recording/useUpload';
import { ResultView } from '../../src/results/ResultView';
import { useContent } from '../../src/state/content';
import { feedbackDetail, type Detail } from '../../src/state/progression';
import { useSettings } from '../../src/state/settings';
import { SESSION_ID, useUser } from '../../src/state/user';
import { colors, displayFont, fontSize, spacing } from '../../src/theme';
import { attemptFromResponse } from '../../src/user/pure';

/** SPEC §2 cycle: Lihat → Tiru → Bandingkan → Ulangi ("Ulangi" is the button that loops back to Tiru). */
type Stage = 'look' | 'record' | 'send' | 'result';
const STAGE_STEP: Record<Stage, { step: number; title: string }> = {
  look: { step: 1, title: 'Lihat' },
  record: { step: 2, title: 'Tiru' },
  send: { step: 2, title: 'Tiru' },
  result: { step: 3, title: 'Bandingkan' },
};
const LEVEL0_DURATION_MS = 4000; // SPEC §8.2

export default function Practice() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const { items, loading } = useContent();
  const { api } = useSettings();
  const { profile, progress, addAttempt } = useUser();
  const { width } = useWindowDimensions();
  const sideBySide = width >= 360 && PixelRatio.getFontScale() <= 1.3;
  const item = items?.find((it) => it.item_id === itemId);

  const [stage, setStage] = useState<Stage>('look');
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [detail, setDetail] = useState<Detail>('full');
  const { state: upload, run, reset } = useUpload();

  // A recording that was never analysed is deleted when leaving the screen (CLAUDE.md: no leftovers).
  const uriRef = useRef<string | null>(null);
  useEffect(() => {
    uriRef.current = uri;
  }, [uri]);
  useEffect(() => () => deleteLocalFile(uriRef.current), []);

  const discard = useCallback(() => {
    deleteLocalFile(uri);
    setUri(null);
    reset();
  }, [uri, reset]);

  const send = useCallback(
    async (file: string) => {
      if (!item) return;
      setStage('send');
      const res = await run((opts) =>
        api.analyze(
          { file: videoUpload(file, 'clip.mp4'), user_id: profile.userId, item_id: item.item_id, session_id: SESSION_ID },
          opts,
        ),
      );
      if (!res) return; // network error: UploadStatus offers "Coba kirim lagi", the file stays
      deleteLocalFile(file);
      setUri(null);
      reset();
      const attempt = attemptFromResponse(res, SESSION_ID); // null for a retry: not an attempt (SPEC §8.4)
      if (attempt) {
        // The machine scored it; how much the user sees follows the progression rules (SPEC §8.4).
        const inSession = profile.attempts.filter((a) => a.itemId === item.item_id && a.sessionId === SESSION_ID).length + 1;
        setDetail(feedbackDetail(item.level, progress.get(item.item_id)?.pattern ?? 'berblok', inSession));
        addAttempt(attempt);
      } else {
        setDetail('full');
      }
      setResult(res);
      setStage('result');
    },
    [api, item, profile.userId, profile.attempts, progress, run, reset, addAttempt],
  );

  if (!item) {
    return (
      <Screen>
        {loading ? (
          <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat materi" />
        ) : (
          <InfoNote tone="warning" text="Materi tidak ditemukan. Kembali ke beranda dan pilih materi lain." />
        )}
      </Screen>
    );
  }

  const { step, title } = STAGE_STEP[stage];
  return (
    <Screen>
      <StepHeader step={step} total={4} title={title} />

      {stage === 'look' ? (
        <>
          <Card>
            <ModelVideo item={item} />
          </Card>
          {!profile.calibrated ? (
            <InfoNote text="Hasil lebih tepat setelah kalibrasi. Kalibrasi bisa dilakukan dari beranda." />
          ) : null}
          <View style={styles.actions}>
            <BigButton label="Mulai rekam" icon="videocam" onPress={() => setStage('record')} />
          </View>
        </>
      ) : null}

      {stage === 'record' ? (
        <>
          <View style={styles.target}>
            {item.emoji ? (
              <Text accessible={false} style={styles.targetEmoji}>
                {item.emoji}
              </Text>
            ) : null}
            <Text accessibilityLabel={`Ucapkan ${item.text}`} maxFontSizeMultiplier={1.5} style={[styles.targetWord, displayFont()]}>
              {item.text}
            </Text>
          </View>
          <RecordPanel
            durationMs={item.level === 0 ? LEVEL0_DURATION_MS : DEFAULT_DURATION_MS}
            onRecorded={(file) => {
              setUri(file);
              send(file);
            }}
            hint="Wajah di dalam oval. Mulai bicara setelah tulisan MEREKAM muncul."
          />
          <View style={styles.actions}>
            <BigButton label="Lihat contoh lagi" variant="secondary" onPress={() => setStage('look')} />
          </View>
        </>
      ) : null}

      {stage === 'send' ? (
        <>
          <UploadStatus state={upload} onRetry={() => uri && send(uri)} />
          {upload.status === 'error' ? (
            <View style={styles.actions}>
              <BigButton
                label="Rekam ulang"
                variant="secondary"
                onPress={() => {
                  discard();
                  setStage('record');
                }}
              />
            </View>
          ) : (
            <Body muted>Menilai rekamanmu…</Body>
          )}
        </>
      ) : null}

      {stage === 'result' && result ? (
        <>
          <ResultView result={result} detail={detail} />
          <View style={styles.actions}>
            <BigButton
              label="Ulangi"
              icon="refresh"
              onPress={() => {
                setResult(null);
                setStage('record');
              }}
            />
            <View style={sideBySide ? styles.pair : styles.stack}>
              <View style={sideBySide ? styles.pairItem : undefined}>
                <BigButton label="Lihat contoh lagi" variant="secondary" onPress={() => setStage('look')} />
              </View>
              <View style={sideBySide ? styles.pairItem : undefined}>
                <BigButton label="Selesai" variant="secondary" onPress={() => router.back()} />
              </View>
            </View>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Screen already adds spacing.md between children; the extra spacing.sm makes 24 (spacing.lg) before actions.
  actions: { marginTop: spacing.sm, gap: spacing.md },
  stack: { gap: spacing.md },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairItem: { flex: 1 },
  target: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  targetEmoji: { fontSize: fontSize.display },
  targetWord: { fontSize: fontSize.display, color: colors.text },
});
