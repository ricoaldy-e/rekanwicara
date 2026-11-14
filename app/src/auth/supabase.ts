import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

/** Publishable (anon) key only: RLS protects the data. There is no service-role key in the app. */
export const isSupabaseConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

let client: SupabaseClient | null = null;
let changingAuth = false;

/** Share the credential mutation lock with the existing companion logic. */
export async function withAuthChange<T>(operation: () => Promise<T>): Promise<T> {
  if (changingAuth) throw new Error('Tunggu proses akun yang sedang berjalan.');
  changingAuth = true;
  try {
    return await operation();
  } finally {
    changingAuth = false;
  }
}

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
