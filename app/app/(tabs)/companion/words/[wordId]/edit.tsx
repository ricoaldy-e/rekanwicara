import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { BigButton, InfoNote, Screen } from '../../../../../src/components';
import { WordForm } from '../../../../../src/components/form/WordForm';
import { getWordStore } from '../../../../../src/data/media';
import { useCatalog } from '../../../../../src/data/useCatalog';
import { formDataOf, getRows, listMine, updateWord, type WordRows } from '../../../../../src/data/words';
import { MESSAGES } from '../../../../../src/forms/messages';
import { useSettings } from '../../../../../src/state/settings';
import { colors } from '../../../../../src/theme';

/** PEN-3: edit a companion word. A built-in word has no way here: it is not in the companion's store. */
export default function EditWord() {
  const router = useRouter();
  const { wordId } = useLocalSearchParams<{ wordId: string }>();
  const { apiUrl } = useSettings();
  const catalog = useCatalog({ baseUrl: apiUrl });
  const store = getWordStore();
  const [state, setState] = useState<{ rows: WordRows | null; others: string[] } | null>(null);
  const close = useCallback(() => router.back(), [router]);

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
        <ActivityIndicator size="large" color={colors.text} accessibilityLabel="Memuat" />
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
  return (
    <WordForm
      initial={formDataOf(state.rows)}
      otherWords={[...state.others, ...builtIn]}
      onSubmit={(data, onProgress, signal) => updateWord(store, wordId, data, onProgress, signal)}
      onClose={close}
    />
  );
}
