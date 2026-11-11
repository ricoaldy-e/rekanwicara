import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Calibration from '../app/calibration';
import { ApiError } from '../src/api/apiError';
import type { CalibrateResponse } from '../src/api/types';

const mockClipUri = 'synthetic-calibration-clip';
const mockCalibrate = jest.fn();
const mockDelete = jest.fn();
const mockMarkCalibrated = jest.fn();
const response: CalibrateResponse = {
  status: 'ok', step: 'rest', quality_flags: [], saved: true,
  calibration_complete: false, engine_version: 'test',
};

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('../src/state/settings', () => ({ useSettings: () => ({ api: { calibrate: mockCalibrate } }) }));
jest.mock('../src/state/user', () => ({ useUser: () => ({
  profile: { userId: 'synthetic-user' }, markCalibrated: mockMarkCalibrated,
}) }));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => ({
  exists: true, delete: () => mockDelete(uri),
})) }));
jest.mock('../src/recording/RecordPanel', () => {
  const { Pressable, Text } = require('react-native');
  return { RecordPanel: ({ onRecorded }: { onRecorded: (uri: string) => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel="Rekam sintetis" onPress={() => onRecorded(mockClipUri)}>
      <Text>Rekam sintetis</Text>
    </Pressable>
  ) };
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCalibrate.mockReset().mockResolvedValue(response);
});

async function recordRest() {
  await render(<Calibration />);
  await fireEvent.press(screen.getByRole('button', { name: 'Siap, rekam' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam sintetis' }));
}

async function failUpload() {
  mockCalibrate.mockRejectedValueOnce(new ApiError('network', 'Synthetic network failure'));
  await recordRest();
  await waitFor(() => expect(screen.getByTestId('upload-error')).toBeTruthy());
}

it('deletes the submitted file after success, then advances to the next step', async () => {
  let finish!: (result: CalibrateResponse) => void;
  mockCalibrate.mockReturnValueOnce(new Promise<CalibrateResponse>((resolve) => { finish = resolve; }));
  await recordRest();
  expect(mockCalibrate.mock.calls[0][0]).toMatchObject({ file: { uri: mockClipUri }, step: 'rest' });
  expect(mockDelete).not.toHaveBeenCalled();

  await act(async () => finish(response));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Siap, rekam' })).toBeTruthy());
  expect(screen.getByText('Ucapkan "a"')).toBeTruthy();
  expect(mockDelete).toHaveBeenCalledWith(mockClipUri);
});

it('deletes a quality-rejected file and offers recording again at the same step', async () => {
  mockCalibrate.mockResolvedValueOnce({ ...response, status: 'retry', saved: false, quality_flags: ['no_face'] });
  await recordRest();
  await waitFor(() => expect(screen.getByTestId('calibration-retry')).toBeTruthy());
  expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeTruthy();
  expect(screen.getByText('Diam dan rileks')).toBeTruthy();
  expect(mockDelete).toHaveBeenCalledWith(mockClipUri);
});

it('keeps the file after a network failure so it can be sent again', async () => {
  await failUpload();
  expect(screen.getByRole('button', { name: 'Coba kirim lagi' })).toBeTruthy();
  expect(mockDelete).not.toHaveBeenCalled();
});

it('resends the retained file and deletes it after the retry succeeds', async () => {
  await failUpload();
  expect(mockDelete).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Coba kirim lagi' }));
  await waitFor(() => expect(screen.getByText('Ucapkan "a"')).toBeTruthy());
  expect(mockCalibrate).toHaveBeenCalledTimes(2);
  expect(mockCalibrate.mock.calls[1][0]).toMatchObject({ file: { uri: mockClipUri }, step: 'rest' });
  expect(mockDelete).toHaveBeenCalledWith(mockClipUri);
});

it('deletes the retained file when the user chooses to record again', async () => {
  await failUpload();
  await fireEvent.press(screen.getByRole('button', { name: 'Rekam ulang' }));
  expect(screen.getByRole('button', { name: 'Rekam sintetis' })).toBeTruthy();
  expect(mockCalibrate).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith(mockClipUri);
});
