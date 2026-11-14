import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { setHapticsEnabled } from '../a11y/haptics';
import { onCompanionAuthChange } from '../auth/companion';
import { createRemote } from '../data/supabase';
import { syncPending } from '../data/sync';
import {
  addAttempt as withAttempt,
  addListenCheck,
  isV2Attempt,
  makeId,
  makeUuid,
  markSynced,
  newProfile,
  pendingCount,
  type Attempt,
  type ListenResult,
  type Profile,
  type Settings,
} from '../user/pure';
import { loadProfile, saveProfile } from '../user/storage';
import { useContent } from './content';
import { buildProgress, type ItemProgress } from './progression';

/** One id per app launch, sent as `session_id`. */
export const SESSION_ID = makeId('s');

const SYNC_INTERVAL_MS = 30_000;

export interface SyncStatus {
  /** False when app/.env has no Supabase URL and key: everything then stays on the phone. */
  configured: boolean;
  running: boolean;
  pending: number;
  lastError: string | null;
  lastSyncedAt: string | null;
}

interface UserValue {
  session: Session | null;
  /** False until the saved profile has been read. */
  ready: boolean;
  profile: Profile;
  /** Progress per item (SPEC §8.4), recomputed when attempts or settings change. */
  progress: ReadonlyMap<string, ItemProgress>;
  sync: SyncStatus;
  /** Stores consent and marks onboarding done (the PIN is made earlier, on its own screen). */
  completeOnboarding(): void;
  markCalibrated(): void;
  /** Records a scored attempt and starts a sync. Retry results are not attempts; callers skip them. */
  addAttempt(attempt: Attempt): void;
  addListenCheck(itemId: string, result: ListenResult): void;
  updateSettings(change: Partial<Settings>): void;
  syncNow(): Promise<void>;
}

const UserContext = createContext<UserValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { items } = useContent();
  const [profile, setProfile] = useState<Profile>(newProfile);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<{ uid: string | null; version: number }>({ uid: null, version: 0 });
  const owner = useRef<string | null | undefined>(undefined);
  const generation = useRef(0);
  const mounted = useRef(false);
  const latest = useRef(profile);
  const remote = useMemo(() => createRemote(), []);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items; // the sync reads the newest list without being recreated when it loads
  }, [items]);
  const running = useRef<number | null>(null);
  const [status, setStatus] = useState<Pick<SyncStatus, 'running' | 'lastError' | 'lastSyncedAt'>>({
    running: false,
    lastError: null,
    lastSyncedAt: null,
  });

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const unsubscribe = onCompanionAuthChange((nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      const uid = nextSession?.user.id ?? null;
      if (owner.current === uid) return;
      owner.current = uid;
      const version = ++generation.current;
      running.current = null;
      latest.current = newProfile(uid ?? undefined);
      setProfile(latest.current);
      setReady(false);
      setAccount({ uid, version });
      setStatus({ running: false, lastError: null, lastSyncedAt: null });
      void loadProfile(uid).then((p) => {
        if (cancelled || generation.current !== version) return;
        latest.current = p;
        setProfile(p);
        setReady(true);
      });
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      owner.current = undefined;
      unsubscribe();
    };
  }, []);

  /** Applies `change` to the latest profile (not a stale render), keeps it in state and saves it. */
  const update = useCallback((change: (p: Profile) => Profile) => {
    if (!mounted.current || !ready || generation.current !== account.version) return;
    const next = change(latest.current);
    latest.current = next;
    setProfile(next);
    void saveProfile(next);
  }, [ready, account.version]);

  const syncNow = useCallback(async () => {
    if (!mounted.current || !ready || !remote || running.current === account.version || !itemsRef.current ||
        !account.uid || latest.current.userId !== account.uid || generation.current !== account.version) return;
    const version = account.version;
    running.current = version;
    setStatus((s) => ({ ...s, running: true }));
    try {
      const result = await syncPending(latest.current, itemsRef.current, remote);
      if (!mounted.current || generation.current !== version) return;
      // Mark exactly what was sent, on the latest profile: attempts added meanwhile stay pending.
      update((p) => markSynced(p, new Set(result.attemptIds), new Set(result.listenIds)));
      setStatus({
        running: false,
        lastError: result.error,
        lastSyncedAt: result.error ? null : new Date().toISOString(),
      });
    } finally {
      if (running.current === version) running.current = null;
    }
  }, [ready, remote, update, account]);

  // Sync when the profile is read, when the app comes back to the foreground, and every 30 s while open.
  useEffect(() => {
    if (!ready || !remote || !account.uid) return;
    void syncNow();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void syncNow());
    const timer = setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [ready, remote, syncNow, items, account.uid]);

  const completeOnboarding = useCallback(
    () => {
      if (!mounted.current || !ready || generation.current !== account.version) return;
      update((p) => ({ ...p, onboarded: true, consentUser: true, consentCompanion: true }));
    },
    [update, ready, account.version],
  );
  const markCalibrated = useCallback(() => update((p) => ({ ...p, calibrated: true })), [update]);
  const addAttempt = useCallback(
    (attempt: Attempt) => {
      update((p) => withAttempt(p, attempt));
      void syncNow();
    },
    [update, syncNow],
  );
  const addCheck = useCallback(
    (itemId: string, result: ListenResult) => {
      update((p) => addListenCheck(p, { id: makeUuid(), itemId, result, at: new Date().toISOString(), synced: false }));
      void syncNow();
    },
    [update, syncNow],
  );
  const updateSettings = useCallback(
    (change: Partial<Settings>) => update((p) => ({ ...p, settings: { ...p.settings, ...change } })),
    [update],
  );

  const progress = useMemo(
    () =>
      buildProgress(
        items ?? [],
        profile.attempts.filter((attempt) => !isV2Attempt(attempt)),
        profile.listenChecks,
        { listenCheckRequired: profile.settings.listenCheckRequired, unlockAll: profile.settings.unlockAll },
        new Date(),
      ),
    [items, profile.attempts, profile.listenChecks, profile.settings.listenCheckRequired, profile.settings.unlockAll],
  );

  useEffect(() => setHapticsEnabled(profile.settings.vibration), [profile.settings.vibration]);

  const value = useMemo<UserValue>(
    () => ({
      session,
      ready,
      profile,
      progress,
      sync: { configured: remote !== null && session !== null, pending: pendingCount(profile), ...status },
      completeOnboarding,
      markCalibrated,
      addAttempt,
      addListenCheck: addCheck,
      updateSettings,
      syncNow,
    }),
    [session, ready, profile, progress, remote, status, completeOnboarding, markCalibrated, addAttempt, addCheck, updateSettings, syncNow],
  );
  return <UserContext.Provider key={account.uid ?? 'guest'} value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
