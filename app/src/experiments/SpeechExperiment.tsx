import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { ApiError } from '../api/apiError';
import { errorMessage } from '../api/errors';
import type { CombinedResponse, Wav2Vec2Response } from '../api/types';
import { BigButton, Body, Card, InfoNote, Screen, Title } from '../components';
import { OptionGroup } from '../components/OptionGroup';
import { UploadStatus } from '../components/UploadStatus';
import { COMMUNICATION_TARGETS, matchesTarget, type CommunicationTarget } from '../content/communication';
import { deleteLocalFile, videoUpload } from '../recording/localFile';
import { RecordPanel } from '../recording/RecordPanel';
import { useUpload } from '../recording/useUpload';
import { useSettings } from '../state/settings';
import { colors, fontSize } from '../theme';
import { CombinedObservations } from './CombinedObservations';

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Eksperimen belum aktif di laptop. Jalankan server dengan DEBUG=true.';
    if (error.code === 'wav2vec2_unavailable') return 'Wav2Vec2 belum siap di laptop. Periksa setup model eksperimen.';
    if (error.code === 'audio_missing') return 'Rekaman tidak memiliki suara. Periksa izin mikrofon, lalu rekam lagi.';
    if (error.code === 'audio_too_long') return 'Rekaman terlalu panjang. Coba rekam kata atau frasa sekali lagi.';
  }
  return errorMessage(error);
}

export function SpeechExperiment({ combined = false }: { combined?: boolean }) {
  const { api } = useSettings();
  const { state: upload, run, reset } = useUpload();
  const [target, setTarget] = useState<CommunicationTarget>('tolong');
  const [mode, setMode] = useState<'choose' | 'record' | 'result'>('choose');
  const [result, setResult] = useState<Wav2Vec2Response | CombinedResponse | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const mounted = useRef(true);
  const active = useRef<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      deleteLocalFile(active.current);
      active.current = null;
    };
  }, []);

  async function analyze(uri: string) {
    if (!mounted.current || active.current !== null) {
      if (active.current !== uri) deleteLocalFile(uri);
      return;
    }
    active.current = uri;
    setMode('result');
    const start = Date.now();
    try {
      const response = await run<Wav2Vec2Response | CombinedResponse>((options) =>
        combined ? api.combined(videoUpload(uri), target, options) : api.wav2vec2(videoUpload(uri), options));
      if (mounted.current && response) {
        setElapsedMs(Date.now() - start);
        setResult(response);
      }
    } finally {
      deleteLocalFile(uri);
      if (active.current === uri) active.current = null;
    }
  }

  function restart(next: 'choose' | 'record') {
    reset();
    setResult(null);
    setElapsedMs(null);
    setMode(next);
  }

  if (!__DEV__) {
    return <Screen><InfoNote text="Uji ucapan hanya tersedia pada versi pengembangan." /></Screen>;
  }

  const targetLabel = COMMUNICATION_TARGETS.find((item) => item.value === target)!.label;
  const asr = result && ('asr' in result ? result.asr.status === 'success' ? result.asr : null : result);
  const empty = asr?.transcription.trim() === '';

  return (
    <Screen>
      <Stack.Screen options={{ title: combined ? 'Uji Gabungan' : 'Uji Wav2Vec2' }} />
      <Title>Latihan kata sehari-hari</Title>
      <Body>Pilih kata atau frasa, lalu rekam ucapanmu dan lihat teks yang terbaca.</Body>
      <InfoNote text={combined ? 'Video dan suara dikirim ke laptop. MediaPipe memeriksa indikasi berbicara; Wav2Vec2 membaca ucapan. Berhasil memerlukan keduanya lulus. Mendekati berarti teks yang terbaca mirip target, bukan nilai pelafalan. Hasil tidak disimpan sebagai progres latihan.' : 'Eksperimen ini membandingkan teks, belum menilai ketepatan tiap bunyi. Video dan suara dikirim ke laptop; hanya suara yang dianalisis. Hasil tidak disimpan sebagai progres latihan.'} />
      {mode === 'choose' ? (
        <>
          <OptionGroup label="Pilih target latihan" options={COMMUNICATION_TARGETS} value={target} onChange={setTarget} />
          <BigButton label="Latih kata ini" icon="arrow-forward" onPress={() => setMode('record')} />
        </>
      ) : (
        <>
          <Body muted>Target latihan</Body>
          <Text accessibilityLabel={`Target latihan: ${targetLabel}`} style={{ fontSize: fontSize.display, fontWeight: '700', color: colors.text }}>{targetLabel}</Text>
        </>
      )}
      {mode === 'record' ? (
        <RecordPanel recordLabel="Rekam ucapan" hint={`Ucapkan “${targetLabel}” setelah indikator merekam muncul.`} onRecorded={analyze} />
      ) : null}
      {upload.status === 'uploading' ? (
        <>
          <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Membaca ucapan" />
          <UploadStatus state={upload} />
          <Body muted>Ucapan sedang diproses di laptop. Tunggu sebentar…</Body>
        </>
      ) : null}
      {upload.status === 'error' ? <UploadStatus state={upload} describeError={describeError} /> : null}
      {result ? (
        <Card>
          <Title>Teks yang terbaca</Title>
          {!asr ? (
            <InfoNote tone="warning" text="Teks belum tersedia karena pembacaan ucapan gagal. Pengamatan lain tetap ditampilkan; coba rekam lagi." />
          ) : empty ? (
            <InfoNote tone="warning" text="Belum ada teks yang terbaca. Coba rekam lagi di tempat tenang." />
          ) : (
            <>
              <Text selectable accessibilityLabel={`Teks yang terbaca: ${asr.transcription}`} style={{ fontSize: fontSize.display, color: colors.text }}>{asr.transcription}</Text>
              {!combined ? <InfoNote
                tone={matchesTarget(asr.transcription, target) ? 'info' : 'warning'}
                text={matchesTarget(asr.transcription, target) ? 'Teks cocok dengan target.' : 'Teks belum cocok dengan target. Coba lagi; pembacaan otomatis juga bisa keliru.'}
              /> : null}
            </>
          )}
          {asr ? <Body muted>Waktu inferensi: {Math.round(asr.inference_ms)} ms</Body> : null}
          <Body muted>Kecocokan teks belum membuktikan ketepatan pelafalan. Pembacaan untuk pengguna Tuli masih perlu diuji.</Body>
        </Card>
      ) : null}
      {result && 'asr' in result ? <CombinedObservations result={result} /> : null}
      {elapsedMs !== null ? <Body muted>Waktu kirim dan proses: {(elapsedMs / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} detik.</Body> : null}
      {mode !== 'choose' && upload.status !== 'uploading' ? (
        <>
          {mode === 'result' ? <BigButton label="Rekam lagi" icon="refresh" onPress={() => restart('record')} /> : null}
          <BigButton label="Pilih kata lain" icon="list" variant="secondary" onPress={() => restart('choose')} />
        </>
      ) : null}
    </Screen>
  );
}
