import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../src/api/errors';
import { BigButton, Body, Card, InfoNote, Screen, Title } from '../../src/components';
import { OptionGroup } from '../../src/components/OptionGroup';
import { UploadStatus } from '../../src/components/UploadStatus';
import { DATASET_MODE } from '../../src/config';
import { deviceLabel } from '../../src/dataset/device';
import { describeDatasetError } from '../../src/dataset/errors';
import { MODEL_VIDEOS, type ModelVideoSpec } from '../../src/dataset/modelVideos';
import { SPEAKER_IDS, type SpeakerId } from '../../src/dataset/script';
import { makeSessionId } from '../../src/dataset/session';
import { ClipPreview } from '../../src/recording/ClipPreview';
import { deleteLocalFile, videoUpload } from '../../src/recording/localFile';
import { RecordPanel } from '../../src/recording/RecordPanel';
import { useUpload } from '../../src/recording/useUpload';
import { useSettings } from '../../src/state/settings';
import { colors, fontSize, iconSize, spacing } from '../../src/theme';

type Presence = 'yes' | 'no' | 'unknown';

/** SPEC §10.4: record one model video per item (purpose=model_video; the server overwrites). */
export default function ModelVideosScreen() {
  const { api } = useSettings();
  const [speaker, setSpeaker] = useState<SpeakerId>('P1');
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [checkError, setCheckError] = useState<unknown>(null);
  const [selected, setSelected] = useState<ModelVideoSpec | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const { state: upload, run, reset } = useUpload();
  const sessionId = useRef(`model_${makeSessionId('P1')}`).current;
  const device = useRef(deviceLabel()).current;

  const uriRef = useRef<string | null>(null);
  uriRef.current = uri;
  useEffect(() => () => deleteLocalFile(uriRef.current), []);

  const refresh = useCallback(async () => {
    setCheckError(null);
    const results = await Promise.allSettled(MODEL_VIDEOS.map((m) => api.hasModelVideo(m.item_id)));
    const next: Record<string, Presence> = {};
    results.forEach((r, i) => {
      next[MODEL_VIDEOS[i].item_id] = r.status === 'fulfilled' ? (r.value ? 'yes' : 'no') : 'unknown';
    });
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failed) setCheckError(failed.reason);
    setPresence(next);
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const closeRecorder = useCallback(() => {
    deleteLocalFile(uri);
    setUri(null);
    setSelected(null);
    reset();
  }, [uri, reset]);

  const save = useCallback(async () => {
    if (!selected || !uri) return;
    const res = await run((opts) =>
      api.datasetUpload(
        {
          file: videoUpload(uri, `model_${selected.item_id}.mp4`),
          purpose: 'model_video',
          speaker_id: speaker,
          item_id: selected.item_id,
          rep: 1,
          intended_error: 'none',
          condition: 'quiet',
          session_id: sessionId,
          device,
        },
        opts,
      ),
    );
    if (!res) return;
    deleteLocalFile(uri);
    setPresence((p) => ({ ...p, [selected.item_id]: 'yes' }));
    setUri(null);
    setSelected(null);
    reset();
  }, [api, selected, uri, run, reset, speaker, sessionId, device]);

  if (!DATASET_MODE) {
    return (
      <Screen>
        <InfoNote tone="warning" text="Mode Dataset tidak aktif." />
      </Screen>
    );
  }

  if (selected) {
    const exists = presence[selected.item_id] === 'yes';
    const uploading = upload.status === 'uploading';
    return (
      <Screen>
        <Card>
          <Text style={styles.target}>{selected.text}</Text>
          <Text style={styles.meta}>Video model · penutur {speaker}</Text>
        </Card>
        <InfoNote text="Ucapkan sekali dengan jelas dan gerak bibir yang tegas. Wajah lurus ke kamera, cahaya terang." />
        {exists ? <InfoNote tone="warning" text="Video untuk materi ini sudah ada. Menyimpan akan menimpanya." /> : null}
        {!uri ? (
          <RecordPanel key={selected.item_id} durationMs={selected.durationMs} onRecorded={setUri} />
        ) : (
          <View style={styles.gap}>
            <ClipPreview uri={uri} />
            <UploadStatus state={upload} onRetry={save} describeError={describeDatasetError} />
            {upload.status !== 'error' ? (
              <BigButton label="Simpan video model" icon="cloud-upload" disabled={uploading} onPress={save} />
            ) : null}
            <BigButton
              label="Ulang rekam"
              icon="refresh"
              variant="secondary"
              disabled={uploading}
              onPress={() => {
                deleteLocalFile(uri);
                setUri(null);
                reset();
              }}
            />
          </View>
        )}
        <BigButton label="Kembali ke daftar" icon="list" variant="secondary" disabled={uploading} onPress={closeRecorder} />
      </Screen>
    );
  }

  const doneCount = MODEL_VIDEOS.filter((m) => presence[m.item_id] === 'yes').length;

  return (
    <Screen>
      <Title>Video model</Title>
      <Body muted>
        {doneCount} dari {MODEL_VIDEOS.length} sudah ada di server. Rekam satu kali per materi.
      </Body>
      <OptionGroup
        label="Penutur video model"
        options={SPEAKER_IDS.map((id) => ({ value: id, label: id }))}
        value={speaker}
        onChange={setSpeaker}
      />
      {checkError ? <InfoNote tone="warning" text={errorMessage(checkError)} /> : null}
      <BigButton label="Periksa ulang" icon="refresh" variant="secondary" onPress={refresh} />
      {MODEL_VIDEOS.map((m) => {
        const p = presence[m.item_id] ?? 'unknown';
        return (
          <Card
            key={m.item_id}
            onPress={() => setSelected(m)}
            accessibilityLabel={`${m.text}: ${p === 'yes' ? 'sudah ada' : p === 'no' ? 'belum ada' : 'belum diketahui'}`}
            accessibilityHint="Buka perekam"
          >
            <View style={styles.row}>
              <Ionicons
                name={p === 'yes' ? 'checkmark-circle' : p === 'no' ? 'ellipse-outline' : 'help-circle-outline'}
                size={iconSize.status}
                color={p === 'yes' ? colors.success : colors.textMuted}
              />
              <Text style={styles.item}>{m.text}</Text>
              <Text style={styles.status}>{p === 'yes' ? 'Sudah ada' : p === 'no' ? 'Belum' : '?'}</Text>
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  target: { fontSize: fontSize.hero, fontWeight: '700', color: colors.text, textAlign: 'center' },
  meta: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' },
  gap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  item: { flex: 1, fontSize: fontSize.large, fontWeight: '700', color: colors.text },
  status: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
});
