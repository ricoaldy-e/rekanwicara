import { renderHook, waitFor } from '@testing-library/react-native';

import { useLoad } from '../src/data/useCatalog';

// Stable functions, like the useCallback in useCatalog: a new `load` each render would reload forever.
const v1 = () => Promise.resolve('v1');
const v2 = () => Promise.resolve('v2');
const plain = () => Promise.resolve('x');

it('shows the last result at once when a screen opens again, and refreshes behind it', async () => {
  const first = await renderHook(() => useLoad(v1, 'key'));
  await waitFor(() => expect(first.result.current.data).toBe('v1'));
  first.unmount();

  const again = await renderHook(() => useLoad(v2, 'key'));
  expect(again.result.current.data).toBe('v1'); // no empty state, so no spinner flash
  await waitFor(() => expect(again.result.current.data).toBe('v2'));
});

it('loads without a cache key too', async () => {
  const { result } = await renderHook(() => useLoad(plain));
  await waitFor(() => expect(result.current.data).toBe('x'));
});
