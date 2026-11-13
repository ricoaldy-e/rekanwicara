import type { ApiClient } from '../src/api/client';
import { parseAnalyzeApi } from '../src/config';
import { analyze, NotSupportedError } from '../src/data/analyze';
import { wordToPath } from '../src/data/mappers';
import { MOCK_WORDS } from '../src/mock';

const file = { uri: 'file:///clip.mp4', name: 'clip.mp4', type: 'video/mp4' };
const tolong = wordToPath(MOCK_WORDS['custom_word:11111111-1111-1111-1111-111111111111']).whole;
const mama = wordToPath(MOCK_WORDS.l3_mama).whole;

function fakeApi(): ApiClient & { analyze: jest.Mock } {
  return { baseUrl: 'http://x', analyze: jest.fn() } as unknown as ApiClient & { analyze: jest.Mock };
}

describe('ANALYZE_API', () => {
  it.each([
    [undefined, 'v1'],
    ['', 'v1'],
    ['v3', 'v1'],
    ['V2', 'v1'],
    ['v2', 'v2'],
    ['mock', 'mock'],
  ])('%p → %p', (raw, expected) => {
    expect(parseAnalyzeApi(raw)).toBe(expected);
  });
});

describe('analyze', () => {
  it('rejects a custom word on v1 with NOT_SUPPORTED_V1 and uploads nothing', async () => {
    const api = fakeApi();
    const p = analyze({ file, item: tolong, sessionId: 's', userId: 'u' }, { api, source: 'v1' });
    await expect(p).rejects.toBeInstanceOf(NotSupportedError);
    await expect(p).rejects.toMatchObject({ code: 'NOT_SUPPORTED_V1' });
    expect(api.analyze).not.toHaveBeenCalled();
  });

  it('marks mock results as samples and keeps two statuses at Level 3', async () => {
    const api = fakeApi();
    const results = [];
    for (let i = 0; i < 3; i++) {
      results.push(await analyze({ file, item: mama, sessionId: 's', userId: 'u' }, { api, source: 'mock' }));
    }
    expect(results.every((r) => r.sample)).toBe(true);
    expect(results.map((r) => r.status)).toEqual(['evaluated', 'evaluated', 'retry']);
    expect(results.map((r) => r.result)).not.toContain('mendekati');
    expect(results.every((r) => r.visuals === null)).toBe(true);
    expect(api.analyze).not.toHaveBeenCalled();
  });
});
