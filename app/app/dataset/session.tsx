import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import type { RecordingCondition } from '../../src/api/types';
import { BigButton, Body, Card, InfoNote, Screen, StepHeader, Title } from '../../src/components';
import { OptionGroup } from '../../src/components/OptionGroup';
import { UploadStatus } from '../../src/components/UploadStatus';
import { DATASET_MODE } from '../../src/config';
import { deviceLabel } from '../../src/dataset/device';
import { describeDatasetError } from '../../src/dataset/errors';
import { BLOCK_NAMES, itemText, SPEAKER_IDS, type ClipSpec, type SpeakerId } from '../../src/dataset/script';
import {
  clearSession,
  createSession,
  isComplete,
  loadSession,
  markDone,
  nextClipIndex,
  saveSession,
  type DatasetSession,
} from '../../src/dataset/session';
import { ClipPreview } from '../../src/recording/ClipPreview';
import { deleteLocalFile, videoUpload } from '../../src/recording/localFile';
import { RecordPanel } from '../../src/recording/RecordPanel';
import { useUpload } from '../../src/recording/useUpload';
import { useSettings } from '../../src/state/settings';
import { colors, fontSize, spacing } from '../../src/theme';

type Stage = 'loading' | 'resume' | 'form' | 'clip' | 'complete';

const CONDITIONS = [
  { value: 'quiet', label: 'Tenang' },
  { value: 'noisy', label: 'Bising' },
] as const;

export default function DatasetSessionScreen() {
  const router = useRouter();
  const { api } = useSettings();
  const [stage, setStage] = useState<Stage>('loading');
  const [session, setSession] = useState<DatasetSession | null>(null);
  const [speaker, setSpeaker] = useState<SpeakerId | null>(null);
  const [condition, setCondition] = useState<RecordingCondition>('quiet');
  const [uri, setUri] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const { state: upload, run, reset } = useUpload();
  const device = useRef(deviceLabel()).current;

  // Delete a recorded-but-unsaved clip when leaving the screen.
  const uriRef = useRef<string | null>(null);
  uriRef.current = uri;
  useEffect(() => () => deleteLocalFile(uriRef.current), []);

  useEffect(() => {
    loadSession().then((stored) => {
      if (stored && !isComplete(stored)) {
        setSession(stored);
        setStage('resume');
      } else {
        setStage('form');
      }
    });
  }, []);

  const start = useCallback(async () => {
    if (!speaker) return;
    const s = createSession(speaker, condition, device);
    await saveSession(s);
    setSession(s);
    setLastSaved(null);
    setStage('clip');
  }, [speaker, condition, device]);

  const discardAndRestart = useCallback(() => {
    Alert.alert('Mulai sesi baru?', 'Klip yang sudah terkirim tetap ada di laptop. Progres sesi ini di HP dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Mulai baru',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          setSession(null);
          setStage('form');
        },
      },
    ]);
  }, []);

  const retake = useCallback(() => {
    deleteLocalFile(uri);
    setUri(null);
    reset();
  }, [uri, reset]);

  const save = useCallback(
    async (clip: ClipSpec) => {
      if (!session || !uri) return;
      const res = await run((opts) =>
        api.datasetUpload(
          {
            file: videoUpload(uri, `${clip.key}.mp4`),
            purpose: 'dataset',
            speaker_id: session.speaker_id,
            item_id: clip.item_id,
            rep: clip.rep,
            intended_error: clip.intended_error,
            condition: clip.condition,
            session_id: session.session_id,
            device: session.device,
          },
          opts,
        ),
      );
      if (!res) return; // error is shown by UploadStatus; the local file is kept for "Coba kirim lagi"
      deleteLocalFile(uri);
      const next = markDone(session, clip.key);
      await saveSession(next);
      setSession(next);
      setLastSaved(res.clip_id);
      setUri(null);
      reset();
      if (isComplete(next)) setStage('complete');
    },
    [api, session, uri, run, reset],
  );

  if (!DATASET_MODE) {
    return (
      <Screen>
        <InfoNote tone="warning" text="Mode Dataset tidak aktif." />
      </Screen>
    );
  }

  if (stage === 'loading') {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.text} />
      </Screen>
    );
  }

  if (stage === 'resume' && session) {
    return (
      <Screen>
        <Title>Sesi belum selesai</Title>
        <Card>
          <Body>
            Penutur {session.speaker_id} · {session.done.length} dari {session.clips.length} klip tersimpan
          </Body>
          <Body muted>Sesi: {session.session_id}</Body>
        </Card>
        <BigButton label="Lanjutkan sesi" icon="play" onPress={() => setStage('clip')} />
        <BigButton label="Mulai sesi baru" icon="refresh" variant="secondary" onPress={discardAndRestart} />
      </Screen>
    );
  }

  if (stage === 'form') {
    return (
      <Screen>
        <Title>Sesi baru</Title>
        <OptionGroup
          label="Kode penutur"
          options={SPEAKER_IDS.map((id) => ({ value: id, label: id }))}
          value={speaker}
          onChange={setSpeaker}
        />
        <OptionGroup label="Kondisi ruangan" options={CONDITIONS} value={condition} onChange={setCondition} />
        <Body muted>Perangkat: {device ?? 'tidak diketahui'}</Body>
        <InfoNote text="27 klip, ±6 menit. Urutan di dalam setiap blok diacak. Tekan Ulang bila salah ucap." />
        <BigButton label="Mulai sesi" icon="arrow-forward" disabled={!speaker} onPress={start} />
      </Screen>
    );
  }

  if (stage === 'complete' && session) {
    return (
      <Screen>
        <Title>Sesi selesai</Title>
        <Card>
          <Body>
            ✓ {session.done.length} dari {session.clips.length} klip tersimpan di laptop.
          </Body>
          <Body muted>Penutur {session.speaker_id} · sesi {session.session_id}</Body>
        </Card>
        <BigButton
          label="Selesai"
          icon="checkmark"
          onPress={async () => {
            await clearSession();
            router.back();
          }}
        />
      </Screen>
    );
  }

  if (!session) return null;
  const index = nextClipIndex(session);
  if (index === -1) return null;
  const clip = session.clips[index];
  const uploading = upload.status === 'uploading';
  const intended = clip.intended_error !== 'none';

  return (
    <Screen>
      <StepHeader
        step={session.done.length + 1}
        total={session.clips.length}
        title={`Blok ${clip.block}: ${BLOCK_NAMES[clip.block]}`}
      />
      {lastSaved ? <Text style={styles.saved}>✓ Klip sebelumnya tersimpan</Text> : null}

      <Card>
        <Text style={styles.target} accessibilityLabel={`Ucapkan ${itemText(clip.item_id)}`}>
          {itemText(clip.item_id)}
        </Text>
        <Text style={styles.meta}>
          {clip.block === 'B' ? `Ulangan ${clip.rep} dari 2 · ` : ''}
          Kondisi: {clip.condition === 'noisy' ? 'Bising' : 'Tenang'}
        </Text>
      </Card>
      <InfoNote tone={intended ? 'warning' : 'info'} text={clip.instruction} />

      {!uri ? (
        <RecordPanel key={clip.key} durationMs={clip.durationMs} onRecorded={setUri} />
      ) : (
        <View style={styles.gap}>
          <ClipPreview uri={uri} />
          <UploadStatus state={upload} onRetry={() => save(clip)} describeError={describeDatasetError} />
          {upload.status !== 'error' ? (
            <BigButton label="Simpan" icon="cloud-upload" disabled={uploading} onPress={() => save(clip)} />
          ) : null}
          <BigButton label="Ulang rekam" icon="refresh" variant="secondary" disabled={uploading} onPress={retake} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  target: { fontSize: fontSize.hero, fontWeight: '700', color: colors.text, textAlign: 'center' },
  meta: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  saved: { fontSize: fontSize.body, fontWeight: '700', color: colors.success },
  gap: { gap: spacing.sm },
});
