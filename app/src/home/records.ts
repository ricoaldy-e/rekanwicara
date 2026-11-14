import { getCompanionSession } from '../auth/companion';
import { getClient } from '../data/supabase';
import { mapActivities, mapProgress, rows, text } from './mapping';

export class HomeSessionError extends Error {
  constructor() { super('Sesi berakhir atau akun berubah. Silakan login kembali.'); }
}

export async function requireHomeSession(uid: string) {
  const session = await getCompanionSession();
  if (!session || session.user.id !== uid) throw new HomeSessionError();
  return session;
}

/** Metadata only; never queries Storage or downloads tutorial videos. */
export async function loadHomeRecords(uid: string, defaultNames: ReadonlyMap<string, string>) {
  await requireHomeSession(uid);
  const client = getClient();
  const attemptsPromise = client.from('attempts').select('id,user_id,item_id,level,status,overall,created_at')
    .eq('user_id', uid).eq('status', 'ok').order('created_at', { ascending: false })
    .order('id', { ascending: false }).limit(10);
  const progressPromise = (async () => {
    const records: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 200) {
      const response = await client.from('progress').select('user_id,item_id,stage,passed_at')
        .eq('user_id', uid).order('item_id').range(offset, offset + 199);
      if (response.status === 401) throw new HomeSessionError();
      if (response.error) throw new Error('Progres belum dapat dimuat. Coba lagi.');
      const page = rows(response.data);
      records.push(...page);
      if (page.length < 200) break;
    }
    return records;
  })();
  const [attempts, progress] = await Promise.all([attemptsPromise, progressPromise]);
  if (attempts.status === 401) throw new HomeSessionError();
  if (attempts.error) throw new Error('Aktivitas belum dapat dimuat. Coba lagi.');
  await requireHomeSession(uid);
  const recent = rows(attempts.data);
  const names = new Map(defaultNames);
  const wordIds = recent.map((row) => text(row.item_id)).filter((id) => id.startsWith('custom_word:')).map((id) => id.slice(12));
  const syllableIds = recent.map((row) => text(row.item_id)).filter((id) => id.startsWith('custom_syllable:')).map((id) => id.slice(16));
  if (wordIds.length) {
    const response = await client.from('custom_words').select('id,user_id,word').eq('user_id', uid).in('id', wordIds);
    if (response.status === 401) throw new HomeSessionError();
    if (response.error) throw new Error('Nama materi custom belum dapat dimuat.');
    for (const row of rows(response.data)) {
      if (row.user_id !== uid) throw new HomeSessionError();
      names.set(`custom_word:${text(row.id)}`, text(row.word));
    }
  }
  if (syllableIds.length) {
    const response = await client.from('custom_syllables').select('id,syllable,custom_words!inner(user_id)')
      .eq('custom_words.user_id', uid).in('id', syllableIds);
    if (response.status === 401) throw new HomeSessionError();
    if (response.error) throw new Error('Nama suku kata custom belum dapat dimuat.');
    for (const row of rows(response.data)) {
      const parent = row.custom_words;
      if (!parent || typeof parent !== 'object' || !('user_id' in parent) || parent.user_id !== uid) throw new HomeSessionError();
      names.set(`custom_syllable:${text(row.id)}`, text(row.syllable));
    }
  }
  await requireHomeSession(uid);
  return { progress: mapProgress(progress, uid), activities: mapActivities(recent, uid, names) };
}
