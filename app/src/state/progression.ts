/**
 * SPEC §8.4 progression rules. Pure TypeScript: no React, no storage, no clock (callers pass `now`).
 *
 * Reading of the SPEC where it is open (each choice has a test):
 * - passed ("lulus"): at least 8 green among the last 10 attempts of the item, and those 10 attempts
 *   span at least 2 sessions. Fewer than 10 attempts never pass. Retry results are not attempts.
 * - Level 3 with "Uji Dengar required": also needs one "jelas" listen check.
 * - review: due 1, 3, 7 and 14 days after passing; a green attempt made at or after the due time
 *   completes it, and the next review is never earlier than one day after that.
 * - stuck ("macet"): fewer than 40% green over the item's last 3 sessions (at least 6 attempts).
 * - pattern: blocked until at least 5 attempts and 80% green over the last 10; then random.
 * - feedback: Level 3 shows only the overall status on every 2nd attempt of a session, and only while
 *   the pattern is random (so a first attempt always shows the full result).
 */

import type { Item, Status } from '../api/types';

export const PASS_WINDOW = 10;
export const PASS_MIN_GREEN = 8;
export const PASS_MIN_SESSIONS = 2;
export const REVIEW_DAYS = [1, 3, 7, 14] as const;
export const RANDOM_MIN_ATTEMPTS = 5;
export const RANDOM_ACCURACY = 0.8;
export const STUCK_SESSIONS = 3;
export const STUCK_MIN_ATTEMPTS = 6;
export const STUCK_MAX_GREEN = 0.4;
const DAY_MS = 86_400_000;

export interface AttemptRecord {
  itemId: string;
  sessionId: string;
  /** ISO time. */
  at: string;
  overall: Status;
}

export interface ListenRecord {
  itemId: string;
  result: 'jelas' | 'belum_jelas';
  at: string;
}

export interface Rules {
  listenCheckRequired: boolean;
  /** Companion switch: open every material (for demos). */
  unlockAll: boolean;
}

export type Stage = 'terkunci' | 'berlatih' | 'lulus' | 'ulasan' | 'macet';
export type Pattern = 'berblok' | 'acak';
export type Detail = 'full' | 'overall' | 'hidden';

const ms = (iso: string) => Date.parse(iso);
const iso = (t: number) => new Date(t).toISOString();
const isGreen = (a: AttemptRecord) => a.overall === 'hijau';
const byTime = <T extends { at: string }>(list: readonly T[]): T[] => [...list].sort((a, b) => ms(a.at) - ms(b.at));

// ---------- pass, review, stuck, pattern, feedback ----------

export function meetsPassRule(window: readonly AttemptRecord[]): boolean {
  if (window.length < PASS_WINDOW) return false;
  const green = window.filter(isGreen).length;
  return green >= PASS_MIN_GREEN && new Set(window.map((a) => a.sessionId)).size >= PASS_MIN_SESSIONS;
}

/** When the item was passed (the first time the rule held), or null. `attempts` of one item, any order. */
export function passedAt(
  attempts: readonly AttemptRecord[],
  listen: readonly ListenRecord[],
  needsListen: boolean,
): string | null {
  const sorted = byTime(attempts);
  let when: number | null = null;
  for (let end = PASS_WINDOW; end <= sorted.length; end++) {
    if (meetsPassRule(sorted.slice(end - PASS_WINDOW, end))) {
      when = ms(sorted[end - 1].at);
      break;
    }
  }
  if (when === null) return null;
  if (needsListen) {
    const clear = listen.filter((l) => l.result === 'jelas').map((l) => ms(l.at));
    if (clear.length === 0) return null;
    when = Math.max(when, Math.min(...clear));
  }
  return iso(when);
}

/** Reviews completed so far and when the next one is due (null after the 14-day review). */
export function reviewState(
  attempts: readonly AttemptRecord[],
  passed: string,
): { done: number; dueAt: string | null } {
  const start = ms(passed);
  let done = 0;
  let lastDone = start;
  const dueOf = (n: number) => Math.max(start + REVIEW_DAYS[n] * DAY_MS, n > 0 ? lastDone + DAY_MS : 0);
  for (const a of byTime(attempts)) {
    if (done >= REVIEW_DAYS.length) break;
    if (ms(a.at) >= start && ms(a.at) >= dueOf(done) && isGreen(a)) {
      done++;
      lastDone = ms(a.at);
    }
  }
  return { done, dueAt: done >= REVIEW_DAYS.length ? null : iso(dueOf(done)) };
}

export function isStuck(attempts: readonly AttemptRecord[]): boolean {
  const newestFirst = byTime(attempts).reverse();
  const sessions: string[] = [];
  for (const a of newestFirst) if (!sessions.includes(a.sessionId)) sessions.push(a.sessionId);
  const recent = new Set(sessions.slice(0, STUCK_SESSIONS));
  if (recent.size < STUCK_SESSIONS) return false; // "over 3 sessions" needs three sessions
  const pool = attempts.filter((a) => recent.has(a.sessionId));
  return pool.length >= STUCK_MIN_ATTEMPTS && pool.filter(isGreen).length / pool.length < STUCK_MAX_GREEN;
}

export function patternOf(attempts: readonly AttemptRecord[]): Pattern {
  const last = byTime(attempts).slice(-PASS_WINDOW);
  if (last.length < RANDOM_MIN_ATTEMPTS) return 'berblok';
  return last.filter(isGreen).length / last.length >= RANDOM_ACCURACY ? 'acak' : 'berblok';
}

/** How much of the result to show; `sessionAttempt` counts this attempt (1 = the first of the session). */
export function feedbackDetail(level: number, pattern: Pattern, sessionAttempt: number): Detail {
  if (level !== 3 || pattern !== 'acak') return 'full';
  return sessionAttempt % 2 === 0 ? 'overall' : 'hidden';
}

// ---------- per-item progress ----------

export interface ItemProgress {
  itemId: string;
  stage: Stage;
  locked: boolean;
  pattern: Pattern;
  attempts: number;
  /** Statuses of the last 10 attempts, oldest first. */
  last10: Status[];
  last: Status | null;
  sessions: number;
  passedAt: string | null;
  nextReviewAt: string | null;
}

export function buildProgress(
  items: readonly Item[],
  attempts: readonly AttemptRecord[],
  listen: readonly ListenRecord[],
  rules: Rules,
  now: Date,
): Map<string, ItemProgress> {
  const mine = (id: string) => attempts.filter((a) => a.itemId === id);
  const passed = new Map<string, string>();
  for (const it of items) {
    const when = passedAt(mine(it.item_id), listen.filter((l) => l.itemId === it.item_id), rules.listenCheckRequired && it.level === 3);
    if (when) passed.set(it.item_id, when);
  }

  const out = new Map<string, ItemProgress>();
  for (const it of items) {
    const list = byTime(mine(it.item_id));
    const when = passed.get(it.item_id) ?? null;
    // Level 0-1 are always open; a level opens when one material of the level below is passed.
    const locked =
      !rules.unlockAll &&
      it.level >= 2 &&
      list.length === 0 &&
      !items.some((o) => o.level === it.level - 1 && passed.has(o.item_id));
    const review = when ? reviewState(list, when) : null;
    const dueNow = review?.dueAt != null && ms(review.dueAt) <= now.getTime();
    const stage: Stage = locked
      ? 'terkunci'
      : when
        ? dueNow
          ? 'ulasan'
          : 'lulus'
        : isStuck(list)
          ? 'macet'
          : 'berlatih';
    out.set(it.item_id, {
      itemId: it.item_id,
      stage,
      locked,
      pattern: patternOf(list),
      attempts: list.length,
      last10: list.slice(-PASS_WINDOW).map((a) => a.overall),
      last: list.length > 0 ? list[list.length - 1].overall : null,
      sessions: new Set(list.map((a) => a.sessionId)).size,
      passedAt: when,
      nextReviewAt: review?.dueAt ?? null,
    });
  }
  return out;
}

// ---------- today's session ----------

export type Role = 'pemanasan' | 'ulasan' | 'inti' | 'tantangan';
export interface PlanStep {
  itemId: string;
  role: Role;
  /** Practised today already. */
  done: boolean;
}

/** About one attempt per two minutes, at least three steps. */
export function sessionSlots(minutes: number): number {
  return Math.max(3, Math.round(minutes / 2));
}

/** Small seeded generator (mulberry32): the plan of one day stays the same when the screen redraws. */
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canSchedule(item: Item, progress: ReadonlyMap<string, ItemProgress>): boolean {
  const p = progress.get(item.item_id);
  return p !== undefined && !p.locked && p.stage !== 'macet';
}

/** SPEC §8.4: a stuck core is replaced one level below, then at the same level, in content order. */
export function selectCore(items: readonly Item[], progress: ReadonlyMap<string, ItemProgress>): Item | undefined {
  const candidate = items.find((i) => i.level > 0 && !progress.get(i.item_id)?.locked && ['berlatih', 'macet'].includes(progress.get(i.item_id)?.stage ?? ''));
  if (!candidate || progress.get(candidate.item_id)?.stage !== 'macet') return candidate;
  return items.find((i) => i.level === candidate.level - 1 && canSchedule(i, progress))
    ?? items.find((i) => i.level === candidate.level && canSchedule(i, progress));
}

/** SPEC §8.4 session: warm-up (Level 0), reviews, the core material, a random challenge. */
export function planSession(
  items: readonly Item[],
  progress: ReadonlyMap<string, ItemProgress>,
  attempts: readonly AttemptRecord[],
  minutes: number,
  now: Date,
  rng: () => number,
): PlanStep[] {
  const slots = sessionSlots(minutes);
  const lastTime = (id: string) => Math.max(0, ...attempts.filter((a) => a.itemId === id).map((a) => ms(a.at)));
  const plan: { itemId: string; role: Role }[] = [];

  const warmup = items.filter((i) => i.level === 0 && canSchedule(i, progress)).sort((a, b) => lastTime(a.item_id) - lastTime(b.item_id))[0];
  if (warmup) plan.push({ itemId: warmup.item_id, role: 'pemanasan' });

  const due = items
    .filter((i) => progress.get(i.item_id)?.stage === 'ulasan')
    .sort((a, b) => ms(progress.get(a.item_id)!.nextReviewAt!) - ms(progress.get(b.item_id)!.nextReviewAt!));
  for (const it of due.slice(0, 2)) plan.push({ itemId: it.item_id, role: 'ulasan' });

  const core = selectCore(items, progress);
  const challengePool = items.filter(
    (i) => (progress.get(i.item_id)?.attempts ?? 0) > 0 && canSchedule(i, progress) && !plan.some((p) => p.itemId === i.item_id) && i.item_id !== core?.item_id,
  );
  const challenge = challengePool.length > 0 ? challengePool[Math.floor(rng() * challengePool.length)] : null;
  if (core) {
    // Blocked pattern: repeat the core material (up to 3 times); random pattern: once.
    const repeats = progress.get(core.item_id)?.pattern === 'berblok' ? 3 : 1;
    const room = Math.max(1, slots - plan.length - (challenge ? 1 : 0));
    for (let k = 0; k < Math.min(repeats, room); k++) plan.push({ itemId: core.item_id, role: 'inti' });
  }
  if (challenge) plan.push({ itemId: challenge.item_id, role: 'tantangan' });

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const today = new Map<string, number>();
  for (const a of attempts) if (ms(a.at) >= startOfDay.getTime()) today.set(a.itemId, (today.get(a.itemId) ?? 0) + 1);
  const used = new Map<string, number>();
  return plan.slice(0, slots).map((step) => {
    const n = (used.get(step.itemId) ?? 0) + 1;
    used.set(step.itemId, n);
    return { ...step, done: (today.get(step.itemId) ?? 0) >= n };
  });
}
