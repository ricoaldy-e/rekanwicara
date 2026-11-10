import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CalibrateResponse, CalibrationStep } from '../src/api/types';
import { BigButton, Body, Card, FaceGuide, InfoNote, Screen, StepHeader } from '../src/components';
import { UploadStatus } from '../src/components/UploadStatus';
import { retryHint } from '../src/content/hints';
import type { LipShape } from '../src/results/lipShapes';
import { deleteLocalFile, videoUpload } from '../src/recording/localFile';
import { RecordPanel } from '../src/recording/RecordPanel';
import { useUpload } from '../src/recording/useUpload';
import { useSettings } from '../src/state/settings';
import { useUser } from '../src/state/user';
import { spacing } from '../src/theme';

/** SPEC §8.1: rest 3 s, then a, i, u. Every step records 3 s. */
const DURATION_MS = 3000;
const STEPS: { step: CalibrationStep; title: string; text: string; shape: LipShape }[] = [
  { step: 'rest', title: 'Diam dan rileks', text: 'Tutup mulut dengan santai dan diam selama 3 detik. Jangan bicara.', shape: 'closed' },
  { step: 'vowel_a', title: 'Ucapkan "a"', text: 'Buka mulut lebar dan ucapkan "aaa". Tahan sampai rekaman selesai.', shape: 'a' },
  { step: 'vowel_i', title: 'Ucapkan "i"', text: 'Tarik sudut bibir ke samping dan ucapkan "iii". Tahan sampai rekaman selesai.', shape: 'i' },
  { step: 'vowel_u', title: 'Ucapkan "u"', text: 'Bulatkan dan majukan bibir, lalu ucapkan "uuu". Tahan sampai rekaman selesai.', shape: 'u' },
];

type Stage = 'show' | 'record' | 'send' | 'retry' | 'done' | 'incomplete';

export default function Calibration() {
  const router = useRouter();
  const { api } = useSettings();
  const { profile, markCalibrated } = useUser();
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('show');
  const [uri, setUri] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const { state: upload, run, reset } = useUpload();
  const current = STEPS[index];

  // A recording that was never uploaded successfully is deleted when leaving the screen.
  const uriRef = useRef<string | null>(null);
  useEffect(() => {
    uriRef.current = uri;
  }, [uri]);
  useEffect(() => () => deleteLocalFile(uriRef.current), []);

  const discard = () => {
    deleteLocalFile(uri);
    setUri(null);
    reset();
  };

  const send = async (file: string) => {
    setStage('send');
    const res: CalibrateResponse | null = await run((opts) =>
      api.calibrate({ file: videoUpload(file, `${current.step}.mp4`), user_id: profile.userId, step: current.step }, opts),
    );
    if (!res) return; // network error: UploadStatus offers "Coba kirim lagi", the file stays
    discard();
    if (res.status === 'retry') {
      setRetryText(retryHint(res.quality_flags) ?? 'Rekaman belum bisa dipakai. Coba rekam lagi.');
      setStage('retry');
    } else if (index < STEPS.length - 1) {
      setIndex(index + 1);
      setStage('show');
    } else if (res.calibration_complete) {
      markCalibrated();
      setStage('done');
    } else {
      setStage('incomplete');
    }
  };

  if (stage === 'done') {
    return (
      <Screen>
        <StepHeader step={STEPS.length} total={STEPS.length} title="Kalibrasi selesai" />
        <Body>Terima kasih. Hasil latihan sekarang disesuaikan dengan bentuk bibir dan suaramu.</Body>
        <BigButton label="Ke beranda" icon="home" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  if (stage === 'incomplete') {
    return (
      <Screen>
        <InfoNote tone="warning" text="Kalibrasi belum lengkap di server. Ulangi dari langkah pertama." />
        <BigButton
          label="Ulangi dari awal"
          icon="refresh"
          onPress={() => {
            setIndex(0);
            setStage('show');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <StepHeader step={index + 1} total={STEPS.length} title={current.title} />

      {stage === 'show' ? (
        <>
          <View style={styles.center}>
            <FaceGuide shape={current.shape} testID="calibration-image" />
          </View>
          <Card>
            <Body>{current.text}</Body>
          </Card>
          <BigButton label="Siap, rekam" icon="videocam" onPress={() => setStage('record')} />
          <BigButton label="Lewati, ke beranda" variant="secondary" onPress={() => router.replace('/home')} />
        </>
      ) : null}

      {stage === 'record' ? (
        <RecordPanel
          durationMs={DURATION_MS}
          onRecorded={(file) => {
            setUri(file);
            send(file);
          }}
          hint="Wajah di dalam oval. Tunggu tulisan MEREKAM, lalu lakukan langkah ini."
        />
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
          ) : null}
        </>
      ) : null}

      {stage === 'retry' ? (
        <>
          <InfoNote tone="warning" text={retryText ?? ''} testID="calibration-retry" />
          <BigButton label="Coba lagi" icon="refresh" onPress={() => setStage('record')} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.md },
});
