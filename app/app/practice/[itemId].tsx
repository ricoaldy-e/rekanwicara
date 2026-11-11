import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import type { AnalyzeResponse } from '../../src/api/types';
import { BigButton, Body, InfoNote, Screen, StepHeader } from '../../src/components';
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
import { colors } from '../../src/theme';
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
          <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="Memuat materi" />
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
          <ModelVideo item={item} />
          {!profile.calibrated ? (
            <InfoNote text="Hasil lebih tepat setelah kalibrasi. Kalibrasi bisa dilakukan dari beranda." />
          ) : null}
          <BigButton label="Mulai rekam" icon="videocam" onPress={() => setStage('record')} />
        </>
      ) : null}

      {stage === 'record' ? (
        <>
          <Body>Ucapkan: {item.text}</Body>
          <RecordPanel
            durationMs={item.level === 0 ? LEVEL0_DURATION_MS : DEFAULT_DURATION_MS}
            onRecorded={(file) => {
              setUri(file);
              send(file);
            }}
            hint="Wajah di dalam oval. Mulai bicara setelah tulisan MEREKAM muncul."
          />
          <BigButton label="Lihat contoh lagi" variant="secondary" onPress={() => setStage('look')} />
        </>
      ) : null}

      {stage === 'send' ? (
        <>
          <UploadStatus state={upload} onRetry={() => uri && send(uri)} />
          {upload.status === 'error' ? (
            <BigButton
              label="Rekam ulang"
              variant="secondary"
              onPress={() => {
                discard();
                setStage('record');
              }}
            />
          ) : (
            <Body muted>Menilai rekamanmu…</Body>
          )}
        </>
      ) : null}

      {stage === 'result' && result ? (
        <>
          <ResultView result={result} detail={detail} />
          <BigButton
            label="Ulangi"
            icon="refresh"
            onPress={() => {
              setResult(null);
              setStage('record');
            }}
          />
          <BigButton label="Lihat contoh lagi" variant="secondary" onPress={() => setStage('look')} />
          <BigButton label="Selesai" variant="secondary" onPress={() => router.back()} />
        </>
      ) : null}
    </Screen>
  );
}
