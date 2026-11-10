import { File } from 'expo-file-system';

/**
 * Deletes a local recording (cache dir) once it is uploaded or discarded. Never throws: a file that
 * is already gone is fine, and cleanup must not break the recording flow.
 */
export function deleteLocalFile(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // ignore: best-effort cleanup of a cache file
  }
}

/** Upload descriptor for an expo-camera recording. */
export function videoUpload(uri: string, name = 'clip.mp4') {
  return { uri, name, type: 'video/mp4' };
}
