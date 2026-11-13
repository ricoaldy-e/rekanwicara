import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
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

export function getClient(): SupabaseClient {
  if (!isSupabaseConfigured) throw new Error('Supabase belum dikonfigurasi.');
  if (client) return client;
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Official React Native setup: the session lives in AsyncStorage and never in the URL.
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock },
  });
  const auth = client.auth;
  // Token refresh only while the app is in the foreground (registered once).
  AppState.addEventListener('change', (state) => (state === 'active' ? auth.startAutoRefresh() : auth.stopAutoRefresh()));
  if (AppState.currentState === 'active') auth.startAutoRefresh();
  else auth.stopAutoRefresh();
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
      if (error) throw new Error('Sesi belum dapat diverifikasi. Silakan login atau coba lagi.');
      if (!data.user || data.user.is_anonymous || !data.user.email) throw new Error('Login akun pendamping diperlukan.');
      return data.user.id;
    },
    async upsert(table, rows) {
      const uid = await this.ensureUser();
      if (rows.some((row) => row.user_id !== uid)) throw new Error('Akun berubah; sinkronisasi dibatalkan.');
      const { error } = await getClient().from(table).upsert(rows, {
        onConflict: ON_CONFLICT[table], ignoreDuplicates: table === 'profiles',
      });
      if (error) throw new Error('Sinkronisasi belum berhasil. Coba lagi.');
    },
  };
}
