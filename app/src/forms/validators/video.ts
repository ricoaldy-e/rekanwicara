/** Pure rule for a chosen video (flow §7.7.3, kontrak §6). Limits come from VIDEO_LIMITS. */
import { VIDEO_LIMITS } from '../limits';
import type { Problem } from '../messages';

export interface VideoInfo {
  mimeType: string;
  fileSize: number;
  durationMs: number;
}

const MB = 1024 * 1024;

/** `null` input = nothing chosen yet. The size in the message is rounded up so it never reads equal to the limit. */
export function videoFile(video: VideoInfo | null): Problem | null {
  if (!video) return 'videoEmpty';
  if (!(VIDEO_LIMITS.types as readonly string[]).includes(video.mimeType.toLowerCase())) return 'videoFormat';
  if (video.fileSize > VIDEO_LIMITS.maxBytes) return { key: 'videoTooBig', vars: { mb: Math.ceil(video.fileSize / MB) } };
  if (video.durationMs > VIDEO_LIMITS.maxDurationMs) return 'videoTooLong';
  return null;
}
