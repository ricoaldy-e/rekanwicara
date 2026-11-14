import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ApiClient } from '../src/api/client';
import { ApiError } from '../src/api/client';
import type { CustomWordDetail, CustomWordWrite } from '../src/api/types';
import { editWord, newWord, ownerToken, saveWord, signedVideo, validateRecording, validateWord, cleanupPendingUploads, type EditorWord } from '../src/customWords/service';
import { pendingUploads, updatePendingUploads } from '../src/customWords/pendingUploads';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const ID = '33333333-3333-4333-8333-333333333333';
const PARTS = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555'];
const mockUser = jest.fn();
const mockSession = jest.fn();
const mockUpload = jest.fn();
const mockInfo = jest.fn();
const mockRemove = jest.fn();
const mockSign = jest.fn();
const mockFile = jest.fn();
const mockObjects = new Map<string, ArrayBuffer>();
const mockWords = new Map<string, CustomWordDetail>();
jest.mock('../src/auth/companion', () => ({ requireCompanionUser: () => mockUser(), getCompanionSession: () => mockSession() }));
jest.mock('../src/data/supabase', () => ({ getClient: () => ({ storage: { from: () => ({ upload: mockUpload, info: mockInfo, remove: mockRemove, createSignedUrl: mockSign }) } }) }));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => mockFile(uri)) }));

function recording() {
  const bytes = new Uint8Array(24); bytes.set([102, 116, 121, 112], 4);
  return { exists: true, size: 24, type: 'video/mp4', arrayBuffer: async () => bytes.buffer };
}
function form(): EditorWord {
  return { ...newWord(), id: ID, word: 'KERTAS', instruction: 'Ucapkan KERTAS.', localUri: 'file:///word.mp4',
    syllables: PARTS.map((id, i) => ({ id, text: i ? 'TAS' : 'KER', instruction: 'Ucapkan perlahan.', video: null, localUri: `file:///part-${i}.mp4` })) };
}
function commit(body: CustomWordWrite): CustomWordDetail {
  const before = mockWords.get(ID);
  const video = (path: string) => ({ bucket: 'rekan-wicara-tutorials', path, position: 1, available: mockObjects.has(path) });
  const word: CustomWordDetail = { id: ID, word: body.word, instruction: body.instruction, status: 'published',
    revision: before ? before.revision + 1 : 2, cleanup_pending: false,
    video: video(body.video_path ?? before!.video!.path),
    syllables: body.syllables.map((part) => ({ ...part, video: video(part.video_path ?? before!.syllables.find((old) => old.id === part.id)!.video!.path) })) };
  mockWords.set(ID, word); return word;
}
function api() {
  return { createCustomWord: jest.fn(async (body: CustomWordWrite) => {
    if (mockWords.has(ID)) throw new ApiError('http', 'exists', 409, 'REVISION_CONFLICT');
    return commit(body);
  }), updateCustomWord: jest.fn(async (_id: string, body: CustomWordWrite) => {
    if (body.revision !== mockWords.get(ID)?.revision) throw new ApiError('http', 'conflict', 409, 'REVISION_CONFLICT');
    return commit(body);
  }), getCustomWord: jest.fn(async () => {
    const word = mockWords.get(ID); if (!word) throw new ApiError('http', 'missing', 404, 'ITEM_NOT_FOUND'); return word;
  }) } as unknown as jest.Mocked<ApiClient>;
}
const run = (client: ApiClient, editor: EditorWord, signal?: AbortSignal) => saveWord(client, UID, editor, 'published', { max_upload_mb: 50 }, jest.fn(), jest.fn(), signal);
beforeEach(async () => {
  jest.clearAllMocks(); await AsyncStorage.clear(); mockObjects.clear(); mockWords.clear();
  mockUser.mockResolvedValue({ id: UID }); mockSession.mockResolvedValue({ user: { id: UID }, access_token: 'fixture-user-jwt' });
  mockUpload.mockImplementation(async (path: string, bytes: ArrayBuffer) => {
    if (mockObjects.has(path)) return { error: { code: 'ResourceAlreadyExists' } };
    mockObjects.set(path, bytes); return { error: null };
  });
  mockInfo.mockImplementation(async (path: string) => mockObjects.has(path)
    ? { data: { size: mockObjects.get(path)!.byteLength }, error: null } : { data: null, error: { code: 'NoSuchKey' } });
  mockRemove.mockImplementation(async (paths: string[]) => { paths.forEach((path) => mockObjects.delete(path)); return { error: null }; });
  mockSign.mockResolvedValue({ data: { signedUrl: 'fixture-signed-url' }, error: null }); mockFile.mockImplementation(recording);
});

it('uploads and verifies three immutable material versions before one published POST', async () => {
  const client = api(); const editor = form(); const progress = jest.fn();
  const saved = await saveWord(client, UID, editor, 'published', { max_upload_mb: 50 }, jest.fn(), progress);
  expect(client.createCustomWord).toHaveBeenCalledTimes(1); expect(client.updateCustomWord).not.toHaveBeenCalled();
  expect(mockUpload.mock.invocationCallOrder[2]).toBeLessThan(client.createCustomWord.mock.invocationCallOrder[0]);
  expect(mockUpload.mock.calls.every((call) => call[2].upsert === false)).toBe(true);
  const body = client.createCustomWord.mock.calls[0][0];
  expect(body.status).toBe('published'); expect(body.video_path).toMatch(new RegExp(`^${UID}/words/${ID}/word/[a-f0-9-]+[.]mp4$`));
  expect(body.syllables.map((part) => part.position)).toEqual([1, 2]);
  body.syllables.forEach((part) => expect(part.video_path).toContain(`/syllables/${part.id}/`));
  expect(new Set(mockUpload.mock.calls.map(([path]) => path)).size).toBe(3);
  expect(saved.status).toBe('published'); expect(progress.mock.calls).toEqual([[1, 3], [2, 3], [3, 3]]);
  expect(await pendingUploads(UID)).toEqual([]);
});

it('keeps active paths unchanged while a replacement version is uploaded and committed', async () => {
  const client = api(); const first = await run(client, form()); const original = [...mockObjects.keys()];
  const editor = editWord(first); editor.localUri = 'file:///replacement.mp4';
  const next = await run(client, editor);
  expect(next.revision).toBe(first.revision + 1); expect(next.video!.path).not.toBe(first.video!.path);
  expect(original.every((path) => mockObjects.has(path))).toBe(true);
  expect(client.updateCustomWord.mock.calls[0][1].revision).toBe(first.revision);
  expect(client.updateCustomWord.mock.calls[0][1].syllables.every((part) => part.video_path === undefined)).toBe(true);
});

it('does not commit metadata after an upload failure and retains inputs for retry', async () => {
  const client = api(); const editor = form(); mockUpload.mockResolvedValueOnce({ error: { code: 'offline' } });
  await expect(run(client, editor)).rejects.toThrow(/Kata belum siap/);
  expect(client.createCustomWord).not.toHaveBeenCalled(); expect(editor.localUri).toBe('file:///word.mp4');
  const firstPath = editor.uploads![ID].path; await run(client, editor);
  expect(mockUpload.mock.calls[1][0]).toBe(firstPath); expect(mockWords.size).toBe(1);
});

it('reuses verified paths and the same word UUID after a lost POST response', async () => {
  const client = api(); const editor = form();
  client.createCustomWord.mockImplementationOnce(async (body) => { commit(body); throw new ApiError('timeout', 'timeout'); });
  const saved = await run(client, editor);
  expect(saved.id).toBe(ID); expect(mockWords.size).toBe(1); expect(mockUpload).toHaveBeenCalledTimes(3);
  expect(client.getCustomWord).toHaveBeenCalledWith(ID, 'fixture-user-jwt');
});

it('does not duplicate a word or overwrite files when timeout reconciliation also fails', async () => {
  const client = api(); const editor = form();
  client.createCustomWord.mockImplementationOnce(async (body) => { commit(body); throw new ApiError('timeout', 'timeout'); });
  client.getCustomWord.mockRejectedValueOnce(new ApiError('network', 'offline'));
  await expect(run(client, editor)).rejects.toThrow('timeout');
  expect((await pendingUploads(UID)).every((row) => row.uncertain)).toBe(true);
  await cleanupPendingUploads(client, UID); expect(mockRemove).not.toHaveBeenCalled();
  await run(client, editor); expect(mockWords.size).toBe(1); expect(mockUpload).toHaveBeenCalledTimes(3);
  expect(await pendingUploads(UID)).toEqual([]);
});

it('keeps the current word intact on a revision conflict', async () => {
  const client = api(); const first = await run(client, form()); const editor = editWord(first);
  editor.localUri = 'file:///changed.mp4'; mockWords.set(ID, { ...first, instruction: 'Another saved instruction.', revision: first.revision + 1 });
  await expect(run(client, editor)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  expect(mockWords.get(ID)!.instruction).toBe('Another saved instruction.'); expect(mockWords.get(ID)!.video).toEqual(first.video);
  expect(editor.localUri).toBe('file:///changed.mp4');
});

it('rejects staging, incomplete instructions, invalid letters, excessive length and seven syllables before upload', async () => {
  const client = api();
  for (const editor of [{ ...form(), word: 'A'.repeat(31) }, { ...form(), word: 'KER TAS' }, { ...form(), instruction: '' },
    { ...form(), syllables: Array.from({ length: 7 }, () => form().syllables[0]) }]) await expect(run(client, editor)).rejects.toThrow();
  expect(() => validateWord(form(), 'draft')).toThrow(); expect(mockUpload).not.toHaveBeenCalled();
});

it.each(['missing', 'empty', 'oversized', 'wrong_type'])('rejects a %s recording before upload', (kind) => {
  mockFile.mockImplementation(() => ({ ...recording(), exists: kind !== 'missing', size: kind === 'empty' ? 0 : kind === 'oversized' ? 100_000_000 : 24,
    type: kind === 'wrong_type' ? 'image/jpeg' : 'video/mp4' }));
  expect(() => validateRecording('fixture-recording', 50)).toThrow(); expect(mockUpload).not.toHaveBeenCalled();
});

it('rejects non-video bytes and mismatched material paths before a write', async () => {
  const client = api(); mockFile.mockImplementationOnce(() => recording()).mockImplementationOnce(() => recording()).mockImplementationOnce(() => recording())
    .mockImplementationOnce(() => ({ ...recording(), arrayBuffer: async () => new ArrayBuffer(24) }));
  await expect(run(client, form())).rejects.toThrow('Berkas bukan video'); expect(mockUpload).not.toHaveBeenCalled();
  mockFile.mockImplementation(recording);
  const editor = form(); editor.uploads = { [ID]: { uri: editor.localUri!, size: 24, tried: false, path: `${UID}/words/${ID}/syllables/${PARTS[0]}/${PARTS[1]}.mp4` } };
  await expect(run(client, editor)).rejects.toThrow(/materi yang berbeda/); expect(mockUpload).not.toHaveBeenCalled();
});

it('rejects account changes before any REST or Storage write', async () => {
  mockSession.mockResolvedValue({ user: { id: OTHER }, access_token: 'fixture-other-token' });
  await expect(ownerToken(UID)).rejects.toThrow('Akun berubah'); await expect(run(api(), form())).rejects.toThrow();
  expect(mockUpload).not.toHaveBeenCalled();
});

it('cancels between recordings without committing metadata', async () => {
  const controller = new AbortController(); const client = api();
  mockUpload.mockImplementationOnce(async (path, bytes) => { mockObjects.set(path, bytes); controller.abort(); return { error: null }; });
  await expect(run(client, form(), controller.signal)).rejects.toMatchObject({ kind: 'cancelled' });
  expect(client.createCustomWord).not.toHaveBeenCalled(); expect(mockUpload).toHaveBeenCalledTimes(1);
  await cleanupPendingUploads(client, UID); expect(mockObjects.size).toBe(0); expect(await pendingUploads(UID)).toEqual([]);
});

it('does not clean an active binding, uncertain outcome, another account or default video', async () => {
  const client = api(); const saved = await run(client, form());
  await updatePendingUploads(UID, () => [
    { wordId: ID, path: saved.video!.path, uncertain: false },
    { wordId: ID, path: `${UID}/words/${ID}/word/${PARTS[0]}.mp4`, uncertain: true },
    { wordId: ID, path: 'default/words/tolong.mp4', uncertain: false },
  ]);
  await cleanupPendingUploads(client, OTHER).catch(() => undefined); expect(mockRemove).not.toHaveBeenCalled();
  await cleanupPendingUploads(client, UID); expect(mockRemove).not.toHaveBeenCalled(); expect(mockObjects.has(saved.video!.path)).toBe(true);
  expect(await pendingUploads(UID)).toHaveLength(2);
});

it('does not mark cleanup successful when Storage RLS returns success without deleting an object', async () => {
  const client = api(); const editor = form(); const controller = new AbortController();
  mockUpload.mockImplementationOnce(async (path, bytes) => { mockObjects.set(path, bytes); controller.abort(); return { error: null }; });
  await expect(run(client, editor, controller.signal)).rejects.toThrow();
  mockRemove.mockResolvedValue({ error: null });
  await cleanupPendingUploads(client, UID); expect(mockObjects.size).toBe(1); expect(await pendingUploads(UID)).toHaveLength(1);
});

it('signs only private references belonging to the current owner', async () => {
  const ref = { bucket: 'rekan-wicara-tutorials', path: `${UID}/words/${ID}/word/${PARTS[0]}.mp4`, position: 1, available: true };
  await expect(signedVideo(ref, UID)).resolves.toBe('fixture-signed-url');
  await expect(signedVideo({ ...ref, path: 'default/words/tolong.mp4' }, UID)).rejects.toThrow();
  expect(mockSign).toHaveBeenCalledTimes(1);
});

it('preserves UUID/video binding while reordering repeated syllable labels', async () => {
  const client = api(); const first = await run(client, form()); const editor = editWord(first);
  editor.syllables = [...editor.syllables].reverse().map((part) => ({ ...part, text: 'KER' }));
  mockUpload.mockClear();
  const saved = await run(client, editor);
  expect(saved.syllables.map((part) => part.id)).toEqual([...PARTS].reverse());
  expect(saved.syllables.map((part) => part.position)).toEqual([1, 2]);
  expect(saved.syllables[0].video!.path).toBe(first.syllables[1].video!.path); expect(mockUpload).not.toHaveBeenCalled();
});

it('serializes a word save so a second tap cannot start another upload/commit', async () => {
  const client = api(); const editor = form(); let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  mockUser.mockImplementationOnce(async () => { await gate; return { id: UID }; });
  const first = run(client, editor);
  await expect(run(client, { ...editor })).rejects.toThrow(/Tunggu penyimpanan/);
  release(); await first; expect(client.createCustomWord).toHaveBeenCalledTimes(1); expect(mockUpload).toHaveBeenCalledTimes(3);
});

it('does not lose per-account pending paths when two queue writes overlap', async () => {
  await Promise.all([
    updatePendingUploads(UID, (rows) => [...rows, { wordId: ID, path: `${UID}/fixture-one`, uncertain: false }]),
    updatePendingUploads(UID, (rows) => [...rows, { wordId: ID, path: `${UID}/fixture-two`, uncertain: false }]),
    updatePendingUploads(OTHER, (rows) => [...rows, { wordId: ID, path: `${OTHER}/fixture-three`, uncertain: false }]),
  ]);
  expect(await pendingUploads(UID)).toHaveLength(2); expect(await pendingUploads(OTHER)).toHaveLength(1);
  const journal = (await AsyncStorage.getItem(`rw.pendingCustomUploads.${UID}`))!;
  expect(journal).not.toMatch(/file:\/\/|fixture-user-jwt|fixture-password/);
});
