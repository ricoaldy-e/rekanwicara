import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { ActivityIndicator } from 'react-native';

import { InfoNote, LoadingView, Screen } from '../../../../src/components';
import { WordForm } from '../../../../src/components/form/WordForm';
import { getWordStore } from '../../../../src/data/media';
import { useCatalog } from '../../../../src/data/useCatalog';
import { createWord, listMine, type WordFormData } from '../../../../src/data/words';
import { MESSAGES } from '../../../../src/forms/messages';
import { useSettings } from '../../../../src/state/settings';
import { colors } from '../../../../src/theme';

const EMPTY: WordFormData = { text: '', instruction: '', video: null, syllables: [] };

/** PEN-2: add a word (0–6 syllables). */
export default function NewWord() {
  const router = useRouter();
  const { apiUrl } = useSettings();
  const catalog = useCatalog({ baseUrl: apiUrl });
  const store = getWordStore();
  const [mine, setMine] = useState<string[] | null>(null);
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    if (store) listMine(store).then((w) => setMine(w.map((x) => x.text)), () => setMine([]));
  }, [store]);

  if (!store) {
    return (
      <Screen>
        <InfoNote text={MESSAGES.companionWordsUnavailable} testID="companion-unavailable" />
      </Screen>
    );
  }
  if (!mine || !catalog.data) {
    return (
      <Screen>
        <LoadingView label="Memuat" />
      </Screen>
    );
  }
  const builtIn = catalog.data.words.filter((w) => w.source === 'default').map((w) => w.text);
  return (
    <WordForm
      initial={EMPTY}
      otherWords={[...mine, ...builtIn]}
      onSubmit={async (data, onProgress, signal) => {
        await createWord(store, data, onProgress, signal);
      }}
      onClose={close}
    />
  );
}
