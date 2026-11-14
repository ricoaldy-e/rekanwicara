import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLoad } from '../src/data/useCatalog';

// Stable functions, like the useCallback in useCatalog: a new `load` each render would reload forever.
const v1 = () => Promise.resolve('v1');
let release!: (value: string) => void;
// Held open so the first frame of the second screen can be checked before the refresh lands.
const v2 = () => new Promise<string>((resolve) => (release = resolve));

it('shows the last result at once when a screen opens again, and refreshes behind it', async () => {
  const first = await renderHook(() => useLoad(v1, 'key'));
  await waitFor(() => expect(first.result.current.data).toBe('v1'));
  await first.unmount();

  const again = await renderHook(() => useLoad(v2, 'key'));
  expect(again.result.current.data).toBe('v1'); // no empty state, so no spinner flash
  expect(again.result.current.loading).toBe(true);
  await act(async () => release('v2'));
  await waitFor(() => expect(again.result.current.data).toBe('v2'));
});

it('hides the previous scope immediately when its cache key changes', async () => {
  const first = () => Promise.resolve('private-A');
  const next = () => new Promise<string>(() => {});
  const hook = await renderHook(({ owner }: { owner: string }) => useLoad(owner === 'A' ? first : next, `scope:${owner}`), { initialProps: { owner: 'A' } });
  await waitFor(() => expect(hook.result.current.data).toBe('private-A'));
  await hook.rerender({ owner: 'B' });
  expect(hook.result.current.data).toBeNull();
  expect(hook.result.current.loading).toBe(true);
});

it('never fills the cache from a response that arrives after unmount', async () => {
  let finish!: (value: string) => void;
  const pending = () => new Promise<string>((resolve) => { finish = resolve; });
  const first = await renderHook(() => useLoad(pending, 'cancelled-scope'));
  await first.unmount();
  await act(async () => finish('stale-private-data'));
  const again = await renderHook(() => useLoad(pending, 'cancelled-scope'));
  expect(again.result.current.data).toBeNull();
});
