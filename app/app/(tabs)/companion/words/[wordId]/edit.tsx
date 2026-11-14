import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '../../../../../src/auth/AuthProvider';
import { isSupabaseConfigured } from '../../../../../src/auth/supabase';
import { fromFormData, toFormData } from '../../../../../src/customWords/formAdapter';
import { cleanupPendingUploads, editWord, manualError, ownerToken, saveWord, type EditorWord } from '../../../../../src/customWords/service';
import type { CustomWordDetail } from '../../../../../src/api/types';
import { useFocusRing } from '../../../../../src/a11y/useFocusRing';
import { BigButton, ConfirmDialog, InfoNote, LoadingView } from '../../../../../src/components';
import { WordForm } from '../../../../../src/components/form/WordForm';
import { WordFormScreen } from '../../../../../src/components/form/WordFormScreen';
import { getWordStore } from '../../../../../src/data/media';
import { useCatalog } from '../../../../../src/data/useCatalog';
import { formDataOf, getRows, listMine, removeWord, updateWord, type WordRows } from '../../../../../src/data/words';
import { showFlash } from '../../../../../src/forms/flash';
import { fill, MESSAGES } from '../../../../../src/forms/messages';
import { useSettings } from '../../../../../src/state/settings';
import { colors, companion, fontSize, radius, stroke, textFont } from '../../../../../src/theme';

/**
 * PEN-3: edit a companion word. A built-in word has no way here: it is not in the companion's store.
 * "Hapus kata" sits under the form (design.md §6.6, Figma 61:833) and asks first; the list itself has no delete.
 */
export default function EditWord() {
  const router = useRouter();
  const { wordId } = useLocalSearchParams<{ wordId: string }>();
  const { api, apiUrl } = useSettings();
  const { uid, session } = useAuth();
  const catalog = useCatalog({ baseUrl: apiUrl });
  const store = getWordStore();
  const available = !!store || (isSupabaseConfigured && !!session);
  const editor = useRef<EditorWord | null>(null);
  const [detail, setDetail] = useState<CustomWordDetail | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ rows: WordRows | null; others: string[] } | null>(null);
  const close = useCallback(() => router.back(), [router]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  useEffect(() => {
    if (!available) return;
    let alive = true;
    const load = async () => {
      if (store) {
        const [rows, mine] = await Promise.all([getRows(store, wordId), listMine(store)]);
        return { rows, others: mine.filter((word) => word.id !== wordId).map((word) => word.text), detail: null, max: 50 };
      }
      if (!/^[0-9a-f-]{36}$/i.test(wordId)) return { rows: null, others: [], detail: null, max: 50 };
      const [word, mine] = await Promise.all([
        api.getCustomWord(wordId, await ownerToken(uid)), api.listCustomWords(await ownerToken(uid)),
      ]);
      await ownerToken(uid);
      return { rows: null, detail: word, others: mine.words.filter((value) => value.id !== wordId).map((value) => value.word), max: mine.max_upload_mb };
    };
    void load().then((data) => {
      if (!alive) return;
      setState({ rows: data.rows, others: data.others }); setDetail(data.detail); setLimit(data.max); setLoadError(null);
      editor.current = data.detail ? editWord(data.detail) : null;
    }, (failure) => { if (alive) setLoadError(manualError(failure)); });
    return () => { alive = false; };
  }, [api, available, store, uid, wordId, revision]);
  useEffect(() => () => { if (!store && available) void cleanupPendingUploads(api, uid).catch(() => undefined); }, [api, store, uid, available]);

  if (!available) {
    return (
      <WordFormScreen title="Ubah kata" onBack={close}>
        <InfoNote text={MESSAGES.companionWordsUnavailable} testID="companion-unavailable" />
      </WordFormScreen>
    );
  }
  if (loadError || catalog.error) return <WordFormScreen title="Ubah kata" onBack={close}>
    <InfoNote tone="warning" text={loadError ?? manualError(catalog.error)} testID="word-load-error" />
    <BigButton label="Coba lagi" onPress={() => { setLoadError(null); setRevision((value) => value + 1); catalog.reload(); }} />
  </WordFormScreen>;
  if (!state || !catalog.data || limit === null) {
    return (
      <WordFormScreen title="Ubah kata" onBack={close}>
        <LoadingView label="Memuat" />
      </WordFormScreen>
    );
  }
  if (!state.rows && !detail) {
    return (
      <WordFormScreen title="Ubah kata" onBack={close}>
        <InfoNote tone="warning" text="Materi tidak ditemukan." testID="word-not-found" />
        <BigButton label="Kembali" variant="secondary" onPress={close} />
      </WordFormScreen>
    );
  }
  const builtIn = catalog.data.words.filter((w) => w.source === 'default').map((w) => w.text);
  const initial = state.rows ? formDataOf(state.rows) : toFormData(editWord(detail!));
  const word = initial.text.toLowerCase();
  const n = initial.syllables.length;

  const remove = async () => {
    setConfirmDelete(false);
    setDeleteFailed(false);
    try {
      if (store) await removeWord(store, wordId);
      else {
        const result = await api.deleteCustomWord(wordId, detail!.revision, await ownerToken(uid));
        await ownerToken(uid);
        if (result.status !== 'deleted') {
          const latest = await api.getCustomWord(wordId, await ownerToken(uid));
          setDetail(latest); setDeleteFailed(true); return;
        }
      }
      showFlash(fill(MESSAGES.wordDeleted, { word }));
      close();
    } catch {
      setDeleteFailed(true);
    }
  };

  if (detail?.status === 'deleting') return <WordFormScreen title="Ubah kata" onBack={close}>
    <InfoNote text="Kata sudah ditarik dari katalog. Pembersihan video masih perlu diselesaikan." />
    <BigButton label="Lanjutkan hapus" onPress={() => void remove()} />
    <BigButton label="Kembali" variant="secondary" onPress={close} />
  </WordFormScreen>;
  return (
    <>
      <WordForm
        ownerId={store ? undefined : uid}
        title="Ubah kata"
        initial={initial}
        otherWords={[...state.others, ...builtIn]}
        describeError={manualError}
        onSubmit={async (data, onProgress, signal) => {
          if (store) return updateWord(store, wordId, data, onProgress, signal);
          editor.current = fromFormData(editor.current!, data);
          const saved = await saveWord(api, uid, editor.current, 'published', { max_upload_mb: limit }, () => {}, onProgress, signal);
          editor.current = editWord(saved);
        }}
        onClose={close}
        footer={
          <>
            {deleteFailed ? <InfoNote tone="warning" text={MESSAGES.deleteFailed} testID="delete-failed" /> : null}
            <DeleteButton word={initial.text} onPress={() => setConfirmDelete(true)} />
          </>
        }
      />
      <ConfirmDialog
        visible={confirmDelete}
        title={n > 0 ? fill(MESSAGES.deleteWord, { word, n }) : fill(MESSAGES.deleteWordNoSyllables, { word })}
        confirmLabel="Hapus kata"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}

/** "Hapus kata" (Figma 61:833): a quiet tile with the bin and the text in `danger`, never the main button. */
function DeleteButton({ word, onPress }: { word: string; onPress: () => void }) {
  const { focusProps, focusStyle } = useFocusRing();
  return (
    <Pressable
      testID="word-delete"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hapus ${word}`}
      {...focusProps}
      style={({ pressed }) => [styles.delete, pressed && styles.deletePressed, focusStyle]}
    >
      <Ionicons name="trash-outline" size={companion.deleteIcon} color={colors.danger} accessible={false} />
      <Text maxFontSizeMultiplier={2} style={[styles.deleteText, textFont(true)]}>Hapus kata</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  delete: {
    minHeight: companion.deleteHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: companion.deleteGap,
    borderRadius: radius.pill,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  deletePressed: { backgroundColor: colors.surfaceRaised },
  deleteText: { fontSize: fontSize.body, color: colors.danger },
});
