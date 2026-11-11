import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';
import type { Remote, Table } from './sync';

const ON_CONFLICT: Record<Table, string> = {
  profiles: 'user_id',
  attempts: 'id',
  listen_checks: 'id',
  progress: 'user_id,item_id',
};

export const isSupabaseConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Official React Native setup: the session lives in AsyncStorage and never in the URL.
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
  const auth = client.auth;
  // Token refresh only while the app is in the foreground (registered once).
  AppState.addEventListener('change', (state) => (state === 'active' ? auth.startAutoRefresh() : auth.stopAutoRefresh()));
  return client;
}

/** The Supabase side of the sync, or null when app/.env has no URL and anon key (the app then works offline only). */
export function createRemote(): Remote | null {
  if (!isSupabaseConfigured) return null;
  return {
    async ensureUser() {
      const { auth } = getClient();
      // getUser asks the server, so a session of a deleted user is noticed instead of failing every upsert.
      const { data, error } = await auth.getUser();
      if (data.user) return data.user.id;
      if (error?.name === 'AuthRetryableFetchError') throw error; // offline: try again later
      const signIn = await auth.signInAnonymously(); // needs "Anonymous Sign-Ins" enabled in the project
      if (signIn.error || !signIn.data.user) throw signIn.error ?? new Error('Login anonim gagal');
      return signIn.data.user.id;
    },
    async upsert(table, rows) {
      const { error } = await getClient().from(table).upsert(rows, { onConflict: ON_CONFLICT[table] });
      if (error) throw new Error(`${table}: ${error.message}`);
    },
  };
}
