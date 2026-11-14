import { File, UploadTask, UploadType } from 'expo-file-system';

import { ApiError, httpError } from './apiError';
import type { UploadFile } from './types';
import { UPLOAD_TIMEOUT_MS, type UploadCallOptions } from './upload';

/** Native foreground uploads for speech experiments; never retries or copies the recording. */
export async function uploadNative(url: string, file: UploadFile, opts: UploadCallOptions = {}, parameters?: Record<string, string>, headers?: Record<string, string>): Promise<unknown> {
  if (opts.signal?.aborted) throw new ApiError('cancelled', 'Upload cancelled');
  let recording: File;
  try {
    recording = new File(file.uri);
    if (!recording.exists || recording.size <= 0) throw new Error('Recording unavailable');
  } catch {
    throw new ApiError('file', 'Local recording unavailable');
  }
  const task = new UploadTask(recording, url, {
    uploadType: UploadType.MULTIPART,
    httpMethod: 'POST',
    fieldName: 'file',
    mimeType: file.type,
    parameters,
    sessionType: 'foreground',
    headers: { Accept: 'application/json', ...headers },
    signal: opts.signal,
    onProgress: ({ bytesSent, totalBytes }) => {
      // iOS can deliver Int64 counters as BigInt despite the SDK's number types.
      const loaded = Number(bytesSent);
      const total = Number(totalBytes);
      opts.onProgress?.({ loaded, total, fraction: total > 0 ? Math.min(loaded / total, 1) : null });
    },
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    task.cancel();
  }, opts.timeoutMs ?? UPLOAD_TIMEOUT_MS);
  try {
    opts.onProgress?.({ loaded: 0, total: 0, fraction: null });
    const response = await task.uploadAsync();
    let body: unknown;
    try {
      body = JSON.parse(response.body);
    } catch {
      if (response.status < 200 || response.status >= 300) throw httpError(response.status, null);
      throw new ApiError('parse', 'Invalid upload response');
    }
    if (response.status < 200 || response.status >= 300) throw httpError(response.status, body);
    return body;
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', 'Upload timed out');
    if (opts.signal?.aborted) throw new ApiError('cancelled', 'Upload cancelled');
    if (error instanceof ApiError) throw error;
    throw new ApiError('network', 'Upload failed');
  } finally {
    clearTimeout(timer);
    task.release();
  }
}
