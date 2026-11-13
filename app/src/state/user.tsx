import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { setHapticsEnabled } from '../a11y/haptics';
import { createRemote } from '../data/supabase';
import { syncPending } from '../data/sync';
import {
  addAttempt as withAttempt,
  addListenCheck,
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
import { createDemoProfile } from '../user/demo';
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
  demo: boolean;
  setDemo(enabled: boolean): void;
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
  const [demo, setDemoState] = useState(false);
  const demoRef = useRef(false);
  const personal = useRef<Profile | null>(null);
  const latest = useRef(profile);
  const remote = useMemo(() => createRemote(), []);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items; // the sync reads the newest list without being recreated when it loads
  }, [items]);
  const running = useRef(false);
  const [status, setStatus] = useState<Pick<SyncStatus, 'running' | 'lastError' | 'lastSyncedAt'>>({
    running: false,
    lastError: null,
    lastSyncedAt: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadProfile().then((p) => {
      if (cancelled) return;
      latest.current = p;
      setProfile(p);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Applies `change` to the latest profile (not a stale render), keeps it in state and saves it. */
  const update = useCallback((change: (p: Profile) => Profile) => {
    const next = change(latest.current);
    latest.current = next;
    setProfile(next);
    if (!demoRef.current) void saveProfile(next);
  }, []);

  const syncNow = useCallback(async () => {
    if (demoRef.current || !ready || !remote || running.current || !itemsRef.current) return;
    running.current = true;
    setStatus((s) => ({ ...s, running: true }));
    try {
      const result = await syncPending(latest.current, itemsRef.current, remote);
      // Mark exactly what was sent, on the latest profile: attempts added meanwhile stay pending.
      update((p) => markSynced(p, new Set(result.attemptIds), new Set(result.listenIds)));
      setStatus({
        running: false,
        lastError: result.error,
        lastSyncedAt: result.error ? null : new Date().toISOString(),
      });
    } finally {
      running.current = false;
    }
  }, [ready, remote, update]);

  const setDemo = useCallback((enabled: boolean) => {
    if (!ready || running.current || enabled === demoRef.current) return;
    if (enabled) personal.current = latest.current;
    const next = enabled ? createDemoProfile() : personal.current!;
    demoRef.current = enabled;
    latest.current = next;
    setProfile(next);
    setDemoState(enabled);
    setStatus({ running: false, lastError: null, lastSyncedAt: null });
  }, [ready]);

  // Sync when the profile is read, when the app comes back to the foreground, and every 30 s while open.
  useEffect(() => {
    if (!ready || demo || !remote) return;
    void syncNow();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void syncNow());
    const timer = setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [ready, demo, remote, syncNow, items]);

  const completeOnboarding = useCallback(
    () => {
      if (demoRef.current) return;
      update((p) => ({ ...p, onboarded: true, consentUser: true, consentCompanion: true }));
    },
    [update],
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
        profile.attempts,
        profile.listenChecks,
        { listenCheckRequired: profile.settings.listenCheckRequired, unlockAll: profile.settings.unlockAll },
        new Date(),
      ),
    [items, profile.attempts, profile.listenChecks, profile.settings.listenCheckRequired, profile.settings.unlockAll],
  );

  useEffect(() => setHapticsEnabled(profile.settings.vibration), [profile.settings.vibration]);

  const value = useMemo<UserValue>(
    () => ({
      demo,
      setDemo,
      ready,
      profile,
      progress,
      sync: { configured: !demo && remote !== null, pending: demo ? 0 : pendingCount(profile), ...status },
      completeOnboarding,
      markCalibrated,
      addAttempt,
      addListenCheck: addCheck,
      updateSettings,
      syncNow,
    }),
    [demo, setDemo, ready, profile, progress, remote, status, completeOnboarding, markCalibrated, addAttempt, addCheck, updateSettings, syncNow],
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
