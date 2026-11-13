import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

/** Publishable (anon) key only: RLS protects the data. There is no service-role key in the app. */
export const isSupabaseConfigured = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
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
