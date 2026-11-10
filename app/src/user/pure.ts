/** Local user state without any storage or UI: ids, PIN rule, recent attempts, today's mission. */

import type { Item, Status } from '../api/types';

/** SPEC §8.4 keeps the last 10 attempts per item. */
export const MAX_HISTORY = 10;

export type AttemptHistory = Record<string, Status[]>;

export interface Profile {
  /** Sent as `user_id` to the server (letters, digits, _ and -; max 64). B3 replaces it with auth.uid(). */
  userId: string;
  onboarded: boolean;
  consentUser: boolean;
  consentCompanion: boolean;
  /** True once the server reported calibration_complete. */
  calibrated: boolean;
  attempts: AttemptHistory;
}

/** Random id with a prefix, e.g. `u_3fa91c...`. shortcut: Math.random is not cryptographic; it is only an id. */
export function makeId(prefix: string): string {
  let hex = '';
  while (hex.length < 24) hex += Math.floor(Math.random() * 16).toString(16);
  return `${prefix}_${hex}`;
}

export function newProfile(): Profile {
  return {
    userId: makeId('u'),
    onboarded: false,
    consentUser: false,
    consentCompanion: false,
    calibrated: false,
    attempts: {},
  };
}

/** Parses stored JSON defensively; anything unexpected falls back to a fresh profile. */
export function parseProfile(raw: string | null): Profile {
  if (!raw) return newProfile();
  try {
    const p = JSON.parse(raw) as Partial<Profile>;
    if (typeof p.userId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(p.userId)) return newProfile();
    const attempts: AttemptHistory = {};
    for (const [id, list] of Object.entries(p.attempts ?? {})) {
      if (Array.isArray(list)) attempts[id] = list.filter(isStatus).slice(-MAX_HISTORY);
    }
    return {
      userId: p.userId,
      onboarded: p.onboarded === true,
      consentUser: p.consentUser === true,
      consentCompanion: p.consentCompanion === true,
      calibrated: p.calibrated === true,
      attempts,
    };
  } catch {
    return newProfile();
  }
}

function isStatus(v: unknown): v is Status {
  return v === 'hijau' || v === 'kuning' || v === 'merah';
}

/** Appends one attempt, keeping the newest MAX_HISTORY. Returns a new object. */
export function recordAttempt(history: AttemptHistory, itemId: string, status: Status): AttemptHistory {
  return { ...history, [itemId]: [...(history[itemId] ?? []), status].slice(-MAX_HISTORY) };
}

export function lastStatus(history: AttemptHistory, itemId: string): Status | null {
  const list = history[itemId];
  return list && list.length > 0 ? list[list.length - 1] : null;
}

/** Companion PIN: exactly four digits. */
export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** First item whose latest attempt is not green; when everything is green, the first item. */
export function pickMission(items: Item[], history: AttemptHistory): Item | null {
  if (items.length === 0) return null;
  return items.find((it) => lastStatus(history, it.item_id) !== 'hijau') ?? items[0];
}
