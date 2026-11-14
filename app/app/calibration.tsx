import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CalibrateResponse, CalibrationStep } from '../src/api/types';
import { BigButton, Body, Card, InfoNote, LipIllustration, Screen, SessionHeader, StepHeader } from '../src/components';
import { UploadStatus } from '../src/components/UploadStatus';
import { retryHint } from '../src/content/hints';
import type { LipShape } from '../src/results/lipShapes';
import { deleteLocalFile, videoUpload } from '../src/recording/localFile';
import { RecordPanel } from '../src/recording/RecordPanel';
import { useUpload } from '../src/recording/useUpload';
import { useSettings } from '../src/state/settings';
import { useUser } from '../src/state/user';
import { calibration, colors, fontSize, layout, lineHeight, spacing, textFont } from '../src/theme';

/** SPEC §8.1: rest 3 s, then a, i, u. Every step records 3 s. */
const DURATION_MS = 3000;
const STEPS: { step: CalibrationStep; title: string; text: string; shape: LipShape; lipName: string }[] = [
  { step: 'rest', title: 'Diam dan rileks', text: 'Tutup mulut dengan santai dan diam selama 3 detik. Jangan bicara.', shape: 'closed', lipName: 'Rapat rileks' },
  { step: 'vowel_a', title: 'Ucapkan “a”', text: 'Buka mulut lebar dan ucapkan “aaa”. Tahan sampai rekaman selesai.', shape: 'a', lipName: 'Terbuka rileks' },
  { step: 'vowel_i', title: 'Ucapkan “i”', text: 'Tarik sudut bibir ke samping dan ucapkan “iii”. Tahan sampai rekaman selesai.', shape: 'i', lipName: 'Melebar ke samping' },
  { step: 'vowel_u', title: 'Ucapkan “u”', text: 'Bulatkan dan majukan bibir, lalu ucapkan “uuu”. Tahan sampai rekaman selesai.', shape: 'u', lipName: 'Bulat dan maju' },
];

type Stage = 'record' | 'send' | 'retry' | 'done' | 'incomplete';

export default function Calibration() {
  const router = useRouter();
  const { api } = useSettings();
  const { profile, markCalibrated } = useUser();
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<Stage>('record');
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

  const discard = (file: string | null = uri) => {
    deleteLocalFile(file);
    setUri(null);
    reset();
  };

  const send = async (file: string) => {
    setStage('send');
    const res: CalibrateResponse | null = await run((opts) =>
      api.calibrate({ file: videoUpload(file, `${current.step}.mp4`), user_id: profile.userId, step: current.step }, opts),
    );
    if (!res) return; // network error: UploadStatus offers "Coba kirim lagi", the file stays
    discard(file);
    if (res.status === 'retry') {
      setRetryText(retryHint(res.quality_flags) ?? 'Rekaman belum bisa dipakai. Coba rekam lagi.');
      setStage('retry');
    } else if (index < STEPS.length - 1) {
      setIndex(index + 1);
      setStage('record');
    } else if (res.calibration_complete) {
      markCalibrated();
      setStage('done');
    } else {
      setStage('incomplete');
    }
  };

  if (stage === 'done') {
    return (
      <Screen edges={TOP_EDGES} contentStyle={styles.content}>
        <StepHeader step={STEPS.length} total={STEPS.length} title="Kalibrasi selesai" />
        <Body>Terima kasih. Hasil latihan sekarang disesuaikan dengan bentuk bibir dan suaramu.</Body>
        <BigButton label="Ke beranda" icon="home" onPress={() => router.replace('/home')} />
      </Screen>
    );
  }

  if (stage === 'incomplete') {
    return (
      <Screen edges={TOP_EDGES} contentStyle={styles.content}>
        <InfoNote tone="warning" text="Kalibrasi belum lengkap di server. Ulangi dari langkah pertama." />
        <BigButton
          label="Ulangi dari awal"
          icon="refresh"
          onPress={() => {
            setIndex(0);
            setStage('record');
          }}
        />
      </Screen>
    );
  }

  // Leaving skips (or pauses) calibration; the home banner offers it again. The unsent clip is deleted on unmount.
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen edges={TOP_EDGES} contentStyle={styles.content}>
      <SessionHeader step={index + 1} total={STEPS.length} title={current.title} onBack={leave} backLabel="Kembali" />

      {stage === 'record' ? (
        <>
          <Body muted>{current.text}</Body>
          <Card style={styles.lipCard}>
            <LipIllustration shape={current.shape} size={calibration.lipWidth} testID="calibration-image" />
            <View style={styles.caption}>
              <Text maxFontSizeMultiplier={2} style={[styles.captionSmall, textFont()]}>Bentuk bibir</Text>
              <Text maxFontSizeMultiplier={2} style={[styles.captionLarge, textFont(true)]}>{current.lipName}</Text>
            </View>
          </Card>
          <RecordPanel
            durationMs={DURATION_MS}
            onRecorded={(file) => {
              setUri(file);
              send(file);
            }}
          />
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

// The stack header is hidden (the back capsule lives in the content, as in practice), so the top inset is ours.
const TOP_EDGES = ['top', 'bottom', 'left', 'right'] as const;

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingTop: spacing.sm, gap: spacing.md },
  lipCard: { flexDirection: 'row', alignItems: 'center', gap: calibration.cardGap, padding: calibration.cardPadding },
  caption: { flex: 1, gap: spacing.xs / 2 },
  captionSmall: { fontSize: fontSize.small, lineHeight: lineHeight.small, color: colors.textMuted },
  captionLarge: { fontSize: fontSize.large, lineHeight: lineHeight.large, color: colors.text },
});
