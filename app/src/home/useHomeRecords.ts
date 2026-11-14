import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { HomeSessionError, loadHomeRecords } from './records';

export type HomeRecords = Awaited<ReturnType<typeof loadHomeRecords>>;
export type HomeRecordsState =
  | { status: 'signed_out' | 'loading'; data: null }
  | { status: 'ready'; data: HomeRecords }
  | { status: 'error'; data: null; error: unknown; sessionExpired: boolean };

/** Account-tagged, in-memory query; the future Home screen calls refresh after custom creation. */
export function useHomeRecords(uid: string | null, names: ReadonlyMap<string, string>) {
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ uid: string | null; revision: number; state: HomeRecordsState } | null>(null);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    const request = uid === null ? Promise.resolve(null) : loadHomeRecords(uid, names);
    void request.then((data) => {
      if (!cancelled) setSnapshot({ uid, revision, state: data ? { status: 'ready', data } : { status: 'signed_out', data: null } });
    }).catch((error: unknown) => {
      if (!cancelled) setSnapshot({ uid, revision, state: { status: 'error', data: null, error, sessionExpired: error instanceof HomeSessionError } });
    });
    return () => { cancelled = true; };
  }, [uid, names, revision]));

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => listener.remove();
  }, [refresh]);

  const state: HomeRecordsState = uid === null ? { status: 'signed_out', data: null }
    : snapshot?.uid === uid && snapshot.revision === revision ? snapshot.state : { status: 'loading', data: null };
  return { state, refresh };
}
