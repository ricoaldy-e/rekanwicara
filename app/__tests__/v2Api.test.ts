import { createApiClient } from '../src/api/client';

it('fetches the catalog and exact Level 1 detail with the supplied current JWT', async () => {
  const material = { id: 'l1_e', text: 'E', instruction: 'Ucapkan E.', videos: [], level: 1, automatic_evaluation: true };
  const fetchFn = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ level_1: [material], words: [] }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => material });
  const api = createApiClient('http://example.test', { fetchFn });
  await expect(api.getV2Catalog('current-token')).resolves.toMatchObject({ level_1: [material] });
  await expect(api.getV2Item('l1_e', 'current-token')).resolves.toEqual(material);
  expect(fetchFn.mock.calls[0][0]).toBe('http://example.test/v2/catalog');
  expect(fetchFn.mock.calls[1][0]).toBe('http://example.test/v2/items/l1_e');
  expect(fetchFn.mock.calls.every(([, init]) => init.headers.Authorization === 'Bearer current-token')).toBe(true);
});
it('rejects missing metadata and a detail response for another item', async () => {
  const fetchFn = jest.fn().mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ level_1: null }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'l1_a', text: 'A', instruction: 'Ucapkan A.', videos: [], level: 1, automatic_evaluation: true }) });
  const api = createApiClient('http://example.test', { fetchFn });
  await expect(api.getV2Catalog('token')).rejects.toMatchObject({ kind: 'parse' });
  await expect(api.getV2Item('l1_e', 'token')).rejects.toMatchObject({ kind: 'parse' });
});
