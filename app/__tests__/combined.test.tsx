import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Combined from '../app/combined';
import { ApiError } from '../src/api/apiError';
import { isCombinedResponse } from '../src/api/experimentResponses';
import type { CombinedResponse } from '../src/api/types';
import example from '../test-fixtures/contract/combined.json';

const mockAnalyze = jest.fn();
const mockBaseline = jest.fn();
const mockDelete = jest.fn();
const mockUri = 'synthetic-combined-video';

function prediction(): CombinedResponse {
  const value: unknown = JSON.parse(JSON.stringify(example));
  if (!isCombinedResponse(value)) throw new Error('Invalid shared fixture');
  return value;
}

jest.mock('expo-router', () => ({ Stack: { Screen: () => null } }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: { combined: mockAnalyze, wav2vec2: mockBaseline } }) }));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => ({ exists: true, delete: () => mockDelete(uri) })) }));
jest.mock('../src/recording/RecordPanel', () => {
  const { Pressable, Text } = require('react-native');
  return { RecordPanel: ({ onRecorded }: { onRecorded: (uri: string) => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel="Rekam sintetis" onPress={() => { onRecorded(mockUri); }}><Text>Rekam sintetis</Text></Pressable>
  ) };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalyze.mockReset().mockResolvedValue(prediction());
});

async function record() {
  await render(<Combined />);
  await fireEvent.press(screen.getByRole('button', { name: 'Latih kata ini' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
}

it('sends the selected target separately from audio and displays a successful gated result', async () => {
  await record();
  await waitFor(() => expect(screen.getByLabelText('Hasil latihan: Berhasil')).toBeTruthy());
  expect(screen.getByText(example.asr.transcription)).toBeTruthy();
  expect(mockAnalyze).toHaveBeenCalledTimes(1);
  expect(mockAnalyze.mock.calls[0][0]).toEqual({ uri: mockUri, name: 'clip.mp4', type: 'video/mp4' });
  expect(mockAnalyze.mock.calls[0][1]).toBe('tolong');
  expect(mockBaseline).not.toHaveBeenCalled();
  expect(screen.queryByText('Teks cocok dengan target.')).toBeNull();
  expect(screen.queryByText(/Pengukuran Parselmouth/)).toBeNull();
  expect(screen.getByLabelText(/Kontur bibir dari satu cuplikan rekaman/)).toBeTruthy();
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  await fireEvent.press(screen.getByRole('button', { name: 'Pilih kata lain' }));
  expect(screen.queryByText('Hasil latihan')).toBeNull();
  expect(screen.getAllByRole('radio')).toHaveLength(4);
});

it.each([
  ['mendekati', 'near_match', 'tolon', 'Mendekati'],
  ['coba_lagi', 'different_text', 'makan', 'Coba lagi'],
  ['coba_lagi', 'empty_text', '', 'Coba lagi'],
] as const)('shows %s without correcting the raw transcript', async (outcome, reason, text, label) => {
  const value = prediction();
  value.feedback = { outcome, reason };
  value.asr = { ...example.asr, status: 'success', model: 'Wikidepia/wav2vec2-xls-r-300m-indonesian', transcription: text };
  mockAnalyze.mockResolvedValueOnce(value);
  await record();
  await waitFor(() => expect(screen.getByLabelText(`Hasil latihan: ${label}`)).toBeTruthy());
  if (text) expect(screen.getByText(text)).toBeTruthy();
  expect(screen.queryByLabelText('Hasil latihan: Berhasil')).toBeNull();
});

it('matching text cannot hide a failed MediaPipe gate', async () => {
  const value = prediction();
  value.visual = { status: 'ok', n_frames: 38, face_frames: 38, warnings: ['motion_missing'], gate: 'retry', motion_steps: 0, lip_contour: null };
  value.feedback = { outcome: 'coba_lagi', reason: 'visual_gate' };
  mockAnalyze.mockResolvedValueOnce(value);
  await record();
  await waitFor(() => expect(screen.getByLabelText('Hasil latihan: Coba lagi')).toBeTruthy());
  expect(screen.getByText(example.asr.transcription)).toBeTruthy();
  expect(screen.getByText(/Gerakan bibir saat suara terdengar/)).toBeTruthy();
  expect(screen.queryByLabelText('Hasil latihan: Berhasil')).toBeNull();
});

it.each(['audio', 'visual', 'asr'] as const)('keeps %s failure separate from the three learning outcomes', async (component) => {
  const value = prediction();
  value.status = 'partial';
  value.feedback = { outcome: null, reason: 'component_unavailable' };
  value[component] = { status: 'unavailable', code: component === 'audio' ? 'audio_analysis_failed' : component === 'visual' ? 'face_model_missing' : 'wav2vec2_timeout' };
  expect(isCombinedResponse(value)).toBe(true);
  mockAnalyze.mockResolvedValueOnce(value);
  await record();
  await waitFor(() => expect(screen.getByText('Penilaian belum tersedia')).toBeTruthy());
  expect(screen.queryByLabelText('Hasil latihan: Coba lagi')).toBeNull();
  expect(screen.queryByLabelText('Hasil latihan: Berhasil')).toBeNull();
  expect(screen.getByRole('button', { name: 'Rekam lagi' })).toBeTruthy();
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
});

it('locks the target while uploading and aborts on exit', async () => {
  let finish!: (value: CombinedResponse) => void;
  mockAnalyze.mockReturnValueOnce(new Promise<CombinedResponse>((resolve) => { finish = resolve; }));
  const view = await render(<Combined />);
  await fireEvent.press(screen.getByRole('radio', { name: 'Saya Tuli' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Latih kata ini' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
  expect(mockAnalyze.mock.calls[0][1]).toBe('saya tuli');
  expect(screen.queryByRole('button', { name: 'Pilih kata lain' })).toBeNull();
  const signal = mockAnalyze.mock.calls[0][2].signal as AbortSignal;
  await view.unmount();
  expect(signal.aborted).toBe(true);
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
  await act(async () => finish(prediction()));
});

it('recovers from a transport failure without grading it as wrong speech', async () => {
  mockAnalyze.mockRejectedValueOnce(new ApiError('timeout', 'private'));
  await record();
  await waitFor(() => expect(screen.getByText(/terlalu lama/)).toBeTruthy());
  expect(screen.queryByText('Hasil latihan')).toBeNull();
  expect(mockDelete).toHaveBeenCalledWith(mockUri);
});

it.each([
  {}, { ...example, processing_ms: -1 }, { ...example, status: 'partial' },
  { ...example, target: 'unknown' },
  { ...example, audio: { ...example.audio, active_ms: 9999 } },
  { ...example, audio: { ...example.audio, warnings: ['unknown'] } },
  { ...example, visual: { ...example.visual, motion_steps: -1 } },
  { ...example, visual: { ...example.visual, warnings: ['motion_missing'] } },
  { ...example, visual: { ...example.visual, gate: 'retry', warnings: ['motion_missing'] } },
  { ...example, visual: { ...example.visual, face_frames: 999 } },
  { ...example, visual: { ...example.visual, lip_contour: { points: [[0, 0], [1, 0], [Infinity, 1]] } } },
  { ...example, feedback: { outcome: 'berhasil', reason: 'near_match' } },
  { ...example, asr: { status: 'unavailable', code: 'private-path' } },
  { ...example, timings: { ...example.timings, asr_ms: '5' } },
])('rejects invalid or contradictory feedback', (value) => expect(isCombinedResponse(value)).toBe(false));
