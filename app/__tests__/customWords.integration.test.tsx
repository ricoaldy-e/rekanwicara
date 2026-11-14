import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ApiClient } from '../src/api/client';
import { ApiError } from '../src/api/apiError';
import type { CustomWordDetail, CustomWordWrite } from '../src/api/types';
import NewWord from '../app/(tabs)/companion/words/new';
import EditWord from '../app/(tabs)/companion/words/[wordId]/edit';
import Companion from '../app/(tabs)/companion';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const WORD = '33333333-3333-4333-8333-333333333333';
let mockUid = UID;
let mockClips = 0;
let mockDetail: CustomWordDetail;
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockList = jest.fn();
const mockDelete = jest.fn();
const mockUpload = jest.fn();
const mockSign = jest.fn().mockResolvedValue({ data: { signedUrl: 'fixture-private-video' }, error: null });
const mockDirectWrite = jest.fn();
const mockLocalDelete = jest.fn();
const mockObjects = new Map<string, ArrayBuffer>();
const mockCatalog = { level1: [], words: ['tolong', 'polisi', 'api', 'sakit', 'obat', 'alamat', 'makan', 'haus'].map((word) => ({ id: `kp_${word}`, text: word.toUpperCase(), source: 'default', hasLevel2: word !== 'haus' })) };
const mockApi = { createCustomWord: mockCreate, updateCustomWord: mockUpdate, getCustomWord: mockGet, listCustomWords: mockList, deleteCustomWord: mockDelete } as unknown as ApiClient;

jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({ wordId: WORD }), useNavigation: () => ({ goBack: mockBack, dispatch: jest.fn() }), usePreventRemove: () => {},
  useFocusEffect: (callback: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]),
}));
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ uid: mockUid, session: { uid: mockUid } }) }));
jest.mock('../src/auth/supabase', () => ({ isSupabaseConfigured: true }));
jest.mock('../src/auth/companion', () => ({ requireCompanionUser: async () => ({ id: mockUid }), getCompanionSession: async () => ({ user: { id: mockUid }, access_token: 'fixture-user-token' }) }));
jest.mock('../src/data/supabase', () => ({ getClient: () => ({ from: mockDirectWrite, storage: { from: () => ({ upload: mockUpload, createSignedUrl: mockSign,
  info: async (path: string) => mockObjects.has(path) ? { data: { size: mockObjects.get(path)!.byteLength }, error: null } : { data: null, error: { code: 'NoSuchKey' } },
  remove: async (paths: string[]) => { paths.forEach((path) => mockObjects.delete(path)); return { error: null }; },
}) } }) }));
jest.mock('../src/data/media', () => ({ getWordStore: () => null }));
jest.mock('../src/data/useCatalog', () => ({ useCatalog: () => ({ data: mockCatalog, loading: false, error: null, reload: jest.fn() }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: mockApi, apiUrl: 'http://fixture.test' }) }));
jest.mock('../src/pin/PinSession', () => ({ usePinSession: () => ({ lock: jest.fn() }) }));
jest.mock('../src/data/pickVideo', () => ({ recordWithCamera: async () => ({ kind: 'picked', file: { uri: `file:///camera-${++mockClips}.mp4`, mimeType: 'video/mp4', fileSize: 24, durationMs: 4000 } }) }));
jest.mock('expo-video', () => ({ useVideoPlayer: () => ({ muted: true, loop: false, addListener: () => ({ remove: jest.fn() }) }), VideoView: () => null }));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => {
  const bytes = new Uint8Array(24); bytes.set([102, 116, 121, 112], 4); bytes[12] = Number(/camera-(\d+)/.exec(uri)?.[1] ?? 0);
  return { exists: true, size: 24, type: 'video/mp4', arrayBuffer: async () => bytes.buffer, delete: () => mockLocalDelete(uri) };
}) }));

function saved(body: CustomWordWrite): CustomWordDetail {
  const ref = (path: string) => ({ bucket: 'rekan-wicara-tutorials', path, available: true, position: 1 });
  return { id: body.id!, word: body.word, instruction: body.instruction, status: 'published', revision: 2, cleanup_pending: false,
    video: ref(body.video_path!), syllables: body.syllables.map((part) => ({ ...part, video: ref(part.video_path!) })) };
}
beforeEach(async () => {
  jest.clearAllMocks(); await AsyncStorage.clear(); mockObjects.clear(); mockUid = UID; mockClips = 0;
  mockList.mockReset().mockResolvedValue({ words: [], max_upload_mb: 50, max_duration_s: 120 });
  mockGet.mockReset().mockImplementation(async () => mockDetail);
  mockCreate.mockReset().mockImplementation(async (body: CustomWordWrite) => saved(body));
  mockUpdate.mockReset().mockResolvedValue(null); mockDelete.mockReset().mockResolvedValue({ id: WORD, status: 'deleted' });
  mockUpload.mockReset().mockImplementation(async (path: string, bytes: ArrayBuffer) => { mockObjects.set(path, bytes); return { error: null }; });
  mockDetail = { id: WORD, word: 'KERTAS', instruction: 'Ucapkan KERTAS perlahan.', status: 'published', revision: 2, cleanup_pending: false,
    video: { bucket: 'rekan-wicara-tutorials', path: `${UID}/words/${WORD}/word/44444444-4444-4444-8444-444444444444.mp4`, available: true, position: 1 }, syllables: [] };
});
async function fillWord() {
  await waitFor(() => expect(screen.getByTestId('word-text')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('word-text'), 'KERTAS');
  await fireEvent.changeText(screen.getByTestId('word-instruction-1'), 'Ucapkan KERTAS perlahan.');
  await fireEvent.press(screen.getByTestId('word-video-camera'));
  for (const [i, text] of ['KER', 'TAS'].entries()) {
    await fireEvent.press(screen.getByTestId('add-syllable'));
    await fireEvent.changeText(screen.getByTestId(`syllable-${i + 1}-text`), text);
    await fireEvent.changeText(screen.getByTestId(`syllable-${i + 1}-instruction-1`), `Ucapkan ${text} perlahan.`);
    await fireEvent.press(screen.getByTestId(`syllable-${i + 1}-video-camera`));
  }
  await fireEvent.press(screen.getByRole('checkbox'));
}

it('connects the actual design form to three camera uploads and one complete backend POST', async () => {
  const view = await render(<NewWord />); await fillWord();
  expect(screen.queryByTestId('word-video-gallery')).toBeNull();
  await fireEvent.press(screen.getByTestId('word-save'));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(mockCreate).toHaveBeenCalledTimes(1); expect(mockUpload).toHaveBeenCalledTimes(3); expect(mockDirectWrite).not.toHaveBeenCalled();
  const [body, token] = mockCreate.mock.calls[0]; expect(token).toBe('fixture-user-token'); expect(body.status).toBe('published');
  expect(body.syllables.map((part: { text: string; position: number }) => [part.text, part.position])).toEqual([['KER', 1], ['TAS', 2]]);
  expect(body.video_path).toContain(`${UID}/words/${body.id}/word/`);
  expect(new Set(mockUpload.mock.calls.map(([, bytes]) => new Uint8Array(bytes)[12])).size).toBe(3);
  expect(mockUpload.mock.calls.every(([, , options]) => options.upsert === false)).toBe(true);
  await view.unmount(); expect(mockLocalDelete).toHaveBeenCalledTimes(3);
});

it('retains form inputs and retries the same material paths after upload fails', async () => {
  mockUpload.mockResolvedValueOnce({ error: { code: 'offline' } });
  await render(<NewWord />); await fillWord(); await fireEvent.press(screen.getByTestId('word-save'));
  await waitFor(() => expect(screen.getByTestId('word-form-banner')).toBeTruthy());
  expect(screen.getByTestId('word-text').props.value).toBe('KERTAS'); expect(mockCreate).not.toHaveBeenCalled();
  const firstPath = mockUpload.mock.calls[0][0]; await fireEvent.press(screen.getByRole('button', { name: 'Coba lagi' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1)); expect(mockUpload.mock.calls[1][0]).toBe(firstPath); expect(mockCreate).toHaveBeenCalledTimes(1);
});

it('keeps edited instructions and the original revision after a save conflict', async () => {
  mockUpdate.mockRejectedValueOnce(new ApiError('http', 'conflict', 409, 'REVISION_CONFLICT'));
  await render(<EditWord />); await waitFor(() => expect(screen.getByTestId('word-text')).toBeTruthy());
  await fireEvent.changeText(screen.getByTestId('word-instruction-1'), 'Instruksi baru yang belum disimpan.');
  await fireEvent.press(screen.getByRole('checkbox')); await fireEvent.press(screen.getByTestId('word-save'));
  await waitFor(() => expect(screen.getByTestId('word-form-banner')).toBeTruthy());
  expect(screen.getByTestId('word-instruction-1').props.value).toBe('Instruksi baru yang belum disimpan.');
  expect(mockUpdate.mock.calls[0][1].revision).toBe(2); expect(mockBack).not.toHaveBeenCalled(); expect(mockUpload).not.toHaveBeenCalled();
});

it('stops metadata submission if the owner changes during Storage upload', async () => {
  mockUpload.mockImplementationOnce(async () => { mockUid = OTHER; return { error: null }; });
  await render(<NewWord />); await fillWord(); await fireEvent.press(screen.getByTestId('word-save'));
  await waitFor(() => expect(screen.getByTestId('word-form-banner')).toBeTruthy());
  expect(mockCreate).not.toHaveBeenCalled(); expect(mockBack).not.toHaveBeenCalled();
  expect(mockUpload.mock.calls.every(([path]) => path.startsWith(`${UID}/`))).toBe(true);
});

it('keeps pending deletion visible and retries with the updated revision', async () => {
  mockDelete.mockResolvedValueOnce({ id: WORD, status: 'cleanup_pending' });
  mockGet.mockResolvedValueOnce(mockDetail).mockResolvedValueOnce({ ...mockDetail, status: 'deleting', revision: 3 });
  await render(<EditWord />); await waitFor(() => expect(screen.getByTestId('word-delete')).toBeTruthy());
  await fireEvent.press(screen.getByTestId('word-delete')); await fireEvent.press(screen.getByTestId('confirm-ok'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Lanjutkan hapus' })).toBeTruthy());
  expect(mockBack).not.toHaveBeenCalled(); await fireEvent.press(screen.getByRole('button', { name: 'Lanjutkan hapus' }));
  await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
  expect(mockDelete.mock.calls.map((call) => call[1])).toEqual([2, 3]);
});

it('loads the real companion list and keeps all eight default words read-only', async () => {
  mockList.mockResolvedValue({ words: [{ id: WORD, word: 'KERTAS', status: 'published', revision: 2, syllable_count: 2, cleanup_pending: false }], max_upload_mb: 50, max_duration_s: 120 });
  await render(<Companion />); await waitFor(() => expect(screen.getByTestId(`mine-${WORD}`)).toBeTruthy());
  expect(screen.getByText('2 suku kata')).toBeTruthy(); expect(screen.getAllByText('Bawaan')).toHaveLength(8);
  expect(screen.queryByRole('button', { name: 'Ubah TOLONG' })).toBeNull();
  await fireEvent.press(screen.getByTestId(`mine-${WORD}`));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/companion/words/[wordId]/edit', params: { wordId: WORD } });
  expect(mockDirectWrite).not.toHaveBeenCalled();
});


it('opens stored videos with a private signed URL for the owner', async () => {
  await render(<EditWord />); await waitFor(() => expect(screen.getByRole('button', { name: 'Preview video tersimpan' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Preview video tersimpan' }));
  await waitFor(() => expect(mockSign).toHaveBeenCalledWith(mockDetail.video!.path, 60));
  expect((await AsyncStorage.getItem(`rw.pendingCustomUploads.${UID}`)) ?? '').not.toContain('fixture-private-video');
});
