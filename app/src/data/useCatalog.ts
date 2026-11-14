import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../api/apiError';
import { useAuth } from '../auth/AuthProvider';
import { auth } from '../auth/session';
import { withAccount } from '../auth/v2Auth';
import { USE_MOCK } from '../config';
import { getCatalog, getWord, type SourceOptions } from './catalog';
import { catalogToL1, catalogToWords, wordToPath } from './mappers';
import type { PracticeItem, WordPath, WordSummary } from './types';

interface Loaded<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
}

const lastLoaded = new Map<string, unknown>();

/** Scope cached data and pending responses to the exact loader and cache key. */
export function useLoad<T>(load: () => Promise<T>, cacheKey?: string): Loaded<T> {
  const cached = (): T | null => (cacheKey ? (lastLoaded.get(cacheKey) as T | undefined) : undefined) ?? null;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ load: typeof load; cacheKey: string | undefined; tick: number; data: T | null; loading: boolean; error: unknown }>(() => ({ load, cacheKey, tick, data: cached(), loading: true, error: null }));
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => {
        if (!alive) return;
        if (cacheKey) lastLoaded.set(cacheKey, data);
        setState({ load, cacheKey, tick, data, loading: false, error: null });
      },
      (error: unknown) => alive && setState({ load, cacheKey, tick, data: null, loading: false, error }),
    );
    return () => { alive = false; };
  }, [load, tick, cacheKey]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = state.load === load && state.cacheKey === cacheKey && state.tick === tick
    ? state : { data: cached(), loading: true, error: null };
  return { data: current.data, loading: current.loading, error: current.error, reload };
}

/** Level 1 and words share a cache only within the same account, server and data source. */
export function useCatalog(opts: SourceOptions): Loaded<{ level1: PracticeItem[]; words: WordSummary[] }> {
  const { uid } = useAuth();
  const { baseUrl, getToken, refreshSession, onSessionLost, mock } = opts;
  const useMock = mock ?? USE_MOCK;
  const load = useCallback(async () => {
    const account = withAccount({ getToken, refreshSession, onSessionLost });
    const assertOwner = async () => {
      if (!useMock && (await auth.getSession())?.uid !== uid) {
        throw new ApiError('http', 'Account changed while loading catalog', 401, 'UNAUTHENTICATED');
      }
    };
    await assertOwner();
    const dto = await getCatalog({
      baseUrl, mock: useMock,
      getToken: async () => {
        await assertOwner();
        const token = await account.getToken!();
        await assertOwner();
        return token;
      },
      refreshSession: async () => {
        await assertOwner();
        const refreshed = await account.refreshSession!();
        await assertOwner();
        return refreshed;
      },
      onSessionLost: () => {
        void auth.getSession().then((session) => {
          if (session?.uid === uid) account.onSessionLost?.();
        }).catch(() => undefined);
      },
    });
    await assertOwner();
    return { level1: catalogToL1(dto), words: catalogToWords(dto) };
  }, [uid, baseUrl, getToken, refreshSession, onSessionLost, useMock]);
  const result = useLoad(load, `catalog:${uid}:${baseUrl}:${useMock}`);
  const { reload } = result;
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    if (focused.current) reload();
    else focused.current = true;
  }, [reload]));
  return result;
}

/** One word with its Level 2 steps and the whole word (Jalur kata). */
export function useWordPath(id: string, opts: SourceOptions): Loaded<WordPath> {
  const { baseUrl, getToken, refreshSession, onSessionLost, mock } = opts;
  const load = useCallback(
    () => getWord(id, { baseUrl, getToken, refreshSession, onSessionLost, mock }).then(wordToPath),
    [id, baseUrl, getToken, refreshSession, onSessionLost, mock],
  );
  return useLoad(load);
}

/**
 * The material of one practice step: a Level 1 item (no wordId), a syllable of a word (wordId + position),
 * or the whole word (wordId only). Resolves to null when it does not exist.
 */
export function usePracticeItem(
  itemId: string,
  wordId: string | undefined,
  position: number | undefined,
  opts: SourceOptions,
): Loaded<PracticeItem | null> {
  const { baseUrl, getToken, refreshSession, onSessionLost, mock } = opts;
  const load = useCallback(async (): Promise<PracticeItem | null> => {
    const src = { baseUrl, getToken, refreshSession, onSessionLost, mock };
    if (!wordId) return catalogToL1(await getCatalog(src)).find((i) => i.itemId === itemId) ?? null;
    const path = wordToPath(await getWord(wordId, src));
    if (position === undefined) return path.whole.itemId === itemId ? path.whole : null;
    return path.syllables.find((s) => s.itemId === itemId && s.position === position) ?? null;
  }, [itemId, wordId, position, baseUrl, getToken, refreshSession, onSessionLost, mock]);
  return useLoad(load);
}
