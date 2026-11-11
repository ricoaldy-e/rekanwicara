/** Local user state without any storage or UI: ids, PIN rule, attempts, settings, sync bookkeeping. */

import type { AnalyzeResponse, Status } from '../api/types';

/** Oldest attempts are dropped beyond this; AsyncStorage holds one JSON string (small, not a database). */
export const MAX_ATTEMPTS = 2000;
const MAX_LISTEN_CHECKS = 500;

export type SessionMinutes = 5 | 10 | 15;
export const SESSION_MINUTES: readonly SessionMinutes[] = [5, 10, 15];

/** Companion settings (SPEC §8.1) and the demo switch that opens every material. */
export interface Settings {
  sessionMinutes: SessionMinutes;
  /** SPEC §8.4: Level 3 also needs one "jelas" Uji Dengar to pass. */
  listenCheckRequired: boolean;
  unlockAll: boolean;
}

export const DEFAULT_SETTINGS: Settings = { sessionMinutes: 10, listenCheckRequired: false, unlockAll: false };

/** One scored attempt (SPEC §9 `attempts`). Retry results are never stored. */
export interface Attempt {
  /** UUID made on the phone: re-sending the same attempt to Supabase is an upsert, never a duplicate. */
  id: string;
  itemId: string;
  level: number;
  sessionId: string;
  /** ISO time of the analysis. */
  at: string;
  overall: Status;
  score: number;
  indicators: { bibir: Status | null; suara: Status };
  hintId: string;
  scorer: string;
  engineVersion: string;
  synced: boolean;
}

export type ListenResult = 'jelas' | 'belum_jelas';

/** SPEC §9 `listen_checks`: the companion judged whether the spoken word was clear. */
export interface ListenCheck {
  id: string;
  itemId: string;
  result: ListenResult;
  at: string;
  synced: boolean;
}

export interface Profile {
  /** Sent as `user_id` to the server (calibration key). Supabase rows use auth.uid() instead. */
  userId: string;
  onboarded: boolean;
  consentUser: boolean;
  consentCompanion: boolean;
  /** True once the server reported calibration_complete. */
  calibrated: boolean;
  settings: Settings;
  attempts: Attempt[];
  listenChecks: ListenCheck[];
}

/** Random id with a prefix, e.g. `u_3fa91c...`. shortcut: Math.random is not cryptographic; it is only an id. */
export function makeId(prefix: string): string {
  let hex = '';
  while (hex.length < 24) hex += Math.floor(Math.random() * 16).toString(16);
  return `${prefix}_${hex}`;
}

/** UUID v4 shape for Supabase `uuid` columns. shortcut: Math.random, not crypto; collisions are astronomically unlikely. */
export function makeUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function newProfile(): Profile {
  return {
    userId: makeId('u'),
    onboarded: false,
    consentUser: false,
    consentCompanion: false,
    calibrated: false,
    settings: { ...DEFAULT_SETTINGS },
    attempts: [],
    listenChecks: [],
  };
}

const isStatus = (v: unknown): v is Status => v === 'hijau' || v === 'kuning' || v === 'merah';
const isIso = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;

/** A stored attempt, or null when the record is damaged (it is dropped, not repaired). */
export function parseAttempt(raw: unknown): Attempt | null {
  const a = raw as Partial<Attempt> | null;
  if (!a || typeof a !== 'object') return null;
  const ind = a.indicators;
  if (
    !isText(a.id) || !isText(a.itemId) || !isText(a.sessionId) || !isIso(a.at) || !isStatus(a.overall) ||
    typeof a.level !== 'number' || !Number.isInteger(a.level) || a.level < 0 || a.level > 4 ||
    typeof a.score !== 'number' || !(a.score >= 0 && a.score <= 1) ||
    !ind || !isStatus(ind.suara) || !(ind.bibir === null || isStatus(ind.bibir)) ||
    !isText(a.hintId) || !isText(a.scorer) || !isText(a.engineVersion)
  ) {
    return null;
  } // fmt: skip
  return {
    id: a.id,
    itemId: a.itemId,
    level: a.level,
    sessionId: a.sessionId,
    at: a.at,
    overall: a.overall,
    score: a.score,
    indicators: { bibir: ind.bibir, suara: ind.suara },
    hintId: a.hintId,
    scorer: a.scorer,
    engineVersion: a.engineVersion,
    synced: a.synced === true,
  };
}

export function parseListenCheck(raw: unknown): ListenCheck | null {
  const c = raw as Partial<ListenCheck> | null;
  if (!c || typeof c !== 'object') return null;
  if (!isText(c.id) || !isText(c.itemId) || !isIso(c.at) || (c.result !== 'jelas' && c.result !== 'belum_jelas')) {
    return null;
  }
  return { id: c.id, itemId: c.itemId, result: c.result, at: c.at, synced: c.synced === true };
}

function parseSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  return {
    sessionMinutes: SESSION_MINUTES.includes(s.sessionMinutes as SessionMinutes)
      ? (s.sessionMinutes as SessionMinutes)
      : DEFAULT_SETTINGS.sessionMinutes,
    listenCheckRequired: s.listenCheckRequired === true,
    unlockAll: s.unlockAll === true,
  };
}

/**
 * Parses stored JSON defensively; anything unexpected falls back to a fresh profile or drops the
 * damaged record. B2 stored attempts as `{ itemId: Status[] }` (no times, no sessions): that format
 * cannot feed the §8.4 rules, so it is dropped.
 */
export function parseProfile(raw: string | null): Profile {
  if (!raw) return newProfile();
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    if (typeof p.userId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(p.userId)) return newProfile();
    return {
      userId: p.userId,
      onboarded: p.onboarded === true,
      consentUser: p.consentUser === true,
      consentCompanion: p.consentCompanion === true,
      calibrated: p.calibrated === true,
      settings: parseSettings(p.settings),
      attempts: Array.isArray(p.attempts)
        ? p.attempts.flatMap((a) => parseAttempt(a) ?? []).slice(-MAX_ATTEMPTS)
        : [],
      listenChecks: Array.isArray(p.listenChecks)
        ? p.listenChecks.flatMap((c) => parseListenCheck(c) ?? []).slice(-MAX_LISTEN_CHECKS)
        : [],
    };
  } catch {
    return newProfile();
  }
}

/** The attempt to store for an analysis result, or null for a retry (not an attempt, SPEC §8.4). */
export function attemptFromResponse(res: AnalyzeResponse, sessionId: string, now = new Date()): Attempt | null {
  if (res.status !== 'ok' || !res.overall || !res.indicators || res.score === null) return null;
  return {
    id: makeUuid(),
    itemId: res.item_id,
    level: res.level,
    sessionId,
    at: now.toISOString(),
    overall: res.overall,
    score: res.score,
    indicators: { bibir: res.indicators.bibir, suara: res.indicators.suara },
    hintId: res.hint_id,
    scorer: res.scorer,
    engineVersion: res.engine_version,
    synced: false,
  };
}

export function addAttempt(profile: Profile, attempt: Attempt): Profile {
  return { ...profile, attempts: [...profile.attempts, attempt].slice(-MAX_ATTEMPTS) };
}

export function addListenCheck(profile: Profile, check: ListenCheck): Profile {
  return { ...profile, listenChecks: [...profile.listenChecks, check].slice(-MAX_LISTEN_CHECKS) };
}

export function pendingCount(profile: Profile): number {
  return profile.attempts.filter((a) => !a.synced).length + profile.listenChecks.filter((c) => !c.synced).length;
}

/** Marks exactly the given ids as sent; records added while a sync was running stay pending. */
export function markSynced(profile: Profile, attemptIds: ReadonlySet<string>, listenIds: ReadonlySet<string>): Profile {
  return {
    ...profile,
    attempts: profile.attempts.map((a) => (attemptIds.has(a.id) ? { ...a, synced: true } : a)),
    listenChecks: profile.listenChecks.map((c) => (listenIds.has(c.id) ? { ...c, synced: true } : c)),
  };
}

/** Companion PIN: exactly four digits. */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
