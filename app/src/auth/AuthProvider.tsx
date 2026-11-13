import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { USE_MOCK } from '../config';
import { LOCAL_UID } from '../pin/pinStore';
import { auth, type AuthSession } from './session';
import { isSupabaseConfigured } from './supabase';

interface AuthValue {
  /** False until the saved session has been read. */
  ready: boolean;
  /** Accounts exist only with Supabase or the mock; otherwise the app works offline on this phone. */
  required: boolean;
  session: AuthSession | null;
  /** The account id, or 'local' when the app has no accounts. Keys the PIN. */
  uid: string;
}

const AuthContext = createContext<AuthValue | null>(null);

export const accountsAvailable = USE_MOCK || isSupabaseConfigured;

export function AuthProvider({ children, required = accountsAvailable }: { children: ReactNode; required?: boolean }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(!required);

  useEffect(() => {
    if (!required) return;
    let alive = true;
    auth
      .getSession()
      .catch(() => null) // unreadable storage: treated as signed out
      .then((s) => {
        if (!alive) return;
        setSession(s);
        setReady(true);
      });
    const unsubscribe = auth.onAuthStateChange((s) => alive && setSession(s));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [required]);

  // Sign-up or first sign-in: make sure the profiles row exists (kontrak §3).
  const uid = session?.uid;
  useEffect(() => {
    if (session) void auth.ensureProfile(session);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const value = useMemo<AuthValue>(() => ({ ready, required, session, uid: session?.uid ?? LOCAL_UID }), [ready, required, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
