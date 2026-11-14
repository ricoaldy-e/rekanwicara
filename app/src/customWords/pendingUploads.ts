import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PendingUpload { wordId: string; path: string; uncertain: boolean }
let writing: Promise<unknown> = Promise.resolve();

function key(uid: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(uid)) throw new Error('ID akun tidak valid.');
  return `rw.pendingCustomUploads.${uid}`;
}

async function read(uid: string): Promise<PendingUpload[]> {
  const raw = await AsyncStorage.getItem(key(uid));
  if (!raw) return [];
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values) || values.some((value) => !value || typeof value.path !== 'string' ||
      typeof value.wordId !== 'string' || typeof value.uncertain !== 'boolean')) throw new Error('Antrean video belum dapat dibaca.');
  return values;
}

export async function pendingUploads(uid: string): Promise<PendingUpload[]> {
  await writing;
  return read(uid);
}

/** Persist only Storage references, never a local recording URI, password or token. */
export function updatePendingUploads(uid: string, change: (rows: PendingUpload[]) => PendingUpload[]): Promise<void> {
  const next = writing.then(async () => {
    await AsyncStorage.setItem(key(uid), JSON.stringify(change(await read(uid))));
  });
  writing = next.catch(() => undefined);
  return next;
}
