/**
 * Account session (kontrak §3). Screens only use `auth`; the choice between Supabase and the mock is made here.
 * The session object handed to the UI holds no tokens and no password.
 */
import type { SupabaseClient, Session } from '@supabase/supabase-js';

import { USE_MOCK } from '../config';
import { mockAuth } from '../mock/auth';
import { AuthFailure, mapAuthError } from './errors';
import { getClient } from './supabase';

export interface AuthSession {
  uid: string;
  email: string | null;
  /** The username given at sign-up (not unique, not used to sign in). */
  displayName: string | null;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AuthApi {
  /** `null` = the account was made but needs the email to be confirmed first. */
  signUp(input: Credentials & { username: string }): Promise<AuthSession | null>;
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
  s
    ? {
        uid: s.user.id,
        email: s.user.email ?? null,
        displayName: typeof s.user.user_metadata?.display_name === 'string' ? s.user.user_metadata.display_name : null,
      }
    : null;

export function createSupabaseAuth(client: () => SupabaseClient): AuthApi {
  return {
    async signUp({ username, email, password }) {
      try {
        const { data, error } = await client().auth.signUp({ email, password, options: { data: { display_name: username } } });
        if (error) throw error;
        return toSession(data.session);
      } catch (e) {
        throw new AuthFailure(mapAuthError(e));
      }
    },
    async signIn({ email, password }) {
      try {
        const { data, error } = await client().auth.signInWithPassword({ email, password });
        if (error) throw error;
        const session = toSession(data.session);
        if (!session) throw new AuthFailure('SERVER');
        return session;
      } catch (e) {
        throw new AuthFailure(mapAuthError(e));
      }
    },
    async signOut() {
      await client().auth.signOut();
    },
    async getSession() {
      const { data } = await client().auth.getSession();
      return toSession(data.session);
    },
    onAuthStateChange(listener) {
      const { data } = client().auth.onAuthStateChange((_event, session) => listener(toSession(session)));
      return () => data.subscription.unsubscribe();
    },
    async getAccessToken() {
      const { data } = await client().auth.getSession();
      return data.session?.access_token ?? null;
    },
    async refreshAccessToken() {
      const { data, error } = await client().auth.refreshSession();
      return error ? null : (data.session?.access_token ?? null);
    },
    async ensureProfile(session) {
      try {
        await client().from('profiles').upsert({ user_id: session.uid, display_name: session.displayName }, { onConflict: 'user_id' });
      } catch {
        // best effort: sync tries again with the other rows
      }
    },
  };
}

export const auth: AuthApi = USE_MOCK ? mockAuth : createSupabaseAuth(getClient);
