import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import type { CustomWordDetail, CustomWordList } from '../api/types';
import { BigButton, Body, Card, InfoNote, Screen, Title } from '../components';
import { ClipPreview } from '../recording/ClipPreview';
import { deleteLocalFile } from '../recording/localFile';
import { RecordPanel } from '../recording/RecordPanel';
import { useSettings } from '../state/settings';
import { colors, fontSize, radius, spacing, touchTarget } from '../theme';
import { makeUuid } from '../user/pure';
import { editWord, manualError, newWord, ownerToken, readyWord, saveWord, validateRecording, type EditorWord } from './service';
import { VideoPreview } from './VideoPreview';

interface Recording { id: string; target: string; uri: string | null }

function Field({ label, value, onChange, multiline = false, disabled = false }: {
  label: string; value: string; onChange(value: string): void; multiline?: boolean; disabled?: boolean;
}) {
  return <View style={styles.field}>
    <Body>{label}</Body>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled}
      multiline={multiline} maxLength={multiline ? 8000 : 80} autoCapitalize={multiline ? 'sentences' : 'characters'}
      style={[styles.input, multiline && styles.multiline]} placeholderTextColor={colors.textMuted} />
  </View>;
}

/** Mounted only after the existing companion PIN; JWT remains the server authorization. */
export function ManualWords({ ownerId, onClose }: { ownerId: string; onClose(): void }) {
  const { api } = useSettings();
  const [data, setData] = useState<CustomWordList | null>(null);
  const [form, setForm] = useState<EditorWord | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [upload, setUpload] = useState<string | null>(null);
  const mounted = useRef(true);
  const localFiles = useRef(new Set<string>());

  useEffect(() => {
    const files = localFiles.current;
    mounted.current = true;
    return () => { mounted.current = false; files.forEach(deleteLocalFile); files.clear(); };
  }, []);

  const load = useCallback(() => ownerToken(ownerId)
    .then((token) => api.listCustomWords(token))
    .then((result) => { if (mounted.current) setData(result); })
    .catch((failure) => { if (mounted.current) setError(manualError(failure)); })
    .finally(() => { if (mounted.current) setLoading(false); }), [api, ownerId]);
  useEffect(() => { void load(); }, [load]);

  const discardFile = (uri: string | null) => {
    if (uri) { deleteLocalFile(uri); localFiles.current.delete(uri); }
  };
  const clearLocal = () => { localFiles.current.forEach(deleteLocalFile); localFiles.current.clear(); };
  const leaveEditor = () => {
    clearLocal(); setForm(null); setRecording(null); setError(null); void load();
  };
  const cancel = () => Alert.alert('Batalkan perubahan lokal?', 'Perubahan lokal akan dibuang. Kata yang sudah tercatat tetap tersedia pada daftar untuk dilanjutkan.', [
    { text: 'Tetap di sini', style: 'cancel' }, { text: 'Buang perubahan lokal', style: 'destructive', onPress: leaveEditor },
  ]);

  const open = async (id: string) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const detail = await api.getCustomWord(id, await ownerToken(ownerId));
      if (mounted.current) { clearLocal(); setForm(editWord(detail)); }
    } catch (failure) { if (mounted.current) setError(manualError(failure)); }
    finally { if (mounted.current) setBusy(false); }
  };

  const save = async () => {
    if (!form || !data || busy) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const result = await saveWord(api, ownerId, form, 'published', data, (draft) => {
        if (mounted.current) setForm((current) => current && ({ ...current, isNew: false, revision: draft.revision,
          status: 'draft', video: draft.video,
          syllables: current.syllables.map((part) => ({ ...part, video: draft.syllables.find((p) => p.id === part.id)?.video ?? null })) }));
      }, (current, total) => { if (mounted.current) setUpload(`Mengunggah rekaman ${current} dari ${total}…`); });
      if (mounted.current) {
        clearLocal(); setForm(editWord(result));
        setNotice(result.cleanup_pending ? 'Kata siap digunakan. Ada video lama yang masih perlu dibersihkan.'
          : 'Kata tersimpan dan tersedia di katalog akun ini.');
      }
    } catch (failure) { if (mounted.current) setError(manualError(failure)); }
    finally { if (mounted.current) { setBusy(false); setUpload(null); } }
  };

  const remove = (word: Pick<CustomWordDetail, 'id' | 'word' | 'revision'>) => Alert.alert(
    'Hapus kata?', `${word.word} beserta suku kata dan seluruh videonya akan dihapus.`, [
      { text: 'Batal', style: 'cancel' }, { text: 'Hapus kata', style: 'destructive', onPress: () => {
        setBusy(true); setError(null);
        void (async () => {
          try {
            const result = await api.deleteCustomWord(word.id, word.revision, await ownerToken(ownerId));
            if (mounted.current) {
              clearLocal(); setForm(null);
              setNotice(result.status === 'deleted' ? 'Kata dan video sudah dihapus.' : 'Kata ditarik dari katalog. Pembersihan video belum selesai; tekan Hapus kembali untuk melanjutkan.');
              await load();
            }
          } catch (failure) { if (mounted.current) setError(manualError(failure)); }
          finally { if (mounted.current) setBusy(false); }
        })();
      } },
    ],
  );

  const cleanup = async (word: Pick<CustomWordDetail, 'id'>) => {
    setBusy(true); setError(null);
    try {
      const result = await api.cleanupCustomWord(word.id, await ownerToken(ownerId));
      if (mounted.current) { setNotice(result.cleanup_pending ? 'Pembersihan belum berhasil. Periksa koneksi dan coba lagi.' : 'Video lama sudah dibersihkan.'); await load(); }
    } catch (failure) { if (mounted.current) setError(manualError(failure)); }
    finally { if (mounted.current) setBusy(false); }
  };

  if (recording && data) return <Screen>
    <Title>Rekam {recording.target || 'video tutorial'}</Title>
    <Body>Rekam pengucapan target ini saja. Wajah dan bibir terlihat jelas, dengan cahaya dari depan.</Body>
    {error ? <InfoNote tone="warning" text={error} /> : null}
    {!recording.uri ? <RecordPanel key={recording.id} manualStop videoQuality="1080p"
      durationMs={data.max_duration_s * 1000} permissionPurpose="Kamera dan mikrofon digunakan untuk merekam tutorial kata Anda."
      recordLabel="Mulai rekam tutorial" hint={`Tekan Selesai rekam saat selesai. Maksimal ${data.max_duration_s} detik dan ${data.max_upload_mb} MB.`}
      onRecorded={(uri) => {
        if (!mounted.current) { deleteLocalFile(uri); return; }
        localFiles.current.add(uri);
        try { validateRecording(uri, data.max_upload_mb); setRecording({ ...recording, uri }); setError(null); }
        catch (failure) { discardFile(uri); setError(manualError(failure)); setRecording({ ...recording }); }
      }} /> : <>
      <ClipPreview key={recording.uri} uri={recording.uri} />
      <BigButton label="Gunakan rekaman" icon="checkmark" onPress={() => {
        const uri = recording.uri;
        if (!uri) return;
        if (recording.id === form?.id) {
          discardFile(form.localUri); setForm({ ...form, localUri: uri });
        } else if (form) {
          discardFile(form.syllables.find((part) => part.id === recording.id)?.localUri ?? null);
          setForm({ ...form, syllables: form.syllables.map((part) => part.id === recording.id ? { ...part, localUri: uri } : part) });
        }
        setRecording(null); setError(null);
      }} />
      <BigButton label="Rekam ulang" icon="refresh" variant="secondary" onPress={() => { discardFile(recording.uri); setRecording({ ...recording, uri: null }); }} />
    </>}
    <BigButton label="Batal merekam" variant="secondary" onPress={() => { discardFile(recording.uri); setRecording(null); setError(null); }} />
  </Screen>;

  if (form) {
    const change = (values: Partial<EditorWord>) => setForm({ ...form, ...values });
    const startRecording = (id: string, target: string) => { setError(null); setRecording({ id, target, uri: null }); };
    return <Screen>
      <Title>{form.isNew ? 'Tambah Kata' : 'Edit Kata'}</Title>
      <InfoNote text={form.isNew ? 'Isi kata, instruksi, dan rekaman sebelum menyimpan.' : form.status === 'published' ? 'Siap digunakan di katalog.' : 'Belum siap digunakan. Lengkapi rekaman dan simpan kembali.'} />
      <Body muted>Suku kata boleh dikosongkan. Setiap bagian yang ditambahkan memerlukan instruksi dan video tersendiri.</Body>
      {error ? <InfoNote tone="warning" text={error} /> : null}
      {notice ? <InfoNote text={notice} /> : null}
      <Field label="Kata lengkap" value={form.word} disabled={busy} onChange={(word) => change({ word })} />
      <Text style={styles.heading}>Level 2 · Suku kata</Text>
      {form.syllables.length === 0 ? <InfoNote text="Tanpa suku kata: pengguna langsung ke kata lengkap." /> : null}
      {form.syllables.map((part, index) => <View key={part.id} style={styles.section}>
        <Text style={styles.heading}>Suku kata {index + 1}</Text>
        <Field label={`Teks suku kata ${index + 1}`} value={part.text} disabled={busy}
          onChange={(text) => change({ syllables: form.syllables.map((p) => p.id === part.id ? { ...p, text } : p) })} />
        <Field label={`Instruksi suku kata ${index + 1}`} value={part.instruction} multiline disabled={busy}
          onChange={(instruction) => change({ syllables: form.syllables.map((p) => p.id === part.id ? { ...p, instruction } : p) })} />
        <VideoPreview key={`${part.id}:${part.localUri ?? part.video?.path ?? ''}:${part.video?.available}`} ownerId={ownerId} video={part.video} localUri={part.localUri} />
        <BigButton label={`Rekam video ${part.text || `suku kata ${index + 1}`}`} icon="videocam" disabled={busy} onPress={() => startRecording(part.id, part.text)} />
        {part.video || part.localUri ? <BigButton label={`Hapus video suku kata ${index + 1}`} variant="secondary" disabled={busy} onPress={() => {
          discardFile(part.localUri); change({ syllables: form.syllables.map((p) => p.id === part.id ? { ...p, localUri: null, video: null } : p) });
        }} /> : null}
        <BigButton label={`Naikkan suku kata ${index + 1}`} icon="arrow-up" variant="secondary" disabled={busy || index === 0} onPress={() => {
          const parts = [...form.syllables]; [parts[index - 1], parts[index]] = [parts[index], parts[index - 1]]; change({ syllables: parts });
        }} />
        <BigButton label={`Turunkan suku kata ${index + 1}`} icon="arrow-down" variant="secondary" disabled={busy || index === form.syllables.length - 1} onPress={() => {
          const parts = [...form.syllables]; [parts[index], parts[index + 1]] = [parts[index + 1], parts[index]]; change({ syllables: parts });
        }} />
        <BigButton label={`Hapus suku kata ${index + 1}`} variant="secondary" disabled={busy} onPress={() => {
          discardFile(part.localUri); change({ syllables: form.syllables.filter((p) => p.id !== part.id) });
        }} />
      </View>)}
      <BigButton label="Tambah suku kata" icon="add" variant="secondary" disabled={busy || form.syllables.length >= 100}
        onPress={() => change({ syllables: [...form.syllables, { id: makeUuid(), text: '', instruction: '', video: null, localUri: null }] })} />
      <View style={styles.section}>
        <Text style={styles.heading}>Level 3 · {form.word || 'Kata lengkap'}</Text>
        <Field label="Instruksi kata lengkap" value={form.instruction} multiline disabled={busy} onChange={(instruction) => change({ instruction })} />
        <VideoPreview key={`${form.localUri ?? form.video?.path ?? ''}:${form.video?.available}`} ownerId={ownerId} video={form.video} localUri={form.localUri} />
        <BigButton label="Rekam video kata lengkap" icon="videocam" disabled={busy} onPress={() => startRecording(form.id, form.word)} />
        {form.video || form.localUri ? <BigButton label="Hapus video kata lengkap" variant="secondary" disabled={busy} onPress={() => { discardFile(form.localUri); change({ localUri: null, video: null }); }} /> : null}
      </View>
      <Body muted>Lengkapi semua instruksi dan rekaman, lalu tekan Simpan Kata. Kata langsung tersedia di katalog setelah berhasil disimpan.</Body>
      {upload ? <View accessibilityLiveRegion="polite"><Body>{upload}</Body></View> : null}
      <BigButton label={busy ? 'Menyimpan…' : 'Simpan Kata'} icon="save" disabled={busy || !readyWord(form)} onPress={() => void save()} />
      <BigButton label="Batal" variant="secondary" disabled={busy} onPress={cancel} />
      {!form.isNew ? <BigButton label="Muat ulang kata tersimpan" icon="refresh" variant="secondary" disabled={busy}
        onPress={() => Alert.alert('Muat ulang kata?', 'Perubahan lokal dan rekaman yang belum disimpan akan dibuang setelah versi tersimpan berhasil dimuat.', [
          { text: 'Batal', style: 'cancel' }, { text: 'Muat ulang', onPress: () => void open(form.id) },
        ])} /> : null}
      {!form.isNew && form.revision ? <BigButton label="Hapus Kata" icon="trash" variant="secondary" disabled={busy}
        onPress={() => remove({ id: form.id, word: form.word, revision: form.revision! })} /> : null}
    </Screen>;
  }

  return <Screen>
    <Title>Kata Manual</Title>
    <Body>Materi buatan Anda. Kata default tidak dapat diedit di sini.</Body>
    {notice ? <InfoNote text={notice} /> : null}
    {error ? <InfoNote tone="warning" text={error} /> : null}
    {loading ? <Body>Memuat kata…</Body> : <>
      <BigButton label="Tambah kata" icon="add" disabled={busy || !data} onPress={() => { setForm(newWord()); setError(null); setNotice(null); }} />
      {data?.words.length === 0 ? <InfoNote text="Belum ada kata buatan Anda. Tambahkan kata pertama." /> : null}
      {data?.words.map((word) => <Card key={word.id}>
        <Text style={styles.heading}>{word.word}</Text>
        <InfoNote text={word.status === 'published' ? 'Siap digunakan' : word.status === 'deleting' ? 'Menunggu penghapusan' : 'Perlu dilengkapi'} />
        <Body>{word.syllable_count} suku kata</Body>
        {word.status !== 'deleting' ? <BigButton label={`Lihat atau edit ${word.word}`} variant="secondary" disabled={busy} onPress={() => void open(word.id)} /> : null}
        {word.cleanup_pending && word.status !== 'deleting' ? <BigButton label={`Ulangi pembersihan ${word.word}`} variant="secondary" disabled={busy} onPress={() => void cleanup(word)} /> : null}
        <BigButton label={`${word.status === 'deleting' ? 'Lanjutkan hapus' : 'Hapus'} ${word.word}`} icon="trash" variant="secondary" disabled={busy} onPress={() => remove(word)} />
      </Card>)}
    </>}
    <BigButton label="Muat ulang daftar" icon="refresh" variant="secondary" disabled={loading || busy} onPress={() => { setLoading(true); setError(null); void load(); }} />
    <BigButton label="Kembali ke Pendamping" variant="secondary" disabled={busy} onPress={onClose} />
  </Screen>;
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: { minHeight: touchTarget, borderWidth: 3, borderColor: colors.border, borderRadius: radius.md,
    padding: spacing.md, color: colors.text, fontSize: fontSize.body },
  multiline: { minHeight: 144, textAlignVertical: 'top' },
  heading: { color: colors.text, fontSize: fontSize.large, fontWeight: '800' },
  section: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg, gap: spacing.md },
});
