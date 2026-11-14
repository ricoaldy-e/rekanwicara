import type { VideoInput } from '../data/words';

/** "0:03" from milliseconds (rounded to the nearest second). */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "2,1 MB" (decimal comma, as the app's text uses); under 0,1 MB it says "< 0,1 MB". */
export function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 0.1 ? '< 0,1 MB' : `${mb.toFixed(1).replace('.', ',')} MB`;
}

/** The last part of a path or URI, for the name shown on the video card. */
export const fileName = (pathOrUri: string): string => pathOrUri.split('/').pop() || pathOrUri;

/** Name and facts of a video in a form. A stored video (edit) has no local size or length to show. */
export function describeVideo(v: VideoInput): { name: string; length: string | null; size: string | null } {
  if (v.kind === 'kept') return { name: fileName(v.path), length: null, size: null };
  return { name: fileName(v.file.uri), length: formatDuration(v.file.durationMs), size: formatSize(v.file.fileSize) };
}
