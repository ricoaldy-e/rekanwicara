import { getClient, isSupabaseConfigured } from '../auth/supabase';
import { USE_MOCK } from '../config';
import type { Remote, Table } from './sync';

const ON_CONFLICT: Record<Table, string> = {
  profiles: 'user_id',
  attempts: 'id',
  listen_checks: 'id',
  progress: 'user_id,item_id',
};

/**
 * The Supabase side of the sync, or null when there is nothing to sync to: app/.env has no URL and anon key,
 * or the mock accounts are on (a mock user is not a Supabase user). The app then works offline only.
 */
export function createRemote(): Remote | null {
  if (!isSupabaseConfigured || USE_MOCK) return null;
  return {
    async ensureUser() {
      // getUser asks the server, so a session of a deleted user is noticed instead of failing every upsert.
      // No anonymous sign-in (K3): without an account session the sync simply waits for the user to sign in.
      const { data, error } = await getClient().auth.getUser();
      if (data.user) return data.user.id;
      if (error?.name === 'AuthRetryableFetchError') throw error; // offline: try again later
      throw new Error('Belum masuk');
    },
    async upsert(table, rows) {
      const { error } = await getClient().from(table).upsert(rows, { onConflict: ON_CONFLICT[table] });
      if (error) throw new Error(`${table}: ${error.message}`);
    },
  };
}
