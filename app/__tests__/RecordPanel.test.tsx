import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';

import { RecordPanel } from '../src/recording/RecordPanel';

const mockRecord = jest.fn();
const mockStop = jest.fn();
const mockDelete = jest.fn();
const mockOnRecorded = jest.fn();
const mockDone = jest.fn().mockResolvedValue(undefined);
const clipUri = 'synthetic-recorder-clip';
let finish!: (result: { uri: string } | undefined) => void;
let fail!: (error: Error) => void;

jest.mock('expo-camera', () => {
  const { forwardRef, useImperativeHandle } = require('react');
  const { View } = require('react-native');
  return {
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
    useMicrophonePermissions: () => [{ granted: true }, jest.fn()],
    CameraView: forwardRef(({ onCameraReady }: { onCameraReady: () => void }, ref: unknown) => {
      useImperativeHandle(ref, () => ({ recordAsync: mockRecord, stopRecording: mockStop }));
      return <View testID="synthetic-camera" onCameraReady={onCameraReady} />;
    }),
  };
});
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success' },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: () => mockDone(),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn().mockImplementation((uri: string) => ({
  exists: true, delete: () => mockDelete(uri),
})) }));

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
  jest.clearAllMocks();
  mockStop.mockReset();
  mockRecord.mockReset().mockImplementation(() => new Promise<{ uri: string } | undefined>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  }));
});

afterEach(async () => {
  await cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

async function startCountdown() {
  const view = await render(<RecordPanel onRecorded={mockOnRecorded} />);
  await fireEvent(screen.getByTestId('synthetic-camera'), 'cameraReady');
  await fireEvent.press(screen.getByTestId('record-button'));
  return view;
}

async function startRecording() {
  const view = await startCountdown();
  for (let tick = 0; tick < 3; tick++) {
    await act(async () => { jest.advanceTimersByTime(1000); });
  }
  expect(mockRecord).toHaveBeenCalledTimes(1);
  return view;
}

it('deletes a recording returned after unmount without notifying the caller or vibrating', async () => {
  const view = await startRecording();
  await view.unmount();
  expect(mockStop).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);

  await act(async () => finish({ uri: clipUri }));
  expect(mockDelete).toHaveBeenCalledTimes(1);
  expect(mockDelete).toHaveBeenCalledWith(clipUri);
  expect(mockOnRecorded).not.toHaveBeenCalled();
  expect(mockDone).not.toHaveBeenCalled();
});

it('delivers an active recording once without deleting the caller-owned file', async () => {
  await startRecording();
  await act(async () => finish({ uri: clipUri }));
  expect(mockOnRecorded).toHaveBeenCalledTimes(1);
  expect(mockOnRecorded).toHaveBeenCalledWith(clipUri);
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockDone).toHaveBeenCalledTimes(1);
  expect(jest.getTimerCount()).toBe(0);
});

it('cancels the countdown without starting a recording later', async () => {
  const view = await startCountdown();
  await view.unmount();
  expect(jest.getTimerCount()).toBe(0);
  await act(async () => { jest.advanceTimersByTime(10_000); });
  expect(mockRecord).not.toHaveBeenCalled();
  expect(mockOnRecorded).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
});

it('handles a camera rejection after unmount without a URI or callback', async () => {
  const view = await startRecording();
  await view.unmount();
  await act(async () => fail(new Error('Synthetic camera cancellation')));
  expect(mockOnRecorded).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  expect(mockDone).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('still deletes a late recording when stopping the camera throws', async () => {
  const view = await startRecording();
  mockStop.mockImplementationOnce(() => { throw new Error('Synthetic stop failure'); });
  await view.unmount();
  await act(async () => finish({ uri: clipUri }));
  expect(mockDelete).toHaveBeenCalledWith(clipUri);
  expect(mockOnRecorded).not.toHaveBeenCalled();
  expect(mockDone).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

it('allows manual tutorial stop without the short practice timer', async () => {
  await render(<RecordPanel durationMs={120_000} manualStop videoQuality="1080p" onRecorded={mockOnRecorded} />);
  await fireEvent(screen.getByTestId('synthetic-camera'), 'cameraReady');
  await fireEvent.press(screen.getByTestId('record-button'));
  for (let tick = 0; tick < 3; tick++) await act(async () => { jest.advanceTimersByTime(1000); });
  await act(async () => { jest.advanceTimersByTime(6000); });
  expect(mockStop).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Selesai rekam' }));
  expect(mockStop).toHaveBeenCalledTimes(1);
  expect(mockOnRecorded).not.toHaveBeenCalled();
  await act(async () => finish({ uri: clipUri }));
  expect(mockOnRecorded).toHaveBeenCalledWith(clipUri);
  expect(jest.getTimerCount()).toBe(0);
});
