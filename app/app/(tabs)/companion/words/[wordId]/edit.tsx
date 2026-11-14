import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useFocusRing } from '../../../../../src/a11y/useFocusRing';
import { BigButton, ConfirmDialog, InfoNote, LoadingView, Screen } from '../../../../../src/components';
import { WordForm } from '../../../../../src/components/form/WordForm';
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
  const { apiUrl } = useSettings();
  const catalog = useCatalog({ baseUrl: apiUrl });
  const store = getWordStore();
  const [state, setState] = useState<{ rows: WordRows | null; others: string[] } | null>(null);
  const close = useCallback(() => router.back(), [router]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  useEffect(() => {
    if (!store) return;
    Promise.all([getRows(store, wordId), listMine(store)]).then(
      ([rows, mine]) => setState({ rows, others: mine.filter((w) => w.id !== wordId).map((w) => w.text) }),
      () => setState({ rows: null, others: [] }),
    );
  }, [store, wordId]);

  if (!store) {
    return (
      <Screen>
        <InfoNote text={MESSAGES.companionWordsUnavailable} testID="companion-unavailable" />
      </Screen>
    );
  }
  if (!state || !catalog.data) {
    return (
      <Screen>
        <LoadingView label="Memuat" />
      </Screen>
    );
  }
  if (!state.rows) {
    return (
      <Screen>
        <InfoNote tone="warning" text="Materi tidak ditemukan." testID="word-not-found" />
        <BigButton label="Kembali" variant="secondary" onPress={close} />
      </Screen>
    );
  }
  const builtIn = catalog.data.words.filter((w) => w.source === 'default').map((w) => w.text);
  const initial = formDataOf(state.rows);
  const word = initial.text.toLowerCase();
  const n = initial.syllables.length;

  const remove = async () => {
    setConfirmDelete(false);
    setDeleteFailed(false);
    try {
      await removeWord(store, wordId);
      showFlash(fill(MESSAGES.wordDeleted, { word }));
      catalog.reload();
      close();
    } catch {
      setDeleteFailed(true);
    }
  };

  return (
    <>
      <WordForm
        initial={initial}
        otherWords={[...state.others, ...builtIn]}
        onSubmit={(data, onProgress, signal) => updateWord(store, wordId, data, onProgress, signal)}
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
    borderRadius: radius.tile,
    borderWidth: stroke.hairline,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  deletePressed: { backgroundColor: colors.surfaceRaised },
  deleteText: { fontSize: fontSize.body, color: colors.danger },
});
