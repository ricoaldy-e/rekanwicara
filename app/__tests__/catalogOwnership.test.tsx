import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { SourceOptions } from '../src/data/catalog';
import { useCatalog } from '../src/data/useCatalog';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
let mockUid = A;
let mockScope = 0;
let mockFocus: () => void;
const mockGetCatalog = jest.fn();
const mockSignOut = jest.fn();
jest.mock('expo-router', () => ({ useFocusEffect: (callback: () => void) => {
  jest.requireActual<typeof import('react')>('react').useEffect(() => { mockFocus = callback; return callback(); }, [callback]);
} }));
jest.mock('../src/auth/AuthProvider', () => ({ useAuth: () => ({ uid: mockUid }) }));
jest.mock('../src/auth/session', () => ({ auth: {
  getSession: async () => ({ uid: mockUid }),
  getAccessToken: async () => 'fixture-token',
  refreshAccessToken: async () => 'fixture-refreshed-token',
  signOut: (...args: unknown[]) => mockSignOut(...args),
} }));
jest.mock('../src/data/catalog', () => ({ getCatalog: (...args: unknown[]) => mockGetCatalog(...args) }));

const catalog = (word = 'owned-word') => ({
  level_1: ['a', 'i', 'u', 'e', 'o'].map((vowel) => ({ id: `l1_${vowel}`, text: vowel.toUpperCase(), instruction: `Ucapkan ${vowel}.`, videos: [] })),
  words: [{ id: word, text: word, source: 'custom', has_level_2: false, automatic_evaluation: false }],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUid = A;
  mockScope += 1;
  mockGetCatalog.mockReset().mockResolvedValue(catalog());
});
const url = () => `http://catalog-${mockScope}.example.test`;

it('loads all five vowels with no tutorial requirement and refreshes on return to the screen', async () => {
  const hook = await renderHook(() => useCatalog({ baseUrl: url(), mock: false }));
  await waitFor(() => expect(hook.result.current.data?.level1).toHaveLength(5));
  expect(mockGetCatalog).toHaveBeenCalledTimes(1);
  expect(hook.result.current.data!.level1.every((item) => item.video === undefined)).toBe(true);
  await act(async () => mockFocus());
  await waitFor(() => expect(mockGetCatalog).toHaveBeenCalledTimes(2));
});

it('does not show account A cached custom words when account B opens the same server', async () => {
  const first = await renderHook(() => useCatalog({ baseUrl: url(), mock: false }));
  await waitFor(() => expect(first.result.current.data?.words[0].id).toBe('owned-word'));
  await first.unmount();
  mockUid = B;
  let finish!: (value: ReturnType<typeof catalog>) => void;
  mockGetCatalog.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const second = await renderHook(() => useCatalog({ baseUrl: url(), mock: false }));
  expect(second.result.current.data).toBeNull();
  await waitFor(() => expect(mockGetCatalog).toHaveBeenCalledTimes(2));
  await act(async () => finish(catalog('account-B-word')));
  expect(second.result.current.data?.words[0].id).toBe('account-B-word');
});

it('ignores a delayed previous-owner response and never puts it in the previous cache', async () => {
  let finish!: (value: ReturnType<typeof catalog>) => void;
  mockGetCatalog.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const hook = await renderHook(() => useCatalog({ baseUrl: url(), mock: false }));
  await waitFor(() => expect(mockGetCatalog).toHaveBeenCalledTimes(1));
  mockUid = B;
  mockGetCatalog.mockResolvedValue(catalog('account-B-word'));
  await hook.rerender(undefined);
  await waitFor(() => expect(hook.result.current.data?.words[0].id).toBe('account-B-word'));
  await act(async () => finish(catalog('stale-account-A-word')));
  expect(hook.result.current.data?.words[0].id).toBe('account-B-word');
  await hook.unmount();
  mockUid = A;
  mockGetCatalog.mockImplementationOnce(() => new Promise(() => {}));
  const again = await renderHook(() => useCatalog({ baseUrl: url(), mock: false }));
  expect(again.result.current.data).toBeNull();
});

it('keeps different servers and mock/live sources in separate cache scopes', async () => {
  const hook = await renderHook(({ baseUrl, mock }: { baseUrl: string; mock: boolean }) => useCatalog({ baseUrl, mock }), { initialProps: { baseUrl: url(), mock: true } });
  await waitFor(() => expect(hook.result.current.data).not.toBeNull());
  mockGetCatalog.mockImplementationOnce(() => new Promise(() => {}));
  await hook.rerender({ baseUrl: url(), mock: false });
  expect(hook.result.current.data).toBeNull();
  mockGetCatalog.mockImplementationOnce(() => new Promise(() => {}));
  await hook.rerender({ baseUrl: 'http://another.example.test', mock: false });
  expect(hook.result.current.data).toBeNull();
});

it('never supplies a new owner token or logs out a new owner for a stale request', async () => {
  const hook = await renderHook(() => useCatalog({ baseUrl: url(), mock: false }));
  await waitFor(() => expect(hook.result.current.data).not.toBeNull());
  const options = mockGetCatalog.mock.calls[0][0] as SourceOptions;
  expect(await options.getToken!()).toBe('fixture-token');
  mockUid = B;
  await expect(options.getToken!()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  await expect(options.refreshSession!()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  await act(async () => options.onSessionLost!());
  expect(mockSignOut).not.toHaveBeenCalled();
});

it('offers reload after a network error without substituting mock material', async () => {
  mockGetCatalog.mockRejectedValueOnce(new Error('offline'));
  const hook = await renderHook(() => useCatalog({ baseUrl: url(), mock: false }));
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(hook.result.current.data).toBeNull();
  await act(async () => hook.result.current.reload());
  await waitFor(() => expect(hook.result.current.data?.level1).toHaveLength(5));
  expect(mockGetCatalog.mock.calls.every(([options]) => options.mock === false)).toBe(true);
});
