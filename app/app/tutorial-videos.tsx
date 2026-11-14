import { usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../src/api/apiError';
import { errorMessage } from '../src/api/errors';
import type { TutorialItem, TutorialsResponse } from '../src/api/types';
import { getCompanionSession } from '../src/auth/companion';
import { CompanionLogin } from '../src/auth/CompanionLogin';
import { BigButton, Body, Card, InfoNote, Screen, Title } from '../src/components';
import { UploadStatus } from '../src/components/UploadStatus';
import { ClipPreview } from '../src/recording/ClipPreview';
import { deleteLocalFile, videoUpload } from '../src/recording/localFile';
import { RecordPanel } from '../src/recording/RecordPanel';
import { useUpload } from '../src/recording/useUpload';
import { useSettings } from '../src/state/settings';
import { useUser } from '../src/state/user';
import { colors, fontSize, spacing } from '../src/theme';

function describeError(error: unknown): string {
  if (error instanceof ApiError && error.kind === 'http' && error.code?.startsWith('tutorial_')) return error.message;
  if (error instanceof ApiError && error.status === 401) return 'Sesi berakhir. Login kembali melalui Mode Pendamping.';
  return errorMessage(error);
}

async function accessToken(): Promise<string> {
  const session = await getCompanionSession();
  if (!session) throw new ApiError('http', 'Login diperlukan.', 401);
  return session.access_token;
}

export default function TutorialVideos() {
  const { session } = useUser();
  const [group, setGroup] = useState<'important_words' | 'level_1'>('level_1');
  if (!session) return <CompanionLogin />;
  return <Recorder key={`${session.user.id}:${group}`} group={group} onGroupChange={setGroup} />;
}

function Recorder({ group, onGroupChange }: {
  group: 'important_words' | 'level_1';
  onGroupChange(group: 'important_words' | 'level_1'): void;
}) {
  const { api } = useSettings();
  const vowels = group === 'level_1';
  const backLabel = vowels ? 'Kembali ke 5 vokal' : 'Kembali ke 24 video';
  const [data, setData] = useState<TutorialsResponse | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<TutorialItem | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const { state: upload, run, reset } = useUpload();
  const active = useRef(true);
  const uriRef = useRef(uri);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; deleteLocalFile(uriRef.current); };
  }, []);

  const refresh = useCallback(() => accessToken().then((token) => api.getTutorials(token, group))
    .then((result) => { if (active.current) { setData(result); setError(null); } })
    .catch((reason: unknown) => { if (active.current) setError(reason); })
    .finally(() => { if (active.current) setChecking(false); }), [api, group]);
  useEffect(() => { void refresh(); }, [refresh]);

  const clearClip = () => {
    deleteLocalFile(uriRef.current);
    uriRef.current = null;
    setUri(null);
    reset();
  };
  const close = () => { clearClip(); setSelected(null); };
  usePreventRemove(Boolean(selected), ({ repeat }) => {
    if (upload.status === 'uploading') {
      Alert.alert('Upload sedang berjalan', 'Tunggu hasil verifikasi sebelum meninggalkan layar.');
      return;
    }
    Alert.alert('Keluar dari perekam?', 'Rekaman yang belum diunggah akan dibuang.', [
      { text: 'Tetap di sini', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => { close(); repeat(); } },
    ]);
  });
  const back = () => {
    if (!uri) { close(); return; }
    Alert.alert('Buang rekaman ini?', 'Video ini belum diunggah. Tetap di sini untuk mengunggahnya.', [
      { text: 'Tetap di sini', style: 'cancel' },
      { text: 'Buang rekaman', style: 'destructive', onPress: close },
    ]);
  };

  const save = async (file = uri) => {
    if (!file || !selected || upload.status === 'uploading') return;
    const result = await run(async (opts) => api.uploadTutorial(selected, await accessToken(), videoUpload(file), opts));
    if (!result || !active.current) return;
    setData((previous) => previous && ({ ...previous,
      items: previous.items.map((item) => item.item_id === result.item_id ? { ...item, present: true } : item),
    }));
    clearClip();
    setSelected(null);
  };

  if (selected && data) {
    const uploading = upload.status === 'uploading';
    return <Screen>
      <Title>{selected.target}</Title>
      <Body>{selected.kind === 'vowel' ? 'Vokal Level 1' : selected.kind === 'word' ? 'Kata lengkap' : `Suku kata ${selected.position}`} · {selected.word}</Body>
      {selected.present ? <>
        <InfoNote text="Video sudah ada di Storage. Video yang sudah tersimpan tidak ditimpa dari menu ini." />
        <BigButton label={backLabel} icon="list" onPress={close} />
      </> : <>
        <Body muted>HP tegak, kamera sejajar mata. Cahaya dari depan; wajah, bibir, leher dan tangan terlihat. Peragakan langkah tanpa membacakan instruksi.</Body>
        <View style={styles.steps}>
          <Body>Langkah {step + 1} dari {selected.steps.length}</Body>
          <Text style={styles.instruction}>{selected.steps[step]}</Text>
          <View style={styles.row}>
            <View style={styles.flex}><BigButton label="Sebelumnya" icon="chevron-back" variant="secondary" disabled={step === 0} onPress={() => setStep(step - 1)} /></View>
            <View style={styles.flex}><BigButton label="Berikutnya" icon="chevron-forward" variant="secondary" disabled={step === selected.steps.length - 1} onPress={() => setStep(step + 1)} /></View>
          </View>
        </View>
        {!uri ? <RecordPanel key={selected.item_id} durationMs={data.max_duration_s * 1000} manualStop videoQuality="1080p"
          recordLabel="Mulai rekam tutorial" permissionPurpose={vowels ? 'Rekam tutorial vokal tim beserta suara. Setelah selesai merekam, video otomatis diunggah ke Storage privat.' : 'Rekam tutorial tim beserta suara untuk disimpan di Storage setelah Anda menyetujui hasilnya.'}
          hint={`Peragakan semua langkah. Tekan Selesai rekam setelah selesai; batas ${data.max_duration_s} detik dan ${data.max_upload_mb} MB.`}
          onRecorded={(clip) => { uriRef.current = clip; setUri(clip); if (vowels) void save(clip); }} /> : <>
          <ClipPreview uri={uri} />
          <InfoNote text={vowels ? 'Video otomatis diunggah setelah rekaman selesai. Tunggu verifikasi; jika gagal, coba kirim lagi sebelum meninggalkan layar.' : 'Periksa suara dan gerak bibir. Unggah sebelum meninggalkan layar. Rekaman yang belum diunggah masih berada di cache HP.'} />
          <UploadStatus state={upload} onRetry={() => void save()} describeError={describeError} />
          {upload.status !== 'error' ? <BigButton label="Unggah ke Storage" icon="cloud-upload" disabled={uploading} onPress={() => void save()} /> : null}
          <BigButton label="Rekam ulang" icon="refresh" variant="secondary" disabled={uploading} onPress={() => { clearClip(); setStep(0); }} />
        </>}
        <BigButton label={backLabel} icon="list" variant="secondary" disabled={uploading} onPress={back} />
      </>}
    </Screen>;
  }
  return <Screen>
    <Title>Rekam Tutorial</Title>
    <BigButton label="Vokal Level 1" icon="videocam" variant={vowels ? 'primary' : 'secondary'} disabled={vowels} onPress={() => onGroupChange('level_1')} />
    <BigButton label="Kata Penting (24 video)" icon="list" variant={vowels ? 'secondary' : 'primary'} disabled={!vowels} onPress={() => onGroupChange('important_words')} />
    <Body>{vowels ? 'Rekam A, I, U, E, dan O. Selesai merekam langsung mengunggah video ke Storage privat.' : '8 kata lengkap dan 16 suku kata. Satu rekaman untuk setiap target.'}</Body>
    {data ? <Body>{data.items.filter((item) => item.present).length} dari {data.items.length} video tersimpan di Storage.</Body> : null}
    {error ? <InfoNote tone="warning" text={describeError(error)} /> : null}
    <BigButton label={checking ? 'Memeriksa Storage…' : 'Periksa ulang Storage'} icon="refresh" variant="secondary" disabled={checking} onPress={() => { setChecking(true); void refresh(); }} />
    {data?.items.map((item) => <Card key={item.item_id} onPress={() => { setSelected(item); setStep(0); }}
      accessibilityLabel={`${item.word}, ${item.target}, ${item.present ? 'tersimpan' : 'belum direkam'}`} accessibilityHint="Buka panduan dan perekam">
      <Text style={styles.target}>{item.target}</Text>
      <Body>{item.word} · {item.kind === 'vowel' ? 'Vokal Level 1' : item.kind === 'word' ? 'Kata lengkap' : `Suku kata ${item.position}`}</Body>
      <InfoNote text={item.present ? 'Tersimpan di Storage' : 'Belum tersimpan'} />
    </Card>)}
  </Screen>;
}

const styles = StyleSheet.create({
  target: { fontSize: fontSize.large, fontWeight: '800', color: colors.text },
  instruction: { fontSize: fontSize.large, color: colors.text },
  steps: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
