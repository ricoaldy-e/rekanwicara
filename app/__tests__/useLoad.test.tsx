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
