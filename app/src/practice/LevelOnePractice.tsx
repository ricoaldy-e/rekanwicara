import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import type { V2AnalyzeResponse, V2ItemDetail } from '../api/types';
import { ApiError } from '../api/apiError';
import { getCompanionSession } from '../auth/companion';
import { BigButton, Body, InfoNote, Screen, StepHeader } from '../components';
import { UploadStatus } from '../components/UploadStatus';
import { deleteLocalFile, videoUpload } from '../recording/localFile';
import { DEFAULT_DURATION_MS } from '../recording/recorder';
import { RecordPanel } from '../recording/RecordPanel';
import { useUpload } from '../recording/useUpload';
import { V2ResultView } from '../results/V2ResultView';
import { useSettings } from '../state/settings';
import { SESSION_ID, useUser } from '../state/user';
import { attemptFromV2Response } from '../user/pure';
import { TutorialVideo } from './TutorialVideo';

export function LevelOnePractice({ itemId, ownerId }: { itemId: string; ownerId: string }) {
  const { api } = useSettings();
  const { addAttempt, sync, syncNow } = useUser();
  const router = useRouter();
  const [material, setMaterial] = useState<V2ItemDetail | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [stage, setStage] = useState<'look' | 'record' | 'send' | 'result'>('look');
  const [uri, setUri] = useState<string | null>(null);
  const [result, setResult] = useState<V2AnalyzeResponse | null>(null);
  const clip = useRef<string | null>(null);
  const active = useRef(true);
  const sending = useRef(false);
  const { state: upload, run, reset } = useUpload();
  useEffect(() => { active.current = true; return () => { active.current = false; deleteLocalFile(clip.current); }; }, []);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getCompanionSession();
      if (session?.user.id !== ownerId) throw new Error();
      const detail = await api.getV2Item(itemId, session.access_token);
      if (detail.level !== 1 || detail.id !== itemId || !detail.automatic_evaluation ||
        (await getCompanionSession())?.user.id !== ownerId) throw new Error();
      if (!cancelled) { setMaterial(detail); setError(false); }
    })().catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [api, itemId, ownerId, revision]);

  const discard = () => {
    deleteLocalFile(clip.current);
    clip.current = null;
    setUri(null);
    reset();
  };
  const send = async (file: string) => {
    if (sending.current) return;
    sending.current = true;
    setStage('send');
    try {
      const response = await run(async (options) => {
        const session = await getCompanionSession();
        if (session?.user.id !== ownerId) throw new Error('Sesi berubah. Silakan login kembali.');
        const value = await api.analyzeV2(itemId, SESSION_ID, videoUpload(file), session.access_token, options);
        if (value.level !== 1) throw new ApiError('parse', 'Invalid Level 1 evaluation');
        if ((await getCompanionSession())?.user.id !== ownerId) throw new Error('Sesi berubah. Silakan login kembali.');
        return value;
      });
      if (!response || !active.current) return;
      discard();
      const attempt = attemptFromV2Response(response, SESSION_ID);
      if (attempt) addAttempt(attempt);
      setResult(response);
      setStage('result');
    } finally { sending.current = false; }
  };
  if (!material) return <Screen>
    <Body>{error ? 'Materi belum dapat dibuka. Periksa koneksi atau sesi login.' : 'Memuat latihan Level 1…'}</Body>
    {error ? <BigButton label="Coba buka lagi" icon="refresh" onPress={() => { setError(false); setRevision((value) => value + 1); }} /> : null}
  </Screen>;
  return <Screen>
    <StepHeader step={stage === 'look' ? 1 : stage === 'result' ? 3 : 2} total={3}
      title={stage === 'look' ? 'Lihat' : stage === 'result' ? 'Hasil latihan' : 'Tiru'} />
    <Body>Level 1 · {material.text}</Body>
    {stage === 'look' ? <>
      <Body>{material.instruction}</Body>
      <TutorialVideo key={material.id} ownerId={ownerId} video={material.videos.find((video) => video.available)} />
      <BigButton label="Mulai rekam" icon="videocam" onPress={() => setStage('record')} />
    </> : null}
    {stage === 'record' ? <>
      <Body>{material.instruction}</Body>
      <RecordPanel durationMs={itemId === 'l0_hold_a' || itemId === 'l0_soft_loud' ? 4000 : DEFAULT_DURATION_MS}
        hint="Wajah di dalam oval. Mulai bicara setelah tulisan MEREKAM muncul."
        onRecorded={(file) => {
          if (!active.current) { deleteLocalFile(file); return; }
          clip.current = file; setUri(file); void send(file);
        }} />
      <BigButton label="Lihat contoh lagi" variant="secondary" onPress={() => setStage('look')} />
    </> : null}
    {stage === 'send' ? <>
      <UploadStatus state={upload} onRetry={() => { if (uri) void send(uri); }} />
      {upload.status === 'error' ? <BigButton label="Rekam ulang" variant="secondary" onPress={() => { discard(); setStage('record'); }} />
        : <Body muted>Menilai rekamanmu…</Body>}
    </> : null}
    {stage === 'result' && result ? <>
      <V2ResultView result={result} target={itemId === 'l1_m' ? 'm_hum' : material.text.toLowerCase()} />
      {sync?.pending > 0 ? <InfoNote text="Sinkronisasi hasil belum selesai. Hasil yang tersimpan di perangkat akan dicoba kirim lagi saat koneksi tersedia." /> : null}
      {sync?.lastError ? <BigButton label="Coba sinkronkan hasil" icon="refresh" variant="secondary" onPress={() => void syncNow()} /> : null}
      <BigButton label="Ulangi" icon="refresh" onPress={() => { setResult(null); setStage('record'); }} />
      <BigButton label="Lihat contoh lagi" variant="secondary" onPress={() => { setResult(null); setStage('look'); }} />
      <BigButton label="Selesai" variant="secondary" onPress={() => router.back()} />
    </> : null}
  </Screen>;
}
