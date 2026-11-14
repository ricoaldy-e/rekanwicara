/**
 * Account session (kontrak §3). Screens only use `auth`; the choice between Supabase and the mock is made here.
 * The session object handed to the UI holds no tokens and no password.
 */
import type { SupabaseClient, Session } from '@supabase/supabase-js';

import { USE_MOCK } from '../config';
import { mockAuth } from '../mock/auth';
import { AuthFailure, mapAuthError } from './errors';
import { getClient, withAuthChange } from './supabase';

export interface AuthSession {
  uid: string;
  email: string | null;
  /** The nickname given at sign-up (shown on Beranda; not unique, not used to sign in). */
  displayName: string | null;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthApi {
  /** `null` = the account was made but needs the email to be confirmed first. */
  signUp(input: Credentials & { nickname: string }): Promise<AuthSession | null>;
  signIn(input: Credentials): Promise<AuthSession>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  /** Returns the unsubscribe function. */
  onAuthStateChange(listener: (session: AuthSession | null) => void): () => void;
  /** Access token for `Authorization: Bearer` on the v2 API; null when signed out. */
  getAccessToken(): Promise<string | null>;
  /** Refreshes the session once (after a 401); the new token, or null when that is no longer possible. */
  refreshAccessToken(): Promise<string | null>;
  /** Best effort: the `profiles` row (display name) of a signed-in account. Never throws. */
  ensureProfile(session: AuthSession): Promise<void>;
}

const toSession = (s: Session | null): AuthSession | null =>
  s?.user?.email && !s.user.is_anonymous
    ? {
        uid: s.user.id,
        email: s.user.email ?? null,
        displayName: typeof s.user.user_metadata?.display_name === 'string' ? s.user.user_metadata.display_name : null,
      }
    : null;

export function createSupabaseAuth(client: () => SupabaseClient): AuthApi {
  return {
    async signUp({ nickname, email, password }) {
      try {
        const { data, error } = await withAuthChange(() => client().auth.signUp({ email, password, options: { data: { display_name: nickname.trim() } } }));
        if (error) throw error;
        return toSession(data.session);
      } catch (e) {
        throw new AuthFailure(mapAuthError(e));
      }
    },
    async signIn({ email, password }) {
      try {
        const { data, error } = await withAuthChange(() => client().auth.signInWithPassword({ email, password }));
        if (error) throw error;
        const session = toSession(data.session);
        if (!session) throw new AuthFailure('SERVER');
        return session;
      } catch (e) {
        throw new AuthFailure(mapAuthError(e));
      }
    },
    async signOut() {
      const { error } = await withAuthChange(() => client().auth.signOut({ scope: 'local' }));
      if (error) throw new AuthFailure(mapAuthError(error));
    },
    async getSession() {
      const { data, error } = await client().auth.getSession();
      if (error) throw new AuthFailure(mapAuthError(error));
      return toSession(data.session);
    },
    onAuthStateChange(listener) {
      const { data } = client().auth.onAuthStateChange((_event, session) => listener(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
    async getAccessToken() {
      const { data, error } = await client().auth.getSession();
      return !error && toSession(data.session) ? data.session!.access_token : null;
    },
    async refreshAccessToken() {
      const { data, error } = await client().auth.refreshSession();
      return !error && toSession(data.session) ? data.session!.access_token : null;
    },
    async ensureProfile(session) {
      try {
        const { data, error } = await client().auth.getUser();
        if (error || data.user?.id !== session.uid || data.user.is_anonymous || !data.user.email) return;
        const name = session.displayName?.trim();
        await client().from('profiles').upsert(
          { user_id: data.user.id, display_name: name && name.length <= 200 ? name : null },
          { onConflict: 'user_id', ignoreDuplicates: true },
        );
      } catch {
        // best effort: sync tries again with the other rows
      }
    },
  };
}

export const auth: AuthApi = USE_MOCK ? mockAuth : createSupabaseAuth(getClient);
