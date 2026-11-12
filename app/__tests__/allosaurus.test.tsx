import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Allosaurus from '../app/allosaurus';
import { ApiError } from '../src/api/apiError';
import type { AllosaurusResponse } from '../src/api/types';

const mockAnalyze = jest.fn();
const mockDelete = jest.fn();
const mockUri = 'synthetic-allosaurus-video';
const prediction: AllosaurusResponse = { status: 'success', model: 'uni2005', phonetic_prediction: 'm a m a', inference_ms: 123.5 };

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: { allosaurus: mockAnalyze } }) }));
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
  await render(<Allosaurus />);
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
}

it('uploads automatically, shows letters and deletes the recording', async () => {
  await record();
  await waitFor(() => expect(screen.getByText(prediction.phonetic_prediction)).toBeTruthy());
  expect(mockAnalyze.mock.calls[0][0]).toMatchObject({ uri: mockUri, type: 'video/mp4' });
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam lagi' }));
  expect(screen.queryByText('Prediksi bunyi')).toBeNull();
  expect(screen.getByRole('button', { name: 'Rekam sintetis' })).toBeTruthy();
});

it('shows Indonesian letters by default and preserves raw IPA in optional details', async () => {
  const raw = 'ŋ a ɲ a tʃ a dʒ a j a';
  mockAnalyze.mockResolvedValueOnce({ ...prediction, phonetic_prediction: raw });
  await record();
  await waitFor(() => expect(screen.getByText('ng a ny a c a j a y a')).toBeTruthy());
  expect(screen.queryByText(raw)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Lihat detail' }));
  expect(screen.getByText(raw)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Tutup detail' }));
  expect(screen.queryByText(raw)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Lihat detail' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam lagi' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  await waitFor(() => expect(screen.getByText('m a m a')).toBeTruthy());
  expect(screen.queryByText('Simbol IPA asli')).toBeNull();
});

it('shows processing and prevents another recording while waiting', async () => {
  let finish!: (value: AllosaurusResponse) => void;
  mockAnalyze.mockReturnValueOnce(new Promise<AllosaurusResponse>((resolve) => { finish = resolve; }));
  await record();
  expect(screen.getByLabelText('Memproses bunyi ucapan')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Rekam sintetis' })).toBeNull();
  expect(mockDelete).not.toHaveBeenCalled();
  await act(async () => finish(prediction));
  await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(mockUri));
});

it('explains an empty prediction and allows recording again', async () => {
  mockAnalyze.mockResolvedValueOnce({ ...prediction, phonetic_prediction: '' });
  await record();
  await waitFor(() => expect(screen.getByText(/Belum ada bunyi yang diprediksi/)).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Rekam lagi' })).toBeTruthy();
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
});

it.each([
  [new ApiError('http', 'missing', 404, 'not_found'), /DEBUG=true/],
  [new ApiError('http', 'missing', 503, 'allosaurus_unavailable'), /Allosaurus belum siap/],
  [new ApiError('network', 'offline'), /Wi-Fi yang sama/],
])('shows a recoverable error and deletes the failed recording', async (error, text) => {
  mockAnalyze.mockRejectedValueOnce(error);
  await record();
  await waitFor(() => expect(screen.getByText(text)).toBeTruthy());
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  expect(screen.getByRole('button', { name: 'Rekam lagi' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Coba kirim lagi' })).toBeNull();
});

it('aborts and cleans up on exit, then ignores a late result', async () => {
  let finish!: (value: AllosaurusResponse) => void;
  mockAnalyze.mockReturnValueOnce(new Promise<AllosaurusResponse>((resolve) => { finish = resolve; }));
  const view = await render(<Allosaurus />);
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  const signal = mockAnalyze.mock.calls[0][1].signal as AbortSignal;
  await view.unmount();
  expect(signal.aborted).toBe(true);
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  await act(async () => finish(prediction));
});
