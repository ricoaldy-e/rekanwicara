const mockSign = jest.fn();
jest.mock('../src/config', () => ({ USE_MOCK: false }));
jest.mock('../src/data/supabase', () => ({
  isSupabaseConfigured: true,
  getClient: () => ({ storage: { from: (bucket: string) => ({ createSignedUrl: (path: string, s: number) => mockSign(bucket, path, s) }) } }),
}));

import { signedVideoUrl } from '../src/data/videoUrl';

const ref = { bucket: 'rekan-wicara-tutorials', path: 'default/level-1/a.mp4', position: 1 };

beforeEach(() => mockSign.mockReset().mockResolvedValue({ data: { signedUrl: 'https://s/a.mp4' }, error: null }));

it('signs the catalog path for five minutes', async () => {
  await expect(signedVideoUrl(ref)).resolves.toBe('https://s/a.mp4');
  expect(mockSign).toHaveBeenCalledWith('rekan-wicara-tutorials', 'default/level-1/a.mp4', 300);
});

it('returns null without calling Storage when the server marks the video missing or the path is unsafe', async () => {
  await expect(signedVideoUrl({ ...ref, available: false })).resolves.toBeNull();
  await expect(signedVideoUrl({ ...ref, path: 'default/../secret.mp4' })).resolves.toBeNull();
  await expect(signedVideoUrl({ ...ref, path: '/abs.mp4' })).resolves.toBeNull();
  expect(mockSign).not.toHaveBeenCalled();
});

it('rejects when Storage answers with an error', async () => {
  mockSign.mockResolvedValue({ data: null, error: { message: 'denied' } });
  await expect(signedVideoUrl(ref)).rejects.toThrow();
});
