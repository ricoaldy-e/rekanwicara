import { File, UploadTask, type UploadOptions } from 'expo-file-system';

import { uploadNative } from '../src/api/nativeUpload';
import { createApiClient } from '../src/api/client';
import { errorMessage } from '../src/api/errors';
import combinedExample from '../test-fixtures/contract/combined.json';
import type { TutorialItem } from '../src/api/types';

const mockRecording = { exists: true, size: 123 };
const mockUpload = jest.fn();
const mockCancel = jest.fn();
const mockRelease = jest.fn();

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => mockRecording),
  UploadType: { MULTIPART: 1 },
  UploadTask: jest.fn().mockImplementation(() => ({
    uploadAsync: mockUpload, cancel: mockCancel, release: mockRelease,
  })),
}));

const file = { uri: 'synthetic-recording', name: 'clip.mp4', type: 'video/mp4' };
const prediction = { status: 'success', model: 'uni2005', phonetic_prediction: 'm ɑ', inference_ms: 2.5 };
const url = 'http://example.test/v1/experiments/allosaurus';

const tutorial: TutorialItem = {
  item_id: 'kp_tolong_to', word: 'TOLONG', target: 'TO', kind: 'syllable', level: 2, position: 1,
  bucket: 'rekan-wicara-tutorials', storage_path: 'default/syllables/tolong/01-to.mp4', steps: [], present: false,
};
const verified = { status: 'verified', item_id: tutorial.item_id, bucket: tutorial.bucket,
  storage_path: tutorial.storage_path, size_bytes: 123 };
it('uploads a Level 1 v2 attempt with JWT and authoritative item/session fields only', async () => {
  const evaluated = { status: 'evaluated', item_id: 'l1_o', level: 1, result: 'sesuai',
    lip_result: 'sesuai', voice_result: 'sesuai', feedback: { code: 'MATCHED', message: 'Sesuai.' },
    quality_flags: [], visuals: null, engine: 'mediapipe_parselmouth_wav2vec2', processing_ms: 10 };
  mockUpload.mockResolvedValueOnce(response(evaluated));
  await expect(createApiClient('http://example.test').analyzeV2('l1_o', 'session-1', file, 'fresh-token')).resolves.toEqual(evaluated);
  expect(UploadTask).toHaveBeenCalledWith(mockRecording, 'http://example.test/v2/analyze', expect.objectContaining({
    parameters: { item_id: 'l1_o', session_id: 'session-1' },
    headers: { Accept: 'application/json', Authorization: 'Bearer fresh-token' },
  }));
});

it('uploads tutorial with the current bearer and validates the canonical destination', async () => {
  mockUpload.mockResolvedValueOnce(response(verified));
  await expect(createApiClient('http://example.test').uploadTutorial(tutorial, 'fixture-token', file)).resolves.toEqual(verified);
  expect(UploadTask).toHaveBeenCalledWith(mockRecording, 'http://example.test/v1/tutorials/kp_tolong_to/video', expect.objectContaining({
    headers: { Accept: 'application/json', Authorization: 'Bearer fixture-token' },
  }));
});

it.each([{ status: 'ok' }, { ...verified, item_id: 'kp_api_a' }, { ...verified, storage_path: 'wrong.mp4' },
  { ...verified, bucket: 'other' }, { ...verified, size_bytes: 0 }])('does not mark an unverified tutorial response as saved: %j', async (body) => {
  mockUpload.mockResolvedValueOnce(response(body));
  await expect(createApiClient('http://example.test').uploadTutorial(tutorial, 'fixture-token', file)).rejects.toMatchObject({ kind: 'parse' });
});

function response(body: unknown = prediction, status = 200) {
  return { status, body: JSON.stringify(body), headers: {} };
}

function options(): UploadOptions {
  return jest.mocked(UploadTask).mock.calls[0][2]!;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRecording.exists = true;
  mockRecording.size = 123;
  mockUpload.mockReset().mockResolvedValue(response());
  mockCancel.mockReset();
});

it('uses a native foreground multipart task and keeps raw prediction', async () => {
  const api = createApiClient('http://example.test/');
  await expect(api.allosaurus(file)).resolves.toEqual(prediction);
  expect(File).toHaveBeenCalledWith(file.uri);
  expect(UploadTask).toHaveBeenCalledWith(mockRecording, url, expect.objectContaining({
    sessionType: 'foreground', uploadType: 1, fieldName: 'file', mimeType: 'video/mp4',
  }));
  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(mockRelease).toHaveBeenCalledTimes(1);
});

it('uploads to Wav2Vec2 and preserves its free transcription', async () => {
  const body = { status: 'success', model: 'Wikidepia/wav2vec2-xls-r-300m-indonesian', transcription: ' tolong! ', inference_ms: 12 };
  mockUpload.mockResolvedValueOnce(response(body));
  await expect(createApiClient('http://example.test').wav2vec2(file)).resolves.toEqual(body);
  expect(UploadTask).toHaveBeenCalledWith(mockRecording, 'http://example.test/v1/experiments/wav2vec2', expect.any(Object));
});

it('uploads once to the combined endpoint and validates all components', async () => {
  mockUpload.mockResolvedValueOnce(response(combinedExample));
  await expect(createApiClient('http://example.test').combined(file, 'tolong')).resolves.toEqual(combinedExample);
  expect(UploadTask).toHaveBeenCalledWith(mockRecording, 'http://example.test/v1/experiments/combined', expect.objectContaining({ parameters: { target: 'tolong' } }));
  mockUpload.mockResolvedValueOnce(response({ ...combinedExample, visual: null }));
  await expect(createApiClient('http://example.test').combined(file, 'tolong')).rejects.toMatchObject({ kind: 'parse' });
});

it('rejects a combined result for another target', async () => {
  mockUpload.mockResolvedValueOnce(response(combinedExample));
  await expect(createApiClient('http://example.test').combined(file, 'makan')).rejects.toMatchObject({ kind: 'parse' });
});

it.each([
  {}, { status: 'success', model: 'wrong', transcription: '', inference_ms: 1 },
  { status: 'success', model: 'Wikidepia/wav2vec2-xls-r-300m-indonesian', transcription: null, inference_ms: 1 },
  { status: 'success', model: 'Wikidepia/wav2vec2-xls-r-300m-indonesian', transcription: '', inference_ms: -1 },
])('rejects an invalid Wav2Vec2 response', async (body) => {
  mockUpload.mockResolvedValueOnce(response(body));
  await expect(createApiClient('http://example.test').wav2vec2(file)).rejects.toMatchObject({ kind: 'parse' });
});

it('starts with unknown progress, then reports native byte counts', async () => {
  const onProgress = jest.fn();
  mockUpload.mockImplementationOnce(async () => {
    options().onProgress?.({ bytesSent: 5, totalBytes: 10 });
    return response();
  });
  await uploadNative(url, file, { onProgress });
  expect(onProgress.mock.calls.map(([progress]) => progress.fraction)).toEqual([null, 0.5]);
});

it.each([
  [5n, 10n, 0.5],
  [5n, 10, 0.5],
  [5, 10n, 0.5],
  [0n, 0n, null],
])('accepts native iOS BigInt byte counts without crashing', async (bytesSent, totalBytes, fraction) => {
  const onProgress = jest.fn();
  mockUpload.mockImplementationOnce(async () => {
    options().onProgress?.({ bytesSent, totalBytes } as unknown as { bytesSent: number; totalBytes: number });
    return response();
  });
  await expect(uploadNative(url, file, { onProgress })).resolves.toEqual(prediction);
  expect(onProgress).toHaveBeenLastCalledWith({ loaded: Number(bytesSent), total: Number(totalBytes), fraction });
});

it.each(['missing', 'empty'])('rejects a %s recording before upload', async (kind) => {
  mockRecording.exists = kind !== 'missing';
  mockRecording.size = kind === 'empty' ? 0 : 123;
  const error = await uploadNative(url, file).catch((value: unknown) => value);
  expect(error).toMatchObject({ kind: 'file' });
  expect(errorMessage(error)).toBe('Rekaman tidak dapat dibaca. Coba rekam lagi.');
  expect(UploadTask).not.toHaveBeenCalled();
});

it.each([{}, { ...prediction, inference_ms: -1 }, { ...prediction, phonetic_prediction: null }])(
  'rejects an invalid response', async (body) => {
    mockUpload.mockResolvedValueOnce(response(body));
    await expect(createApiClient('http://example.test').allosaurus(file)).rejects.toMatchObject({ kind: 'parse' });
    expect(mockRelease).toHaveBeenCalled();
  },
);

it('keeps server error codes and never retries a failed upload', async () => {
  mockUpload.mockResolvedValueOnce(response({ detail: { code: 'allosaurus_unavailable', message: 'Unavailable' } }, 503));
  await expect(uploadNative(url, file)).rejects.toMatchObject({ kind: 'http', code: 'allosaurus_unavailable' });
  expect(mockUpload).toHaveBeenCalledTimes(1);
  expect(mockRelease).toHaveBeenCalled();
});

it('hides native errors and releases the failed task', async () => {
  mockUpload.mockRejectedValueOnce(new Error('private-recording-path'));
  await expect(uploadNative(url, file)).rejects.toMatchObject({ kind: 'network', message: 'Upload failed' });
  expect(mockRelease).toHaveBeenCalled();
});

it('cancels at the timeout and releases the native task', async () => {
  jest.useFakeTimers();
  try {
    mockUpload.mockImplementationOnce(() => new Promise((_, reject) => {
      mockCancel.mockImplementation(() => reject(new Error('cancelled')));
    }));
    const operation = uploadNative(url, file, { timeoutMs: 50 });
    const assertion = expect(operation).rejects.toMatchObject({ kind: 'timeout' });
    await jest.advanceTimersByTimeAsync(50);
    await assertion;
    expect(mockCancel).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

it('passes cancellation to the native task and handles an abort during upload', async () => {
  const controller = new AbortController();
  mockUpload.mockImplementationOnce(() => new Promise((_, reject) => {
    options().signal?.addEventListener('abort', () => reject(new Error('cancelled')), { once: true });
  }));
  const operation = uploadNative(url, file, { signal: controller.signal });
  controller.abort();
  await expect(operation).rejects.toMatchObject({ kind: 'cancelled' });
  expect(mockRelease).toHaveBeenCalled();
});
