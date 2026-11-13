/**
 * Supabase version of the companion word store (kontrak §6). **Not tested and not switched on**: the tables
 * `custom_words`, `custom_syllables`, `custom_videos` and the bucket `rekan-wicara-tutorials` do not exist in
 * docs/supabase/schema.sql yet, and storing videos of faces needs decision K1. Column names follow src/data/words.ts.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { BUCKET, type WordStore } from './words';

export function createSupabaseWordStore(client: SupabaseClient, uid: string): WordStore {
  const fail = (error: { message: string } | null) => {
    if (error) throw new Error(error.message);
  };
  return {
    uid,
    async list() {
      const [w, s, v] = await Promise.all([
        client.from('custom_words').select('id, text, instruction').eq('user_id', uid),
        client.from('custom_syllables').select('id, word_id, text, position, instruction').eq('user_id', uid),
        client.from('custom_videos').select('material_id, word_id, storage_path, sort_order').eq('user_id', uid),
      ]);
      fail(w.error);
      fail(s.error);
      fail(v.error);
      return (w.data ?? []).map((word) => ({
        word,
        syllables: (s.data ?? []).filter((x) => x.word_id === word.id),
        videos: (v.data ?? []).filter((x) => x.word_id === word.id),
      }));
    },
    async insertWord(row) {
      fail((await client.from('custom_words').insert({ ...row, user_id: uid })).error);
    },
    async insertSyllables(rows) {
      fail((await client.from('custom_syllables').insert(rows.map((r) => ({ ...r, user_id: uid })))).error);
    },
    async insertVideos(rows) {
      fail((await client.from('custom_videos').insert(rows.map((r) => ({ ...r, user_id: uid })))).error);
    },
    async replace({ word, syllables, videos }) {
      // Not atomic: the caller only removes old files after this whole call succeeded.
      fail((await client.from('custom_words').update({ text: word.text, instruction: word.instruction }).eq('id', word.id)).error);
      fail((await client.from('custom_syllables').delete().eq('word_id', word.id).not('id', 'in', `(${syllables.map((s) => `"${s.id}"`).join(',')})`)).error);
      if (syllables.length) fail((await client.from('custom_syllables').upsert(syllables.map((r) => ({ ...r, user_id: uid })))).error);
      fail((await client.from('custom_videos').delete().eq('word_id', word.id)).error);
      fail((await client.from('custom_videos').insert(videos.map((r) => ({ ...r, user_id: uid })))).error);
    },
    async deleteWord(id) {
      fail((await client.from('custom_words').delete().eq('id', id)).error);
    },
    async upload(path, file, onProgress) {
      const body = await (await fetch(file.uri)).arrayBuffer();
      fail((await client.storage.from(BUCKET).upload(path, body, { contentType: file.mimeType, upsert: false })).error);
      onProgress?.(1); // supabase-js upload has no progress events
    },
    async removeFiles(paths) {
      fail((await client.storage.from(BUCKET).remove(paths)).error);
    },
    async queueRemoval() {
      // shortcut: no persistent retry queue for Supabase yet; add one when the tables exist (K1).
    },
  };
}
