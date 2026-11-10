import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RecordingCondition } from '../api/types';
import { buildSessionScript, type ClipSpec, type SpeakerId } from './script';

/**
 * A dataset recording session that survives app restarts (resume where it stopped).
 * Re-uploading a clip is safe: the server overwrites the same clip_id (A0).
 */

export const SESSION_STORAGE_KEY = 'cw.datasetSession.v1';

export interface DatasetSession {
  version: 1;
  session_id: string;
  speaker_id: SpeakerId;
  condition: RecordingCondition;
  device?: string;
  created_at: string;
  clips: ClipSpec[];
  /** Keys of clips the server confirmed. */
  done: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** e.g. P2_20261111_0930: letters, digits and "_" only (server ID pattern). */
export function makeSessionId(speaker: SpeakerId, now: Date = new Date()): string {
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  return `${speaker}_${date}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function createSession(
  speaker: SpeakerId,
  condition: RecordingCondition,
  device: string | undefined,
  now: Date = new Date(),
  random: () => number = Math.random,
): DatasetSession {
  return {
    version: 1,
    session_id: makeSessionId(speaker, now),
    speaker_id: speaker,
    condition,
    device,
    created_at: now.toISOString(),
    clips: buildSessionScript(condition, random),
    done: [],
  };
}

/** Index of the first clip not yet saved, or -1 when the session is complete. */
export function nextClipIndex(session: DatasetSession): number {
  const done = new Set(session.done);
  return session.clips.findIndex((c) => !done.has(c.key));
}

export function isComplete(session: DatasetSession): boolean {
  return nextClipIndex(session) === -1;
}

export function markDone(session: DatasetSession, key: string): DatasetSession {
  if (session.done.includes(key)) return session;
  return { ...session, done: [...session.done, key] };
}

function isSession(value: unknown): value is DatasetSession {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<DatasetSession>;
  return s.version === 1 && typeof s.session_id === 'string' && Array.isArray(s.clips) && Array.isArray(s.done);
}

export async function loadSession(): Promise<DatasetSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSession(parsed) ? parsed : null;
  } catch {
    return null; // unreadable state: start fresh rather than crash
  }
}

export async function saveSession(session: DatasetSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}
