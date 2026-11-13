/** Companion videos for playback (kontrak §6). Never store the URL; ask again when it is needed. */
import type { VideoRef } from '../api/types';
import { USE_MOCK } from '../config';
import { mockFileUri, mockWordStore } from '../mock/words';
import type { WordStore } from './words';

/**
 * The word store in use, or null when companion words are not available: they need the Supabase tables and
 * bucket of decision K1, which do not exist yet, so only the mock has them (see src/data/supabaseWords.ts).
 */
export function getWordStore(): WordStore | null {
  return USE_MOCK ? mockWordStore : null;
}

/** A playable URL for a stored companion video, or null (sample word, or not available). */
export async function videoUrl(ref: VideoRef): Promise<string | null> {
  if (USE_MOCK) return mockFileUri(ref.path);
  return null; // shortcut: Supabase createSignedUrl comes with the tables and bucket (K1)
}
