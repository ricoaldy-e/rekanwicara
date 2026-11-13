import { useCallback, useEffect, useState } from 'react';

import { getCatalog, getWord, type SourceOptions } from './catalog';
import { catalogToL1, catalogToWords, wordToPath } from './mappers';
import type { PracticeItem, WordPath, WordSummary } from './types';

interface Loaded<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

function useLoad<T>(load: () => Promise<T>): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: unknown }>({
    data: null,
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load().then(
      (data) => alive && setState({ data, loading: false, error: null }),
      (error: unknown) => alive && setState({ data: null, loading: false, error }),
    );
    return () => {
      alive = false;
    };
  }, [load, tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/** Level 1 items and the word list (Pilih kata). */
export function useCatalog(opts: SourceOptions): Loaded<{ level1: PracticeItem[]; words: WordSummary[] }> {
  const { baseUrl, getToken, mock } = opts;
  const load = useCallback(
    () => getCatalog({ baseUrl, getToken, mock }).then((dto) => ({ level1: catalogToL1(dto), words: catalogToWords(dto) })),
    [baseUrl, getToken, mock],
  );
  return useLoad(load);
}

/** One word with its Level 2 steps and the whole word (Jalur kata). */
export function useWordPath(id: string, opts: SourceOptions): Loaded<WordPath> {
  const { baseUrl, getToken, mock } = opts;
  const load = useCallback(() => getWord(id, { baseUrl, getToken, mock }).then(wordToPath), [id, baseUrl, getToken, mock]);
  return useLoad(load);
}
