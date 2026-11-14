// usePreventRemove comes from expo-router: it has its own copy of react-navigation, and the standalone
// @react-navigation/native would not find expo-router's navigation context ("Couldn't find a navigation object").
import { Stack, useLocalSearchParams, useNavigation, usePreventRemove, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, PixelRatio, StyleSheet, View, useWindowDimensions } from 'react-native';

import { buzzResult } from '../../src/a11y/haptics';
import { ApiError } from '../../src/api/apiError';
import { errorMessage } from '../../src/api/errors';
import { ActionBar, AnalyzingView, BackButton, BigButton, InfoNote, LoadingView, Screen, SessionHeader } from '../../src/components';
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
import { colors, layout, spacing } from '../../src/theme';
import { attemptFromResult } from '../../src/user/pure';

/** SPEC §2 cycle: Lihat → Tiru → Menganalisis → Hasil (design.md §6.4: "Langkah n dari 4"). "Ulangi" loops back to Tiru. */
type Stage = 'look' | 'record' | 'send' | 'result';
const STAGE_STEP: Record<Stage, number> = { look: 1, record: 2, send: 3, result: 4 };
const TOTAL_STEPS = 4;
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

  // Bumped by "Batalkan" so a result that arrives after cancelling is ignored.
  const sendId = useRef(0);

  const send = useCallback(
    async (file: string) => {
      if (!item) return;
      const id = ++sendId.current;
      setStage('send');
      const res = await run((opts) =>
        analyze({ file: videoUpload(file, 'clip.mp4'), item, sessionId: SESSION_ID, userId: profile.userId }, { ...opts, api }),
      );
      if (!res || id !== sendId.current) return; // network error: UploadStatus offers "Coba kirim lagi", the file stays; or cancelled
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

  const exit = () => router.back();

  if (!item) {
    return (
      <Screen edges={TOP_EDGES} contentStyle={styles.content}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.backRow}>
          <BackButton label="Keluar latihan" onPress={exit} testID="session-back" />
        </View>
        {loading ? (
          <LoadingView label="Memuat materi" />
        ) : error ? (
          <>
            <InfoNote tone="warning" text={errorMessage(error)} testID="practice-error" />
            <BigButton label="Coba lagi" icon="refresh" onPress={reload} />
          </>
        ) : (
          <>
            <InfoNote tone="warning" text="Materi tidak ditemukan." testID="practice-not-found" />
            <BigButton label="Kembali" variant="secondary" onPress={exit} />
          </>
        )}
      </Screen>
    );
  }

  const scorable = canAnalyze(item);
  const footer =
    stage === 'look' && scorable ? (
      <View style={styles.footer}>
        <BigButton label="Mulai rekam" icon="videocam-outline" onPress={() => setStage('record')} />
      </View>
    ) : stage === 'result' && result ? (
      // Figma 58:782: actions stay at the bottom with a hairline above them while the result scrolls.
      <ActionBar testID="result-actions">
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
            <BigButton label="Lihat contoh" accessibilityLabel="Lihat contoh lagi" variant="secondary" onPress={() => setStage('look')} />
          </View>
          <View style={sideBySide ? styles.pairItem : undefined}>
            <BigButton label="Selesai" variant="secondary" onPress={exit} />
          </View>
        </View>
      </ActionBar>
    ) : stage === 'send' && upload.status !== 'error' ? (
      <View style={styles.footer}>
        <BigButton
          label="Batalkan"
          variant="secondary"
          onPress={() => {
            sendId.current += 1;
            discard();
            setStage('record');
          }}
        />
      </View>
    ) : undefined;

  return (
    <Screen edges={TOP_EDGES} contentStyle={styles.content} footer={footer}>
      <Stack.Screen options={{ headerShown: false }} />
      <SessionHeader
        step={STAGE_STEP[stage]}
        total={TOTAL_STEPS}
        title={stage === 'result' ? 'Bandingkan' : `Ucapkan “${item.text.toLowerCase()}”`}
        onBack={exit}
      />

      {stage === 'look' ? (
        <>
          <ModelVideo item={item} />
          {!profile.calibrated ? (
            <InfoNote text="Hasil lebih tepat setelah kalibrasi. Kalibrasi bisa dilakukan dari beranda." />
          ) : null}
          {!scorable ? <InfoNote text="Penilaian kata ini belum tersedia di server demo." testID="practice-not-supported" /> : null}
        </>
      ) : null}

      {stage === 'record' ? (
        <RecordPanel
          durationMs={item.itemId.startsWith('l0_') ? HOLD_DURATION_MS : DEFAULT_DURATION_MS}
          onRecorded={(file) => {
            setUri(file);
            send(file);
          }}
          footer={<BigButton label="Lihat contoh lagi" variant="secondary" onPress={() => setStage('look')} />}
        />
      ) : null}

      {stage === 'send' ? (
        upload.status === 'error' ? (
          <>
            <UploadStatus state={upload} onRetry={() => uri && send(uri)} describeError={describeAnalyzeError} />
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
          </>
        ) : (
          <AnalyzingView
            fraction={upload.status === 'uploading' ? upload.fraction : upload.status === 'done' ? 1 : null}
            attempt={upload.status === 'uploading' ? upload.attempt : 1}
          />
        )
      ) : null}

      {stage === 'result' && result ? <ResultView result={result} item={item} /> : null}
    </Screen>
  );
}

// The stack header is hidden (design.md §6.4: the back capsule lives in the content), so the top inset is ours.
const TOP_EDGES = ['top', 'bottom', 'left', 'right'] as const;

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, gap: spacing.md },
  backRow: { alignItems: 'flex-start' },
  footer: { paddingHorizontal: layout.gutter, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  // Screen already adds spacing.md between children; the extra spacing.sm makes 24 (spacing.lg) before actions.
  actions: { marginTop: spacing.sm, gap: spacing.md },
  stack: { gap: spacing.sm + spacing.xs },
  pair: { flexDirection: 'row', gap: spacing.sm + spacing.xs },
  pairItem: { flex: 1 },
});
