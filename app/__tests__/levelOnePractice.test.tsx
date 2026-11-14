import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { LevelOnePractice } from '../src/practice/LevelOnePractice';
import type { V2AnalyzeResponse } from '../src/api/types';

const UID = '11111111-1111-4111-8111-111111111111';
const mockAnalyze = jest.fn();
const mockDetail = jest.fn();
const mockAdd = jest.fn();
const mockDelete = jest.fn();
const mockBack = jest.fn();
const mockApi = { getV2Item: mockDetail, analyzeV2: mockAnalyze };
const mockSession = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: mockApi }) }));
jest.mock('../src/state/user', () => ({ SESSION_ID: 'current-session', useUser: () => ({ addAttempt: mockAdd }) }));
jest.mock('../src/auth/companion', () => ({ getCompanionSession: () => mockSession() }));
jest.mock('../src/practice/TutorialVideo', () => ({
  TutorialVideo: () => { const { Text } = require('react-native'); return <Text>Video contoh dari Storage</Text>; },
}));
jest.mock('../src/recording/localFile', () => ({
  deleteLocalFile: (file: string | null) => mockDelete(file),
  videoUpload: (uri: string) => ({ uri, name: 'clip.mp4', type: 'video/mp4' }),
}));
jest.mock('../src/recording/RecordPanel', () => ({
  RecordPanel: ({ onRecorded }: { onRecorded(uri: string): void }) => {
    const { Pressable, Text } = require('react-native');
    return <Pressable accessibilityRole="button" accessibilityLabel="Rekam sintetis" onPress={() => onRecorded('private-local-clip')}><Text>Rekam</Text></Pressable>;
  },
}));
const response: V2AnalyzeResponse = {
  status: 'evaluated', item_id: 'l1_e', level: 1, result: 'mendekati', lip_result: 'mendekati',
  voice_result: 'sesuai', feedback: { code: 'PRONUNCIATION_NOT_MATCHED', message: 'Coba lagi sesuai contoh E.' },
  visuals: null, quality_flags: [], engine: 'mediapipe_parselmouth_wav2vec2', processing_ms: 100,
};
beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue({ user: { id: UID }, access_token: 'fresh-token' });
  mockDetail.mockResolvedValue({ id: 'l1_e', text: 'E', instruction: 'Ucapkan E.', videos: [], level: 1, automatic_evaluation: true });
  mockAnalyze.mockResolvedValue(response);
});
async function record() {
  const view = await render(<LevelOnePractice itemId="l1_e" ownerId={UID} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Mulai rekam' })).toBeTruthy());
  await fireEvent.press(screen.getByRole('button', { name: 'Mulai rekam' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  return view;
}
it('runs E through v2, records the actual result, and returns Home on Selesai', async () => {
  await record();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Selesai' })).toBeTruthy());
  expect(mockAnalyze).toHaveBeenCalledWith('l1_e', 'current-session',
    { uri: 'private-local-clip', name: 'clip.mp4', type: 'video/mp4' }, 'fresh-token', expect.anything());
  expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'l1_e', score: null, overall: 'kuning', engineVersion: null }));
  expect(screen.getByText('Coba lagi sesuai contoh E.')).toBeTruthy();
  expect(mockDelete).toHaveBeenCalledWith('private-local-clip');
  await fireEvent.press(screen.getByRole('button', { name: 'Selesai' }));
  expect(mockBack).toHaveBeenCalledTimes(1);
});
it('does not count a retry as an attempt', async () => {
  mockAnalyze.mockResolvedValue({ ...response, status: 'retry', result: null, lip_result: null, voice_result: null });
  await record();
  await waitFor(() => expect(screen.getByText('Rekaman ini tidak dihitung sebagai percobaan.')).toBeTruthy());
  expect(mockAdd).not.toHaveBeenCalled();
});
it('keeps a failed analysis for retry and deletes it only after success', async () => {
  mockAnalyze.mockRejectedValueOnce(new Error('network'));
  await record();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Coba kirim lagi' })).toBeTruthy());
  expect(mockDelete).not.toHaveBeenCalledWith('private-local-clip');
  await fireEvent.press(screen.getByRole('button', { name: 'Coba kirim lagi' }));
  await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
});
it('cancels on unmount and ignores a delayed result', async () => {
  let finish!: (value: V2AnalyzeResponse) => void;
  mockAnalyze.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const view = await record();
  await waitFor(() => expect(mockAnalyze).toHaveBeenCalledTimes(1));
  await view.unmount();
  expect(mockAnalyze.mock.calls[0][4].signal.aborted).toBe(true);
  await act(async () => finish(response));
  expect(mockAdd).not.toHaveBeenCalled();
  expect(mockDelete).toHaveBeenCalledWith('private-local-clip');
});
