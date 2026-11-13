import { usePreventRemove } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PixelRatio, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { buzzResult } from '../../src/a11y/haptics';
import { ApiError } from '../../src/api/apiError';
import { errorMessage } from '../../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen, StepHeader } from '../../src/components';
import { UploadStatus } from '../../src/components/UploadStatus';
import { analyze, canAnalyze } from '../../src/data/analyze';
import type { AnalyzeResult } from '../../src/data/types';
import { usePracticeItem } from '../../src/data/useCatalog';
import { ModelVideo } from '../../src/practice/ModelVideo';
import { deleteLocalFile, videoUpload } from '../../src/recording/localFile';
import { DEFAULT_DURATION_MS } from '../../src/recording/recorder';
import { RecordPanel } from '../../src/recording/RecordPanel';
import { useUpload } from '../../src/recording/useUpload';
import { ResultView } from '../../src/results/ResultView';
import { useSettings } from '../../src/state/settings';
import { SESSION_ID, useUser } from '../../src/state/user';
import { colors, displayFont, fontSize, spacing, touchTarget } from '../../src/theme';
import { attemptFromResult } from '../../src/user/pure';

/** SPEC §2 cycle: Lihat → Tiru → Bandingkan → Ulangi. "Ulangi" is the button that loops back to Tiru, so 3 visible steps. */
type Stage = 'look' | 'record' | 'send' | 'result';
const STAGE_STEP: Record<Stage, { step: number; title: string }> = {
  look: { step: 1, title: 'Lihat' },
  record: { step: 2, title: 'Tiru' },
  send: { step: 2, title: 'Tiru' },
  result: { step: 3, title: 'Bandingkan' },
};
const HOLD_DURATION_MS = 4000; // SPEC §8.2: the l0_* sounds (held "a", soft to loud) need longer

/** kontrak §9: a scorer that is down or too slow is not a wrong result. */
function describeAnalyzeError(err: unknown): string | null {
  return err instanceof ApiError && (err.status === 503 || err.status === 504)
    ? 'Penilaian belum bisa dilakukan. Coba lagi.'
    : null;
}

export default function Practice() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ itemId: string; wordId?: string; position?: string }>();
  const position = params.position !== undefined ? Number(params.position) : undefined;
  const { api, apiUrl } = useSettings();
  const { profile, addAttempt } = useUser();
  const { width } = useWindowDimensions();
  const sideBySide = width >= 360 && PixelRatio.getFontScale() <= 1.3;
  const { data: item, loading, error, reload } = usePracticeItem(params.itemId, params.wordId, position, { baseUrl: apiUrl });

  const [stage, setStage] = useState<Stage>('look');
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const { state: upload, run, reset } = useUpload();

  // A recording that was never analysed is deleted when leaving the screen (CLAUDE.md: no leftovers).
  const uriRef = useRef<string | null>(null);
  useEffect(() => {
    uriRef.current = uri;
  }, [uri]);
  useEffect(() => () => deleteLocalFile(uriRef.current), []);

  // NAV-6: leaving while recording or sending asks first; header button and Android back both land here.
  usePreventRemove(stage === 'record' || stage === 'send', ({ data }) => {
    Alert.alert('Keluar dari latihan?', 'Rekaman ini tidak disimpan.', [
      { text: 'Lanjut', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

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
        analyze({ file: videoUpload(file, 'clip.mp4'), item, sessionId: SESSION_ID, userId: profile.userId }, { ...opts, api }),
      );
      if (!res) return; // network error: UploadStatus offers "Coba kirim lagi", the file stays
      deleteLocalFile(file);
      setUri(null);
      reset();
      const attempt = attemptFromResult(res, SESSION_ID); // null for a retry or a sample: not stored (kontrak §8)
      if (attempt) addAttempt(attempt);
      if (res.status === 'evaluated' && res.result) buzzResult(res.result);
      setResult(res);
      setStage('result');
    },
    [api, item, profile.userId, run, reset, addAttempt],
  );

  const exitButton = () => (
    <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Keluar latihan" hitSlop={spacing.sm} style={styles.exit}>
      <Text maxFontSizeMultiplier={2} style={styles.exitText}>Keluar latihan</Text>
    </Pressable>
  );

  if (!item) {
    return (
      <Screen>
        <Stack.Screen options={{ headerLeft: exitButton, headerBackVisible: false }} />
        {loading ? (
          <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat materi" />
        ) : error ? (
          <>
            <InfoNote tone="warning" text={errorMessage(error)} testID="practice-error" />
            <BigButton label="Coba lagi" icon="refresh" onPress={reload} />
          </>
        ) : (
          <>
            <InfoNote tone="warning" text="Materi tidak ditemukan." testID="practice-not-found" />
            <BigButton label="Kembali" variant="secondary" onPress={() => router.back()} />
          </>
        )}
      </Screen>
    );
  }

  const scorable = canAnalyze(item);
  const { step, title } = STAGE_STEP[stage];
  return (
    <Screen>
      <Stack.Screen options={{ title: `Ucapkan “${item.text}”`, headerLeft: exitButton, headerBackVisible: false }} />
      <StepHeader step={step} total={3} title={title} />

      {stage === 'look' ? (
        <>
          <Card>
            <ModelVideo item={item} />
          </Card>
          {!profile.calibrated ? (
            <InfoNote text="Hasil lebih tepat setelah kalibrasi. Kalibrasi bisa dilakukan dari beranda." />
          ) : null}
          {scorable ? (
            <View style={styles.actions}>
              <BigButton label="Mulai rekam" icon="videocam" onPress={() => setStage('record')} />
            </View>
          ) : (
            <InfoNote text="Penilaian kata ini belum tersedia di server demo." testID="practice-not-supported" />
          )}
        </>
      ) : null}

      {stage === 'record' ? (
        <>
          <View style={styles.target}>
            <Text accessibilityLabel={`Ucapkan ${item.text}`} maxFontSizeMultiplier={1.5} style={[styles.targetWord, displayFont()]}>
              {item.text}
            </Text>
          </View>
          <RecordPanel
            durationMs={item.itemId.startsWith('l0_') ? HOLD_DURATION_MS : DEFAULT_DURATION_MS}
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
          <UploadStatus state={upload} onRetry={() => uri && send(uri)} describeError={describeAnalyzeError} />
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
          <ResultView result={result} item={item} />
          <View style={styles.actions}>
            <BigButton
              label={result.status === 'retry' ? 'Rekam ulang' : 'Ulangi'}
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
  targetWord: { fontSize: fontSize.display, color: colors.text },
  exit: { minHeight: touchTarget, justifyContent: 'center', paddingRight: spacing.sm },
  exitText: { fontSize: fontSize.label, fontWeight: '700', color: colors.text },
});
