import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { Status } from '../api/types';
import { makeId, newProfile, recordAttempt, type Profile } from '../user/pure';
import { loadProfile, saveProfile, savePin } from '../user/storage';

/** One id per app launch, sent as `session_id`. */
export const SESSION_ID = makeId('s');

interface UserValue {
  /** False until the saved profile has been read. */
  ready: boolean;
  profile: Profile;
  /** Stores consent and the companion PIN (keystore), then marks onboarding done. */
  completeOnboarding(pin: string): Promise<void>;
  markCalibrated(): void;
  /** Records a scored attempt. Retry results are not attempts; callers skip them. */
  addAttempt(itemId: string, status: Status): void;
}

const UserContext = createContext<UserValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(newProfile);
  const [ready, setReady] = useState(false);
  const latest = useRef(profile);

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
    void saveProfile(next);
  }, []);

  const completeOnboarding = useCallback(
    async (pin: string) => {
      await savePin(pin);
      update((p) => ({ ...p, onboarded: true, consentUser: true, consentCompanion: true }));
    },
    [update],
  );
  const markCalibrated = useCallback(() => update((p) => ({ ...p, calibrated: true })), [update]);
  const addAttempt = useCallback(
    (itemId: string, status: Status) =>
      update((p) => ({ ...p, attempts: recordAttempt(p.attempts, itemId, status) })),
    [update],
  );

  const value = useMemo(
    () => ({ ready, profile, completeOnboarding, markCalibrated, addAttempt }),
    [ready, profile, completeOnboarding, markCalibrated, addAttempt],
  );
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
