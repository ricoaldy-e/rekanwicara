/** Companion videos for playback (kontrak §6). Never store the URL; ask again when it is needed. */
import type { VideoRef } from '../api/types';
import { USE_MOCK } from '../config';
import { mockFileUri, mockWordStore } from '../mock/words';
import type { WordStore } from './words';

/** Design fixtures use the mock store. Live forms use customWords/service and the existing RPC-backed API. */
export function getWordStore(): WordStore | null {
  return USE_MOCK ? mockWordStore : null;
}

/** A playable URL for a stored companion video, or null (sample word, or not available). */
export async function videoUrl(ref: VideoRef): Promise<string | null> {
  if (USE_MOCK) return mockFileUri(ref.path);
  return null; // shortcut: Supabase createSignedUrl comes with the tables and bucket (K1)
}
