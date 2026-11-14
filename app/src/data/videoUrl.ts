/** Model videos live in Supabase Storage (kontrak §4: `videos[0]` = { bucket, path }); the app plays a short-lived signed URL. */
import type { VideoRef } from '../api/types';
import { USE_MOCK } from '../config';
import { getClient, isSupabaseConfigured } from './supabase';

const SIGNED_URL_SECONDS = 300;

/** The playable URL, null when there is no video to play, or a rejection when Storage cannot be reached. */
export async function signedVideoUrl(ref: VideoRef): Promise<string | null> {
  if (ref.available === false || USE_MOCK || !isSupabaseConfigured) return null;
  // The server already checks paths; this only refuses a path that could leave the bucket folder.
  if (ref.path.split('/').some((part) => part === '' || part === '.' || part === '..') || ref.path.includes('\\')) return null;
  const { data, error } = await getClient().storage.from(ref.bucket).createSignedUrl(ref.path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error('Signed video URL unavailable');
  return data.signedUrl;
}
