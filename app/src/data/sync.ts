/**
 * Offline queue (SPEC §9): attempts and listen checks are kept on the phone and sent to Supabase when
 * it is reachable. Each record has a UUID made on the phone and is sent with an upsert, so sending
 * again after a failure or a lost reply never creates a duplicate row.
 *
 * Pure apart from the injected `Remote`: tests use a fake one.
 */

import type { Item } from '../api/types';
import { buildProgress, type ItemProgress } from '../state/progression';
import type { Attempt, ListenCheck, Profile } from '../user/pure';

export type Table = 'profiles' | 'attempts' | 'listen_checks' | 'progress';

export interface Remote {
  /** The Supabase user id (auth.uid()) of the signed-in account. Throws when there is no session or it is unreachable. */
  ensureUser(): Promise<string>;
  /** Upsert rows; throws when the server refuses or is unreachable. */
  upsert(table: Table, rows: Record<string, unknown>[]): Promise<void>;
}

export interface SyncResult {
  /** Ids that reached the server: the caller marks exactly these as synced. */
  attemptIds: string[];
  listenIds: string[];
  error: string | null;
}

export const BATCH_SIZE = 100;

export const attemptRow = (a: Attempt, uid: string) => ({
  id: a.id,
  user_id: uid,
  session_id: a.sessionId,
  item_id: a.itemId,
  level: a.level,
  status: 'ok',
  overall: a.overall,
  score: a.score,
  indicators: a.indicators,
  hint_id: a.hintId,
  scorer: a.scorer,
  engine_version: a.engineVersion,
  created_at: a.at,
});

export const listenRow = (c: ListenCheck, uid: string) => ({
  id: c.id,
  user_id: uid,
  item_id: c.itemId,
  result: c.result,
  created_at: c.at,
});

export const progressRow = (p: ItemProgress, uid: string) => ({
  user_id: uid,
  item_id: p.itemId,
  stage: p.stage,
  last_10: p.last10,
  sessions_count: p.sessions,
  passed_at: p.passedAt,
  next_review_at: p.nextReviewAt,
});

const describe = (e: unknown) => (e instanceof Error ? e.message : typeof e === 'string' ? e : 'Sinkron gagal');

function chunks<T>(list: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

export async function syncPending(
  profile: Profile,
  items: readonly Item[],
  remote: Remote,
  now: Date = new Date(),
): Promise<SyncResult> {
  const attempts = profile.attempts.filter((a) => !a.synced);
  const checks = profile.listenChecks.filter((c) => !c.synced);
  const result: SyncResult = { attemptIds: [], listenIds: [], error: null };
  if (attempts.length === 0 && checks.length === 0) return result;

  try {
    const uid = await remote.ensureUser();
    await remote.upsert('profiles', [{ user_id: uid }]);
    for (const batch of chunks(attempts, BATCH_SIZE)) {
      await remote.upsert('attempts', batch.map((a) => attemptRow(a, uid)));
      result.attemptIds.push(...batch.map((a) => a.id)); // recorded per batch: a later failure keeps these
    }
    for (const batch of chunks(checks, BATCH_SIZE)) {
      await remote.upsert('listen_checks', batch.map((c) => listenRow(c, uid)));
      result.listenIds.push(...batch.map((c) => c.id));
    }
    // The progress summary is derived from the local log. shortcut: if only this call fails it is
    // refreshed by the next sync that has something to send, not retried on its own.
    const progress = buildProgress(
      items,
      profile.attempts,
      profile.listenChecks,
      { listenCheckRequired: profile.settings.listenCheckRequired, unlockAll: profile.settings.unlockAll },
      now,
    );
    const rows = [...progress.values()].filter((p) => p.attempts > 0).map((p) => progressRow(p, uid));
    if (rows.length > 0) await remote.upsert('progress', rows);
  } catch (e) {
    result.error = describe(e);
  }
  return result;
}
