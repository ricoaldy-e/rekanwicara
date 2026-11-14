import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ResumePoint {
  kind: 'level_1' | 'word';
  id: string;
  /** One-based lesson step, including the final whole-word step. */
  position: number;
  phase: 'tutorial' | 'record';
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function key(uid: string): string {
  if (!UUID.test(uid)) throw new Error('ID akun tidak valid.');
  return `rw.resume.${uid}`;
}

export function parseResume(value: unknown): ResumePoint | null {
  if (!value || typeof value !== 'object') return null;
  const point = value as Partial<ResumePoint>;
  if ((point.kind !== 'level_1' && point.kind !== 'word') || typeof point.id !== 'string' || !point.id.trim()
      || (point.phase !== 'tutorial' && point.phase !== 'record') || typeof point.position !== 'number'
      || !Number.isSafeInteger(point.position) || point.position < 1) return null;
  return { kind: point.kind, id: point.id, position: point.position, phase: point.phase };
}

export async function readResume(uid: string): Promise<ResumePoint | null> {
  const storageKey = key(uid);
  const value = await AsyncStorage.getItem(storageKey);
  if (value === null) return null;
  try { return parseResume(JSON.parse(value)); } catch { return null; }
}

export async function writeResume(uid: string, point: ResumePoint | null): Promise<void> {
  const storageKey = key(uid);
  if (point === null) { await AsyncStorage.removeItem(storageKey); return; }
  const safe = parseResume(point);
  if (!safe) throw new Error('Posisi latihan tidak valid.');
  await AsyncStorage.setItem(storageKey, JSON.stringify(safe));
}
