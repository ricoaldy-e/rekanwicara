import { createApiClient } from '../src/api/client';
import { getCatalog } from '../src/data/catalog';

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

it('uses the Home catalog data layer with JWT and current default metadata only', async () => {
  const level_1 = ['a', 'i', 'u', 'e', 'o'].map((vowel) => ({ id: `l1_${vowel}`, text: vowel.toUpperCase(), instruction: 'Ucapkan perlahan.', videos: [] }));
  const words = ['tolong', 'polisi', 'api', 'sakit', 'obat', 'alamat', 'makan', 'haus'].map((word) => ({ id: `kp_${word}`, text: word.toUpperCase(), source: 'default', has_level_2: word !== 'haus', automatic_evaluation: false }));
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ level_1, words }) } as Response);
  try {
    const result = await getCatalog({ baseUrl: 'http://catalog.example.test', mock: false, getToken: async () => 'fixture-token' });
    expect(result.words.map((word) => word.id)).toEqual(words.map((word) => word.id));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('http://catalog.example.test/v2/catalog', expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer fixture-token' }) }));
  } finally { fetcher.mockRestore(); }
});

it('rejects malformed server metadata before Home attempts to render it', async () => {
  const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ level_1: [{ id: 'l1_a' }], words: [] }) } as Response);
  try {
    await expect(getCatalog({ baseUrl: 'http://catalog.example.test', mock: false, getToken: async () => 'fixture-token' })).rejects.toMatchObject({ kind: 'parse' });
  } finally { fetcher.mockRestore(); }
});
