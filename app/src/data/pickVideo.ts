/**
 * Picking a video for a companion word (not a practice recording: never mixed with recording/localFile.ts).
 * expo-image-picker: `duration` is milliseconds, `fileSize` bytes (checked in the SDK 58 type docs).
 */
import * as ImagePicker from 'expo-image-picker';

import { VIDEO_LIMITS } from '../forms/limits';
import type { VideoFile } from './words';

export type PickResult =
  | { kind: 'picked'; file: VideoFile }
  | { kind: 'cancelled' }
  /** The camera permission was refused. */
  | { kind: 'denied' }
  | { kind: 'error' };

const MIME_BY_EXT: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska' };

function toFile(asset: ImagePicker.ImagePickerAsset): VideoFile {
  const ext = asset.uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? MIME_BY_EXT[ext] ?? 'application/octet-stream',
    // shortcut: a picker that reports no size passes 0; the server limit (413) is the backstop.
    fileSize: asset.fileSize ?? 0,
    durationMs: asset.duration ?? 0,
  };
}

function toResult(res: ImagePicker.ImagePickerResult): PickResult {
  return res.canceled || res.assets.length === 0 ? { kind: 'cancelled' } : { kind: 'picked', file: toFile(res.assets[0]) };
}

export async function pickFromGallery(): Promise<PickResult> {
  try {
    return toResult(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] }));
  } catch {
    return { kind: 'error' };
  }
}

export async function recordWithCamera(): Promise<PickResult> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { kind: 'denied' };
    return toResult(
      await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: VIDEO_LIMITS.maxDurationMs / 1000 }),
    );
  } catch {
    return { kind: 'error' };
  }
}
