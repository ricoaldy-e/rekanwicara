import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../../../src/auth/AuthProvider';
import { isSupabaseConfigured } from '../../../../src/auth/supabase';
import { BigButton, InfoNote, LoadingView } from '../../../../src/components';
import { WordForm } from '../../../../src/components/form/WordForm';
import { WordFormScreen } from '../../../../src/components/form/WordFormScreen';
import { fromFormData, toFormData } from '../../../../src/customWords/formAdapter';
import { cleanupPendingUploads, editWord, manualError, newWord, ownerToken, saveWord } from '../../../../src/customWords/service';
import { getWordStore } from '../../../../src/data/media';
import { useCatalog } from '../../../../src/data/useCatalog';
import { createWord, listMine } from '../../../../src/data/words';
import { MESSAGES } from '../../../../src/forms/messages';
import { useSettings } from '../../../../src/state/settings';

/** One save action: record every material, upload versions, then commit the complete word. */
export default function NewWord() {
  const router = useRouter();
  const { api, apiUrl } = useSettings();
  const { uid, session } = useAuth();
  const catalog = useCatalog({ baseUrl: apiUrl });
  const store = getWordStore();
  const [initialEditor] = useState(newWord);
  const editor = useRef(initialEditor);
  const [mine, setMine] = useState<string[] | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const close = useCallback(() => router.back(), [router]);
  const available = !!store || (isSupabaseConfigured && !!session);

  useEffect(() => {
    if (!available) return;
    let alive = true;
    const load = async () => {
      if (store) return { names: (await listMine(store)).map((word) => word.text), max: 50 };
      const data = await api.listCustomWords(await ownerToken(uid));
      await ownerToken(uid);
      return { names: data.words.map((word) => word.word), max: data.max_upload_mb };
    };
    void load().then((data) => { if (alive) { setMine(data.names); setLimit(data.max); setError(null); } },
      (failure) => { if (alive) setError(manualError(failure)); });
    return () => { alive = false; };
  }, [api, available, uid, store, revision]);

  useEffect(() => () => {
    if (!store && available) void cleanupPendingUploads(api, uid).catch(() => undefined);
  }, [api, uid, store, available]);

  if (!available) return <WordFormScreen title="Kata baru" onBack={close}>
    <InfoNote text={MESSAGES.companionWordsUnavailable} testID="companion-unavailable" />
  </WordFormScreen>;
  if (error || catalog.error) return <WordFormScreen title="Kata baru" onBack={close}>
    <InfoNote tone="warning" text={error ?? manualError(catalog.error)} testID="word-load-error" />
    <BigButton label="Coba lagi" onPress={() => { setError(null); setRevision((value) => value + 1); catalog.reload(); }} />
  </WordFormScreen>;
  if (!mine || !catalog.data || limit === null) return <WordFormScreen title="Kata baru" onBack={close}>
    <LoadingView label="Memuat" />
  </WordFormScreen>;

  const builtIn = catalog.data.words.filter((word) => word.source === 'default').map((word) => word.text);
  return <WordForm ownerId={store ? undefined : uid} initial={toFormData(initialEditor)} otherWords={[...mine, ...builtIn]} describeError={manualError}
    onSubmit={async (data, onProgress, signal) => {
      if (store) { await createWord(store, data, onProgress, signal); return; }
      editor.current = fromFormData(editor.current, data);
      const saved = await saveWord(api, uid, editor.current, 'published', { max_upload_mb: limit }, () => {}, onProgress, signal);
      editor.current = editWord(saved);
    }} onClose={close} />;
}
