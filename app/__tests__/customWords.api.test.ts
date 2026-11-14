import { createApiClient } from '../src/api/client';
import { contractV2 } from '../test-fixtures/api-v2-contract';

it('sends all CRUD operations with the caller JWT and synchronized JSON payloads', async () => {
  const fetchFn = jest.fn(async () => ({ ok: true, status: 200, json: async () => contractV2.manualWord }));
  const api = createApiClient('http://fixture.test', { fetchFn: fetchFn as unknown as typeof fetch });
  const id = contractV2.manualWord.id;
  await api.listCustomWords('fixture-token');
  await api.createCustomWord(contractV2.manualWrite, 'fixture-token');
  await api.getCustomWord(id, 'fixture-token');
  await api.updateCustomWord(id, contractV2.manualWrite, 'fixture-token');
  await api.cleanupCustomWord(id, 'fixture-token');
  await api.deleteCustomWord(id, 2, 'fixture-token');
  expect(fetchFn.mock.calls).toHaveLength(6);
  const calls = fetchFn.mock.calls as unknown as [string, RequestInit][];
  expect(calls.map((call) => [call[0], call[1].method])).toEqual([
    ['http://fixture.test/v2/custom-words', 'GET'], ['http://fixture.test/v2/custom-words', 'POST'],
    [`http://fixture.test/v2/custom-words/${id}`, 'GET'], [`http://fixture.test/v2/custom-words/${id}`, 'PATCH'],
    [`http://fixture.test/v2/custom-words/${id}/cleanup`, 'POST'], [`http://fixture.test/v2/custom-words/${id}?revision=2`, 'DELETE'],
  ]);
  expect(calls.every((call) => (call[1].headers as Record<string, string>).Authorization === 'Bearer fixture-token')).toBe(true);
  expect(JSON.parse(calls[1][1].body as string)).toEqual(contractV2.manualWrite);
  expect(JSON.parse(calls[1][1].body as string)).not.toHaveProperty('user_id');
});
