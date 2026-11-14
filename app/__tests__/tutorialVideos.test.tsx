import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import TutorialVideos from '../app/tutorial-videos';
import { ApiError } from '../src/api/apiError';
import manifest from '../../server/app/content/tutorials.json';
import vowels from '../../server/app/content/level_one_tutorials.json';

const mockGet = jest.fn();
const mockUpload = jest.fn();
const mockDelete = jest.fn();
const mockPrevent = jest.fn();
const mockToken = jest.fn();
let mockLoggedIn = true;
const mockApi = { getTutorials: mockGet, uploadTutorial: mockUpload };
const clip = 'synthetic-tutorial-clip';

jest.mock('expo-router', () => ({ usePreventRemove: (...args: unknown[]) => mockPrevent(...args) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({ session: mockLoggedIn ? { user: { id: 'synthetic-producer' } } : null }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: mockApi }) }));
jest.mock('../src/auth/companion', () => ({ getCompanionSession: () => mockToken() }));
jest.mock('../src/auth/CompanionLogin', () => {
  const { Text } = require('react-native');
  return { CompanionLogin: () => <Text>Login diperlukan</Text> };
});
jest.mock('../src/recording/localFile', () => ({ deleteLocalFile: (uri: string) => mockDelete(uri),
  videoUpload: (uri: string) => ({ uri, name: 'clip.mp4', type: 'video/mp4' }) }));
jest.mock('../src/recording/ClipPreview', () => {
  const { Text } = require('react-native');
  return { ClipPreview: () => <Text>Pratinjau sintetis</Text> };
});
jest.mock('../src/recording/RecordPanel', () => ({ RecordPanel: ({ onRecorded, manualStop, durationMs }: {
  onRecorded: (uri: string) => void; manualStop: boolean; durationMs: number;
}) => {
  const { Pressable, Text: NativeText } = require('react-native');
  return <Pressable accessibilityRole="button" accessibilityLabel="Rekam sintetis" onPress={() => onRecorded(clip)}>
    <NativeText>{`${manualStop}:${durationMs}`}</NativeText>
  </Pressable>;
} }));

beforeEach(() => {
  jest.clearAllMocks();
  mockLoggedIn = true;
  mockGet.mockReset().mockImplementation(async (_token, group) => ({ items: (group === 'level_1' ? vowels : manifest).map((i) => ({ ...i, present: false })), max_duration_s: 120, max_upload_mb: 50 }));
  mockToken.mockReset().mockResolvedValue({ access_token: 'current-token' });
  mockUpload.mockReset().mockImplementation(async (item) => ({ ...item, status: 'verified', size_bytes: 123 }));
});
afterEach(async () => { await cleanup(); });

async function recordFirst() {
  const view = await render(<TutorialVideos />);
  await fireEvent.press(screen.getByRole('button', { name: 'Kata Penting (24 video)' }));
  await waitFor(() => expect(screen.getByText('0 dari 24 video tersimpan di Storage.')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('TOLONG, TO, belum direkam'));
  return view;
}

it('requires an authenticated session before checking Storage', async () => {
  mockLoggedIn = false;
  await render(<TutorialVideos />);
  expect(screen.getByText('Login diperlukan')).toBeTruthy();
  expect(mockGet).not.toHaveBeenCalled();
});

it('shows the exact first source step and a manual recording limit', async () => {
  await recordFirst();
  expect(screen.getByText(manifest[0].steps[0])).toBeTruthy();
  expect(screen.getByText('true:120000')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Berikutnya' }));
  expect(screen.getByText(manifest[0].steps[1])).toBeTruthy();
  expect(mockUpload).not.toHaveBeenCalled();
});

it('previews before upload and only then marks the target present and deletes local clip', async () => {
  await recordFirst();
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  expect(screen.getByText('Pratinjau sintetis')).toBeTruthy();
  expect(mockUpload).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Unggah ke Storage' }));
  await waitFor(() => expect(screen.getByText('1 dari 24 video tersimpan di Storage.')).toBeTruthy());
  expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ item_id: 'kp_tolong_to' }), 'current-token',
    expect.objectContaining({ uri: clip }), expect.objectContaining({ signal: expect.anything() }));
  expect(mockDelete).toHaveBeenCalledWith(clip);
});

it('keeps failed upload available for retry without marking success', async () => {
  mockUpload.mockRejectedValueOnce(new ApiError('http', 'Upload gagal.', 502, 'tutorial_upload_failed'));
  await recordFirst();
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Unggah ke Storage' }));
  await waitFor(() => expect(screen.getByLabelText('Upload gagal.')).toBeTruthy());
  expect(mockDelete).not.toHaveBeenCalledWith(clip);
  expect(screen.getByText('Pratinjau sintetis')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Coba kirim lagi' }));
  await waitFor(() => expect(screen.getByText('1 dari 24 video tersimpan di Storage.')).toBeTruthy());
});

it('does not enable overwriting an existing cloud tutorial', async () => {
  mockGet.mockResolvedValueOnce({ items: manifest.map((i) => ({ ...i, present: true })), max_duration_s: 120, max_upload_mb: 50 });
  await render(<TutorialVideos />);
  await waitFor(() => expect(screen.getByText('24 dari 24 video tersimpan di Storage.')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('TOLONG, TO, tersimpan'));
  expect(screen.queryByRole('button', { name: 'Rekam sintetis' })).toBeNull();
  expect(mockUpload).not.toHaveBeenCalled();
});

it('shows authorization failure without claiming missing or saved videos', async () => {
  mockGet.mockRejectedValueOnce(new ApiError('http', 'Akun perekam belum diizinkan.', 403, 'tutorial_forbidden'));
  await render(<TutorialVideos />);
  await waitFor(() => expect(screen.getByLabelText('Akun perekam belum diizinkan.')).toBeTruthy());
  expect(screen.queryByText(/dari 24 video tersimpan/)).toBeNull();
});

it('aborts upload and cleans local media on unmount, ignoring a late response', async () => {
  let finish!: (value: unknown) => void;
  mockUpload.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const view = await recordFirst();
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Unggah ke Storage' }));
  await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(1));
  const signal = mockUpload.mock.calls[0][3].signal as AbortSignal;
  await view.unmount();
  expect(signal.aborted).toBe(true);
  expect(mockDelete).toHaveBeenCalledWith(clip);
  await act(async () => finish({ status: 'verified' }));
});

it('opens five vowels by default and uploads a recording automatically', async () => {
  await render(<TutorialVideos />);
  await waitFor(() => expect(screen.getByText('0 dari 5 video tersimpan di Storage.')).toBeTruthy());
  expect(mockGet).toHaveBeenCalledWith('current-token', 'level_1');
  await fireEvent.press(screen.getByLabelText('A, A, belum direkam'));
  expect(screen.getByText(vowels[0].steps[0])).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  await waitFor(() => expect(screen.getByText('1 dari 5 video tersimpan di Storage.')).toBeTruthy());
  expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ item_id: 'l1_a',
    storage_path: 'default/level-1/a.mp4' }), 'current-token', expect.objectContaining({ uri: clip }), expect.anything());
  expect(mockDelete).toHaveBeenCalledWith(clip);
});

it('keeps a failed automatic vowel upload for retry', async () => {
  mockUpload.mockRejectedValueOnce(new ApiError('http', 'Upload gagal.', 502, 'tutorial_upload_failed'));
  await render(<TutorialVideos />);
  await waitFor(() => expect(screen.getByText('0 dari 5 video tersimpan di Storage.')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('E, E, belum direkam'));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  await waitFor(() => expect(screen.getByLabelText('Upload gagal.')).toBeTruthy());
  expect(mockDelete).not.toHaveBeenCalledWith(clip);
  await fireEvent.press(screen.getByRole('button', { name: 'Coba kirim lagi' }));
  await waitFor(() => expect(screen.getByText('1 dari 5 video tersimpan di Storage.')).toBeTruthy());
});
