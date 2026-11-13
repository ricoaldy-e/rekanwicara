import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Wav2Vec2 from '../app/wav2vec2';
import { ApiError } from '../src/api/apiError';
import type { Wav2Vec2Response } from '../src/api/types';
import { matchesTarget } from '../src/content/communication';

const mockAnalyze = jest.fn();
const mockDelete = jest.fn();
const mockUri = 'synthetic-wav2vec2-video';
const prediction: Wav2Vec2Response = { status: 'success', model: 'Wikidepia/wav2vec2-xls-r-300m-indonesian', transcription: ' Saya Tuli! ', inference_ms: 123.5 };

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: { wav2vec2: mockAnalyze } }) }));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => ({
  exists: true, delete: () => mockDelete(uri),
})) }));
jest.mock('../src/recording/RecordPanel', () => {
  const { Pressable, Text } = require('react-native');
  return { RecordPanel: ({ onRecorded }: { onRecorded: (uri: string) => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel="Rekam sintetis" onPress={() => { onRecorded(mockUri); }}>
      <Text>Rekam sintetis</Text>
    </Pressable>
  ) };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalyze.mockReset().mockResolvedValue(prediction);
});

async function record() {
  await render(<Wav2Vec2 />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Saya Tuli' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Latih target ini' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
}

it('offers six targets, locks the target during recording and uploads without a target prompt', async () => {
  await record();
  await waitFor(() => expect(screen.getByText(prediction.transcription)).toBeTruthy());
  expect(screen.getByLabelText('Target latihan: Saya Tuli')).toBeTruthy();
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
  expect(mockAnalyze.mock.calls[0][0]).toEqual({ uri: mockUri, name: 'clip.mp4', type: 'video/mp4' });
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  expect(screen.getByText('Teks cocok dengan target.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Pilih target lain' }));
  expect(screen.queryByText('Teks yang terbaca')).toBeNull();
  expect(screen.getAllByRole('radio').map((node) => node.props.accessibilityLabel)).toEqual(['Tolong', 'Saya Tuli', 'Hai', 'Makan', 'PA', 'MA']);
});

it.each([
  ['PA', 'pa', true],
  ['MA', 'ma', true],
  ['PA', 'ma', false],
] as const)('records syllable %s without supplying a target prompt', async (label, text, matches) => {
  mockAnalyze.mockResolvedValueOnce({ ...prediction, transcription: text });
  await render(<Wav2Vec2 />);
  await fireEvent.press(screen.getByRole('radio', { name: label }));
  await fireEvent.press(screen.getByRole('button', { name: 'Latih target ini' }));
  expect(screen.getByLabelText(`Target latihan: ${label}`)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  await waitFor(() => expect(screen.getByText(text)).toBeTruthy());
  expect(Boolean(screen.queryByText('Teks cocok dengan target.'))).toBe(matches);
  expect(mockAnalyze.mock.calls[0]).toHaveLength(2);
  expect(mockAnalyze.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: expect.anything() }));
});

it.each([
  ['makan', /Teks belum cocok dengan target/],
  ['', /Belum ada teks yang terbaca/],
])('preserves a mismatch or empty response and allows recording again', async (text, message) => {
  mockAnalyze.mockResolvedValueOnce({ ...prediction, transcription: text });
  await record();
  await waitFor(() => expect(screen.getByText(message)).toBeTruthy());
  if (text) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.queryByText('Teks cocok dengan target.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam lagi' }));
  expect(screen.getByRole('button', { name: 'Rekam sintetis' })).toBeTruthy();
  expect(screen.queryByText('Teks yang terbaca')).toBeNull();
});

it('prevents new recording and target changes while processing', async () => {
  let finish!: (value: Wav2Vec2Response) => void;
  mockAnalyze.mockReturnValueOnce(new Promise<Wav2Vec2Response>((resolve) => { finish = resolve; }));
  await record();
  expect(screen.getByLabelText('Membaca ucapan')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Rekam sintetis' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Pilih target lain' })).toBeNull();
  expect(mockDelete).not.toHaveBeenCalled();
  await act(async () => finish(prediction));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(mockUri));
});

it.each([
  [new ApiError('http', 'missing', 404, 'not_found'), /DEBUG=true/],
  [new ApiError('http', 'missing', 503, 'wav2vec2_unavailable'), /Wav2Vec2 belum siap/],
  [new ApiError('timeout', 'slow'), /terlalu lama/],
])('handles failures, cleans the file and offers a new recording', async (error, text) => {
  mockAnalyze.mockRejectedValueOnce(error);
  await record();
  await waitFor(() => expect(screen.getByText(text)).toBeTruthy());
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  expect(screen.getByRole('button', { name: 'Rekam lagi' })).toBeTruthy();
});

it('aborts on exit, deletes the file and ignores a late response', async () => {
  let finish!: (value: Wav2Vec2Response) => void;
  mockAnalyze.mockReturnValueOnce(new Promise<Wav2Vec2Response>((resolve) => { finish = resolve; }));
  const view = await render(<Wav2Vec2 />);
  await fireEvent.press(screen.getByRole('button', { name: 'Latih target ini' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  const signal = mockAnalyze.mock.calls[0][1].signal as AbortSignal;
  await view.unmount();
  expect(signal.aborted).toBe(true);
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  await act(async () => finish(prediction));
});

it.each([
  ['  SAYA\nTULI! ', 'saya tuli', true],
  ['Saya, Tuli.', 'saya tuli', true],
  ['tolong makan', 'tolong', false],
  ['tolonggg', 'tolong', false],
  ['', 'hai', false],
  ['makan', 'hai', false],
] as const)('compares text without fuzzy correction: %s', (text, target, expected) => {
  expect(matchesTarget(text, target)).toBe(expected);
});
