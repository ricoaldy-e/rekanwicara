import type { ApiClient } from '../src/api/client';
import { ApiError } from '../src/api/client';
import { contractV2 } from '../test-fixtures/api-v2-contract';
import type { CustomWordDetail } from '../src/api/types';
import { editWord, ownerToken, saveWord, signedVideo, validateRecording, validateWord, wordPayload } from '../src/customWords/service';

const UID = '11111111-1111-4111-8111-111111111111';
const word: CustomWordDetail = contractV2.manualWord;
const mockUser = jest.fn();
const mockSession = jest.fn();
const mockUpload = jest.fn();
const mockSign = jest.fn();
const mockFile = jest.fn();

jest.mock('../src/auth/companion', () => ({ requireCompanionUser: () => mockUser(), getCompanionSession: () => mockSession() }));
jest.mock('../src/data/supabase', () => ({ getClient: () => ({ storage: { from: () => ({ upload: mockUpload, createSignedUrl: mockSign }) } }) }));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => mockFile(uri)) }));

function recording() {
  const bytes = new Uint8Array(24);
  bytes.set([102, 116, 121, 112], 4);
  return { exists: true, size: 24, type: 'video/mp4', arrayBuffer: async () => bytes.buffer };
}

function api() {
  return { createCustomWord: jest.fn().mockResolvedValue(word), updateCustomWord: jest.fn().mockResolvedValue(word),
    getCustomWord: jest.fn().mockResolvedValue({ ...word, video: { ...word.video!, available: true },
      syllables: word.syllables.map((p) => ({ ...p, video: { ...p.video!, available: true } })) }) } as unknown as jest.Mocked<ApiClient>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUser.mockResolvedValue({ id: UID });
  mockSession.mockResolvedValue({ user: { id: UID }, access_token: 'fixture-user-jwt' });
  mockUpload.mockResolvedValue({ error: null });
  mockSign.mockResolvedValue({ data: { signedUrl: 'fixture-signed-url' }, error: null });
  mockFile.mockImplementation(recording);
});

it('prepares a draft before uploading distinct videos by material UUID, then publishes', async () => {
  const client = api();
  const form = { ...editWord(word), localUri: 'synthetic-word',
    syllables: word.syllables.map((p) => ({ ...p, localUri: `synthetic-${p.text}` })) };
  const prepared = jest.fn();
  const progress = jest.fn();
  await saveWord(client, UID, form, 'published', { max_upload_mb: 50 }, prepared, progress);
  expect(client.updateCustomWord.mock.calls.map((c) => c[1].status)).toEqual(['draft', 'published']);
  expect(client.updateCustomWord.mock.invocationCallOrder[0]).toBeLessThan(mockUpload.mock.invocationCallOrder[0]);
  expect(mockUpload.mock.invocationCallOrder[2]).toBeLessThan(client.updateCustomWord.mock.invocationCallOrder[1]);
  expect(mockUpload.mock.calls.map((call) => call[0])).toEqual([word.video!.path, ...word.syllables.map((p) => p.video!.path)]);
  expect(mockUpload).toHaveBeenCalledTimes(3);
  expect(prepared).toHaveBeenCalledWith(word);
  expect(progress.mock.calls).toEqual([[1, 3], [2, 3], [3, 3]]);
  expect(client.updateCustomWord.mock.calls[1][1].revision).toBe(word.revision);
});

it('retains input recordings and never publishes after an upload failure', async () => {
  const client = api();
  const form = { ...editWord(word), localUri: 'synthetic-word', syllables: [] };
  mockUpload.mockResolvedValue({ error: { message: 'fixture-storage-failure' } });
  await expect(saveWord(client, UID, form, 'published', { max_upload_mb: 50 }, jest.fn(), jest.fn())).rejects.toThrow('Kata belum siap');
  expect(client.updateCustomWord).toHaveBeenCalledTimes(1);
  expect(client.updateCustomWord.mock.calls[0][1].status).toBe('draft');
  expect(form.localUri).toBe('synthetic-word');
});

it('does not upload anything if the draft transaction fails', async () => {
  const client = api();
  client.updateCustomWord.mockRejectedValue(new ApiError('http', 'fixture-conflict', 409, 'REVISION_CONFLICT'));
  await expect(saveWord(client, UID, { ...editWord(word), localUri: 'synthetic-word' }, 'draft', { max_upload_mb: 50 }, jest.fn(), jest.fn())).rejects.toThrow();
  expect(mockUpload).not.toHaveBeenCalled();
});

it('reconciles a POST timeout using the same UUID rather than creating another word', async () => {
  const client = api();
  client.createCustomWord.mockRejectedValue(new ApiError('timeout', 'fixture-timeout'));
  const prepared = jest.fn();
  await expect(saveWord(client, UID, { ...editWord(word), isNew: true }, 'draft', { max_upload_mb: 50 }, prepared, jest.fn())).rejects.toThrow();
  expect(client.createCustomWord).toHaveBeenCalledTimes(1);
  expect(client.createCustomWord.mock.calls[0][0].id).toBe(word.id);
  expect(client.getCustomWord).toHaveBeenCalledWith(word.id, 'fixture-user-jwt');
  expect(prepared).toHaveBeenCalled();
  expect(mockUpload).not.toHaveBeenCalled();
});

it('keeps video bindings while moving repeated syllable text', () => {
  const form = editWord(word);
  form.syllables = [...form.syllables].reverse().map((p) => ({ ...p, text: 'KER' }));
  const body = wordPayload(form, 'draft');
  expect(body.syllables.map((p) => p.id)).toEqual([...word.syllables].reverse().map((p) => p.id));
  expect(body.syllables.map((p) => p.position)).toEqual([1, 2]);
});

it('rejects an empty syllable and incomplete publication but accepts an incomplete draft', () => {
  const form = editWord(word);
  expect(() => validateWord(form, 'draft')).not.toThrow();
  expect(() => validateWord(form, 'published')).toThrow('Lengkapi');
  form.syllables[0].text = ' ';
  expect(() => validateWord(form, 'draft')).toThrow('Isi teks');
});

it.each(['missing', 'empty', 'oversized', 'wrong_type'])('rejects a %s recording before upload', (kind) => {
  mockFile.mockImplementation(() => ({ ...recording(), exists: kind !== 'missing', size: kind === 'empty' ? 0 : kind === 'oversized' ? 100_000_000 : 24,
    type: kind === 'wrong_type' ? 'image/jpeg' : 'video/mp4' }));
  expect(() => validateRecording('synthetic-recording', 50)).toThrow();
  expect(mockUpload).not.toHaveBeenCalled();
});

it('rejects a non-video byte header without uploading or publishing', async () => {
  const client = api();
  mockFile.mockImplementation(() => ({ ...recording(), arrayBuffer: async () => new ArrayBuffer(24) }));
  await expect(saveWord(client, UID, { ...editWord(word), localUri: 'synthetic-word' }, 'draft', { max_upload_mb: 50 }, jest.fn(), jest.fn())).rejects.toThrow('Berkas bukan video');
  expect(mockUpload).not.toHaveBeenCalled();
});

it('rejects account changes before REST or Storage writes', async () => {
  mockSession.mockResolvedValue({ user: { id: 'other-account' }, access_token: 'other-fixture-token' });
  await expect(ownerToken(UID)).rejects.toThrow('Akun berubah');
  const client = api();
  await expect(saveWord(client, UID, editWord(word), 'draft', { max_upload_mb: 50 }, jest.fn(), jest.fn())).rejects.toThrow();
  expect(client.updateCustomWord).not.toHaveBeenCalled();
  expect(mockUpload).not.toHaveBeenCalled();
});

it('refuses to upload a KER recording into the TAS path', async () => {
  const client = api();
  client.updateCustomWord.mockResolvedValue({ ...word,
    syllables: word.syllables.map((p, index) => index === 0 ? { ...p, video: word.syllables[1].video } : p) });
  const form = editWord(word);
  form.syllables[0].localUri = 'synthetic-KER';
  await expect(saveWord(client, UID, form, 'draft', { max_upload_mb: 50 }, jest.fn(), jest.fn())).rejects.toThrow('materi yang berbeda');
  expect(mockUpload).not.toHaveBeenCalled();
});

it('obtains private signed URLs only for an owner reference', async () => {
  await expect(signedVideo(word.video!, UID)).resolves.toBe('fixture-signed-url');
  expect(mockSign).toHaveBeenCalledWith(word.video!.path, 60);
  mockSign.mockClear();
  await expect(signedVideo({ ...word.video!, path: 'default/words/tolong.mp4' }, UID)).rejects.toThrow();
  expect(mockSign).not.toHaveBeenCalled();
});
