import { recordWithCamera } from '../src/data/pickVideo';
import { VIDEO_LIMITS } from '../src/forms/limits';
const mockCamera = jest.fn();
const mockMic = jest.fn();
const mockRecord = jest.fn();
jest.mock('expo-camera', () => ({ Camera: { requestMicrophonePermissionsAsync: () => mockMic() } }));
jest.mock('expo-image-picker', () => ({ CameraType: { front: 'front' }, requestCameraPermissionsAsync: () => mockCamera(), launchCameraAsync: (...args: unknown[]) => mockRecord(...args) }));
beforeEach(() => {
  jest.clearAllMocks(); mockCamera.mockResolvedValue({ granted: true }); mockMic.mockResolvedValue({ granted: true });
  mockRecord.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///camera.mp4', mimeType: 'video/mp4', fileSize: 24, duration: 4000 }] });
});
it('requests camera and microphone before recording with a duration limit', async () => {
  expect(await recordWithCamera()).toMatchObject({ kind: 'picked', file: { fileSize: 24, durationMs: 4000 } });
  expect(mockMic).toHaveBeenCalledTimes(1);
  expect(mockRecord).toHaveBeenCalledWith({ mediaTypes: ['videos'], cameraType: 'front', videoMaxDuration: VIDEO_LIMITS.maxDurationMs / 1000 });
});
it('never starts recording without camera permission', async () => {
  mockCamera.mockResolvedValue({ granted: false }); expect(await recordWithCamera()).toEqual({ kind: 'denied' }); expect(mockRecord).not.toHaveBeenCalled();
});
it('never accepts a silent capture when microphone permission is denied', async () => {
  mockMic.mockResolvedValue({ granted: false }); expect(await recordWithCamera()).toEqual({ kind: 'denied' }); expect(mockRecord).not.toHaveBeenCalled();
});
it('keeps cancellation distinct from a camera failure', async () => {
  mockRecord.mockResolvedValueOnce({ canceled: true, assets: [] }).mockRejectedValueOnce(new Error('camera failure'));
  expect(await recordWithCamera()).toEqual({ kind: 'cancelled' }); expect(await recordWithCamera()).toEqual({ kind: 'error' });
});
