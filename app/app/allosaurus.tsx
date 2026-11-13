import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';

import { ApiError } from '../src/api/apiError';
import { errorMessage } from '../src/api/errors';
import type { AllosaurusResponse } from '../src/api/types';
import { BigButton, Body, Card, InfoNote, Screen, Title } from '../src/components';
import { UploadStatus } from '../src/components/UploadStatus';
import { readableIndonesianPhones } from '../src/content/phonetics';
import { deleteLocalFile, videoUpload } from '../src/recording/localFile';
import { RecordPanel } from '../src/recording/RecordPanel';
import { useUpload } from '../src/recording/useUpload';
import { useSettings } from '../src/state/settings';
import { colors, fontSize } from '../src/theme';

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'Eksperimen belum aktif di laptop. Jalankan server dengan DEBUG=true.';
    if (error.code === 'allosaurus_unavailable') return 'Allosaurus belum siap di laptop. Periksa venv eksperimen dan model uni2005.';
    if (error.code === 'audio_missing') return 'Rekaman tidak memiliki suara. Periksa izin mikrofon, lalu rekam lagi.';
    if (error.code === 'audio_too_long') return 'Rekaman terlalu panjang. Coba rekam satu kata lagi.';
  }
  return errorMessage(error);
}

export default function Allosaurus() {
  const { api } = useSettings();
  const { state: upload, run, reset } = useUpload();
  const [recording, setRecording] = useState(true);
  const [result, setResult] = useState<AllosaurusResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);
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
    setRecording(false);
    try {
      const response = await run((options) => api.allosaurus(videoUpload(uri), options));
      if (mounted.current && response) setResult(response);
    } finally {
      deleteLocalFile(uri);
      if (active.current === uri) active.current = null;
    }
  }

  function recordAgain() {
    reset();
    setResult(null);
    setShowDetail(false);
    setRecording(true);
  }

  if (!__DEV__) {
    return <Screen><InfoNote text="Uji Allosaurus hanya tersedia pada versi pengembangan." /></Screen>;
  }

  const letters = result ? readableIndonesianPhones(result.phonetic_prediction) : '';

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Uji Allosaurus' }} />
      <Title>Uji bunyi ucapan</Title>
      <Body>Ucapkan satu kata, misalnya “mama”. Setelah merekam, prediksi bunyi akan muncul di sini.</Body>
      <InfoNote text="Video dan suara dikirim ke laptop; hanya suara yang dianalisis. Eksperimen ini tidak memberi nilai pelafalan atau menyimpan progres latihan." />
      {recording ? (
        <RecordPanel recordLabel="Rekam ucapan" hint="Ucapkan satu kata dengan nyaman saat indikator merekam muncul." onRecorded={analyze} />
      ) : null}
      {upload.status === 'uploading' ? (
        <>
          <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memproses bunyi ucapan" />
          <UploadStatus state={upload} />
          <Body muted>Allosaurus memproses bunyi di laptop. Tunggu sebentar…</Body>
        </>
      ) : null}
      {upload.status === 'error' ? <UploadStatus state={upload} describeError={describeError} /> : null}
      {result ? (
        <Card>
          <Title>Prediksi bunyi</Title>
          <Body muted>Tampilan huruf bunyi Bahasa Indonesia, bukan ejaan kata.</Body>
          {letters === '' ? (
            <InfoNote text="Belum ada bunyi yang diprediksi. Coba ucapkan satu kata lagi di tempat tenang." />
          ) : (
            <Text selectable accessibilityLabel={`Prediksi bunyi: ${letters}`} style={{ fontSize: fontSize.display, color: colors.text }}>{letters}</Text>
          )}
          {letters !== '' ? (
            <>
              <BigButton label={showDetail ? 'Tutup detail' : 'Lihat detail'} icon="information-circle" variant="secondary" onPress={() => setShowDetail((value) => !value)} />
              {showDetail ? (
                <>
                  <Body muted>Simbol IPA asli</Body>
                  <Text selectable style={{ fontSize: fontSize.body, color: colors.text }}>{result.phonetic_prediction}</Text>
                  <Body muted>Beberapa bunyi ditampilkan dengan huruf yang sama, misalnya e pepet dan e taling. Henti glotal berarti penutupan singkat di tenggorokan.</Body>
                </>
              ) : null}
            </>
          ) : null}
          <Body muted>Waktu inferensi: {Math.round(result.inference_ms)} ms</Body>
          <Body muted>Hasil ini perkiraan bunyi, bukan nilai ketepatan pelafalan.</Body>
        </Card>
      ) : null}
      {!recording && upload.status !== 'uploading' ? (
        <BigButton label="Rekam lagi" icon="refresh" onPress={recordAgain} />
      ) : null}
    </Screen>
  );
}
