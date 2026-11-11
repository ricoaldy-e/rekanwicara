import fs from 'fs';
import path from 'path';

import type { Item } from '../src/api/types';
import { BATCH_SIZE, attemptRow, syncPending, type Remote, type Table } from '../src/data/sync';
import {
  addAttempt,
  addListenCheck,
  makeUuid,
  markSynced,
  newProfile,
  parseProfile,
  pendingCount,
  type Attempt,
  type Profile,
} from '../src/user/pure';

const item = (item_id: string, level: number): Item => ({
  item_id, level, text: item_id, units: ['a'], priority: 'required', emoji: null, active: true,
}); // fmt: skip
const ITEMS = [item('l1_a', 1), item('l3_mama', 3)];

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    id: makeUuid(), itemId: 'l1_a', level: 1, sessionId: 's1', at: '2026-11-11T08:00:00.000Z',
    overall: 'hijau', score: 1, indicators: { bibir: 'hijau', suara: 'hijau' }, hintId: 'ok_good',
    scorer: 'rules', engineVersion: '0.1.0', synced: false, ...over,
  }; // fmt: skip
}

/** A fake Supabase: stores rows by table and id (an upsert replaces), and can be switched offline. */
class FakeRemote implements Remote {
  online = true;
  failTable: Table | null = null;
  rows: Record<Table, Map<string, Record<string, unknown>>> = {
    profiles: new Map(), attempts: new Map(), listen_checks: new Map(), progress: new Map(),
  }; // fmt: skip
  calls: Table[] = [];
  async ensureUser() {
    if (!this.online) throw new Error('Network request failed');
    return '11111111-1111-4111-8111-111111111111';
  }
  async upsert(table: Table, rows: Record<string, unknown>[]) {
    if (!this.online || this.failTable === table) throw new Error(`${table}: refused`);
    this.calls.push(table);
    for (const r of rows) this.rows[table].set(String(r.id ?? r.user_id) + (table === 'progress' ? `/${r.item_id}` : ''), r);
  }
}

function withAttempts(n: number): Profile {
  let p = newProfile();
  for (let k = 0; k < n; k++) p = addAttempt(p, attempt());
  return p;
}

describe('syncPending', () => {
  it('sends pending attempts, listen checks and the progress summary', async () => {
    const remote = new FakeRemote();
    let p = withAttempts(2);
    p = addListenCheck(p, { id: makeUuid(), itemId: 'l1_a', result: 'jelas', at: '2026-11-11T09:00:00.000Z', synced: false });
    const res = await syncPending(p, ITEMS, remote);
    expect(res.error).toBeNull();
    expect(res.attemptIds).toHaveLength(2);
    expect(res.listenIds).toHaveLength(1);
    expect(remote.rows.attempts.size).toBe(2);
    expect(remote.rows.listen_checks.size).toBe(1);
    expect(remote.rows.profiles.size).toBe(1);
    expect([...remote.rows.progress.values()][0]).toMatchObject({ item_id: 'l1_a', stage: 'berlatih', sessions_count: 1 });
  });

  it('maps an attempt to the SPEC §9 columns, owned by the Supabase user', () => {
    const a = attempt();
    expect(attemptRow(a, 'uid')).toEqual({
      id: a.id, user_id: 'uid', session_id: 's1', item_id: 'l1_a', level: 1, status: 'ok', overall: 'hijau',
      score: 1, indicators: { bibir: 'hijau', suara: 'hijau' }, hint_id: 'ok_good', scorer: 'rules',
      engine_version: '0.1.0', created_at: '2026-11-11T08:00:00.000Z',
    }); // fmt: skip
  });

  it('does nothing when nothing is pending, without even contacting the server', async () => {
    const remote = new FakeRemote();
    const res = await syncPending(newProfile(), ITEMS, remote);
    expect(res).toEqual({ attemptIds: [], listenIds: [], error: null });
    const sent = withAttempts(1);
    const allSynced = markSynced(sent, new Set(sent.attempts.map((a) => a.id)), new Set());
    expect(await syncPending(allSynced, ITEMS, remote)).toEqual({ attemptIds: [], listenIds: [], error: null });
    expect(remote.calls).toEqual([]);
  });

  it('offline: nothing is marked sent, the queue stays, then it goes through when online again', async () => {
    const remote = new FakeRemote();
    let p = withAttempts(3);
    remote.online = false;
    const offline = await syncPending(p, ITEMS, remote);
    expect(offline.error).toMatch(/network/i);
    expect(offline.attemptIds).toEqual([]);
    p = markSynced(p, new Set(offline.attemptIds), new Set(offline.listenIds));
    expect(pendingCount(p)).toBe(3);

    remote.online = true;
    const online = await syncPending(p, ITEMS, remote);
    expect(online.error).toBeNull();
    p = markSynced(p, new Set(online.attemptIds), new Set(online.listenIds));
    expect(pendingCount(p)).toBe(0);
    expect(remote.rows.attempts.size).toBe(3);
  });

  it('sending the same attempt twice (a lost reply) never makes a duplicate row', async () => {
    const remote = new FakeRemote();
    const p = withAttempts(2);
    await syncPending(p, ITEMS, remote);
    await syncPending(p, ITEMS, remote); // the caller never learnt the first one succeeded
    expect(remote.rows.attempts.size).toBe(2);
  });

  it('a failure in the middle keeps what already arrived and retries only the rest', async () => {
    const remote = new FakeRemote();
    const p = withAttempts(BATCH_SIZE + 5);
    let calls = 0;
    const flaky: Remote = {
      ensureUser: () => remote.ensureUser(),
      upsert: async (table, rows) => {
        if (table === 'attempts' && ++calls === 2) throw new Error('attempts: timeout'); // second batch fails
        return remote.upsert(table, rows);
      },
    };
    const first = await syncPending(p, ITEMS, flaky);
    expect(first.error).toMatch(/timeout/);
    expect(first.attemptIds).toHaveLength(BATCH_SIZE);
    const left = markSynced(p, new Set(first.attemptIds), new Set());
    expect(pendingCount(left)).toBe(5);
    const second = await syncPending(left, ITEMS, remote);
    expect(second.attemptIds).toHaveLength(5);
    expect(remote.rows.attempts.size).toBe(BATCH_SIZE + 5);
  });

  it('a server that refuses the rows (e.g. RLS) is reported and nothing is marked sent', async () => {
    const remote = new FakeRemote();
    remote.failTable = 'attempts';
    const res = await syncPending(withAttempts(1), ITEMS, remote);
    expect(res.error).toMatch(/attempts: refused/);
    expect(res.attemptIds).toEqual([]);
  });

  it('attempts recorded while a sync is running stay pending', async () => {
    const remote = new FakeRemote();
    const before = withAttempts(1);
    const res = await syncPending(before, ITEMS, remote);
    const during = addAttempt(before, attempt()); // arrives after the snapshot was taken
    const after = markSynced(during, new Set(res.attemptIds), new Set(res.listenIds));
    expect(pendingCount(after)).toBe(1);
  });
});

describe('stored profile with attempts', () => {
  it('round-trips attempts, listen checks and settings', () => {
    const p = addListenCheck(addAttempt(newProfile(), attempt()), {
      id: makeUuid(), itemId: 'l3_mama', result: 'belum_jelas', at: '2026-11-11T09:00:00.000Z', synced: true,
    }); // fmt: skip
    p.settings = { sessionMinutes: 15, listenCheckRequired: true, unlockAll: true };
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });

  it('drops the B2 format (no times or sessions) and damaged records, keeps the rest', () => {
    const good = attempt();
    const raw = JSON.stringify({
      ...newProfile(),
      attempts: [good, { itemId: 'l1_a' }, { ...good, id: 'x', overall: 'biru' }, 'oops', { ...good, id: 'y', score: 7 }],
    });
    expect(parseProfile(raw).attempts).toEqual([good]);
    const b2 = JSON.stringify({ ...newProfile(), attempts: { l1_a: ['hijau', 'merah'] } });
    expect(parseProfile(b2).attempts).toEqual([]);
  });

  it('falls back to default settings for unknown values', () => {
    const raw = JSON.stringify({ ...newProfile(), settings: { sessionMinutes: 7, unlockAll: 'yes' } });
    expect(parseProfile(raw).settings).toEqual({ sessionMinutes: 10, listenCheckRequired: false, unlockAll: false });
  });

  it('makeUuid has the uuid v4 shape', () => {
    expect(makeUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('docs/supabase/schema.sql', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../docs/supabase/schema.sql'), 'utf8');

  it.each(['profiles', 'attempts', 'progress', 'listen_checks'])('%s has RLS and own-row policies', (table) => {
    expect(sql).toContain(`create table if not exists public.${table}`);
    expect(sql).toMatch(new RegExp(`alter table public\\.${table}\\s+enable row level security`));
    for (const verb of ['select', 'insert', 'update']) {
      expect(sql).toMatch(new RegExp(`create policy "${table}: ${verb} own" on public\\.${table} for ${verb} to authenticated`));
    }
  });

  it('every policy is tied to auth.uid() and none allows delete or anonymous (anon role) access', () => {
    const policies = sql.split('create policy').slice(1);
    expect(policies).toHaveLength(12);
    for (const p of policies) {
      expect(p).toContain('(select auth.uid()) = user_id');
      expect(p).toContain('to authenticated');
      expect(p).not.toMatch(/for delete|to anon|using \(true\)/);
    }
  });

  it('can be run twice (drop policy if exists before each policy)', () => {
    expect(sql.match(/drop policy if exists/g)).toHaveLength(12);
  });

  it('stores no media columns', () => {
    const code = sql.replace(/--.*$/gm, ''); // the header comment says "no video or audio"
    expect(code).not.toMatch(/\b(video|audio|recording|bytea)\b/i);
  });
});
