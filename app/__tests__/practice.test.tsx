import { fireEvent, render, screen } from '@testing-library/react-native';

import Practice from '../app/practice/[itemId]';
import type { AnalyzeResult, PracticeItem } from '../src/data/types';

const mockAnalyze = jest.fn();
const mockAddAttempt = jest.fn();
const mockDelete = jest.fn();
const mockBuzz = jest.fn();
const mockPreventRemove = jest.fn();
let mockItem: PracticeItem | null = null;
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => {
  const { View } = require('react-native');
  return {
    Stack: { Screen: () => <View /> },
    useLocalSearchParams: () => mockParams,
    useNavigation: () => ({ dispatch: jest.fn() }),
    usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args),
    useRouter: () => ({ back: jest.fn() }),
  };
});
jest.mock('../src/data/useCatalog', () => ({
  usePracticeItem: () => ({ data: mockItem, loading: false, error: null, reload: jest.fn() }),
}));
jest.mock('../src/data/analyze', () => ({
  ...jest.requireActual('../src/data/analyze'),
  analyze: (...args: unknown[]) => mockAnalyze(...args),
}));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: { baseUrl: 'http://x' }, apiUrl: 'http://x' }) }));
jest.mock('../src/state/user', () => ({
  SESSION_ID: 'session-1',
  useUser: () => ({ profile: { userId: 'user-1', calibrated: true, attempts: [] }, addAttempt: mockAddAttempt }),
}));
jest.mock('../src/recording/localFile', () => ({
  deleteLocalFile: (...args: unknown[]) => mockDelete(...args),
  videoUpload: (uri: string, name: string) => ({ uri, name, type: 'video/mp4' }),
}));
jest.mock('../src/recording/RecordPanel', () => {
  const { Pressable, Text } = require('react-native');
  return {
    RecordPanel: ({ onRecorded }: { onRecorded: (uri: string) => void }) => (
      <Pressable accessibilityRole="button" onPress={() => onRecorded('file:///clip.mp4')}>
        <Text>synthetic-record</Text>
      </Pressable>
    ),
  };
});
jest.mock('../src/practice/ModelVideo', () => ({ ModelVideo: () => null }));
jest.mock('../src/a11y/haptics', () => ({ buzzResult: (...args: unknown[]) => mockBuzz(...args) }));

const A: PracticeItem = { key: 'l1_a', itemId: 'l1_a', level: 1, text: 'A', instruction: 'Buka mulut.', source: 'default' };

function result(over: Partial<AnalyzeResult>): AnalyzeResult {
  return {
    status: 'evaluated', item_id: 'l1_a', level: 1, result: 'sesuai', lip_result: 'sesuai', voice_result: 'sesuai',
    lip_feedback: null, voice_feedback: null, feedback: { code: 'ok_good', message: '' }, quality_flags: [],
    visuals: null, engine: 'test', processing_ms: 1, sample: false, ...over,
  };
}

async function recordAndSend() {
  await fireEvent.press(screen.getByRole('button', { name: 'Mulai rekam' }));
  await fireEvent.press(screen.getByText('synthetic-record'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockItem = A;
  mockParams = { itemId: 'l1_a' };
});

it('analyzes the recording for the catalog item, stores the attempt and shows the result', async () => {
  mockAnalyze.mockResolvedValue(result({}));
  await render(<Practice />);
  await recordAndSend();
  expect(mockAnalyze).toHaveBeenCalledTimes(1);
  const [input] = mockAnalyze.mock.calls[0];
  expect(input).toMatchObject({ item: { itemId: 'l1_a' }, sessionId: 'session-1', userId: 'user-1' });
  expect(await screen.findByTestId('result-ok')).toBeTruthy();
  expect(mockAddAttempt).toHaveBeenCalledWith(expect.objectContaining({ itemId: 'l1_a', level: 1, overall: 'hijau' }));
  expect(mockBuzz).toHaveBeenCalledWith('sesuai');
  expect(mockDelete).toHaveBeenCalledWith('file:///clip.mp4');
});

it('does not store a retry and offers to record again', async () => {
  mockAnalyze.mockResolvedValue(result({ status: 'retry', result: null, lip_result: null, voice_result: null, feedback: { code: 'retry_no_face', message: 'Wajah belum terlihat.' } }));
  await render(<Practice />);
  await recordAndSend();
  expect(await screen.findByTestId('result-retry')).toBeTruthy();
  expect(mockAddAttempt).not.toHaveBeenCalled();
  expect(mockBuzz).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Rekam ulang' })).toBeTruthy();
});

it('does not store a mock sample as progress', async () => {
  mockAnalyze.mockResolvedValue(result({ sample: true }));
  await render(<Practice />);
  await recordAndSend();
  expect(await screen.findByTestId('result-sample')).toBeTruthy();
  expect(mockAddAttempt).not.toHaveBeenCalled();
});

it('guards leaving only while recording or sending', async () => {
  await render(<Practice />);
  expect(mockPreventRemove).toHaveBeenLastCalledWith(false, expect.any(Function));
  await fireEvent.press(screen.getByRole('button', { name: 'Mulai rekam' }));
  expect(mockPreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  expect(screen.queryByText('Keluar latihan')).toBeNull(); // header is mocked; the label lives in headerLeft
});

it('hides recording for a custom word the v1 server cannot score', async () => {
  mockItem = { ...A, itemId: 'custom_word:1', key: 'custom_word:1', level: 3, text: 'TOLONG', source: 'custom' };
  await render(<Practice />);
  expect(screen.getByTestId('practice-not-supported')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Mulai rekam' })).toBeNull();
});

it('says when the material does not exist', async () => {
  mockItem = null;
  await render(<Practice />);
  expect(screen.getByTestId('practice-not-found')).toHaveAccessibleName('Materi tidak ditemukan.');
});
