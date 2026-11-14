import { ApiError, createApiClient, isValidBaseUrl, normalizeBaseUrl } from '../src/api/client';
import { errorMessage } from '../src/api/errors';
import type { HealthResponse, Item } from '../src/api/types';

const BASE = 'http://192.168.1.10:8000';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function badJsonResponse(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  } as unknown as Response;
}

/** A fetch that never resolves on its own but rejects when its AbortSignal fires (like real fetch). */
function hangingFetch(): jest.Mock {
  return jest.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  );
}

const health: HealthResponse = { status: 'ok', engine_version: '0.1.0', scorer_mode: 'rules', mock_mode: true };
const items: Item[] = [
  { item_id: 'l1_a', level: 1, text: 'a', units: ['a'], priority: 'required', emoji: null, active: true },
  { item_id: 'l3_mama', level: 3, text: 'mama', units: ['ma', 'ma'], priority: 'required', emoji: '👩', active: true },
];

describe('createApiClient', () => {
  it('checks tutorial presence with the supplied bearer', async () => {
    const body = { items: [], max_duration_s: 120, max_upload_mb: 50 };
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(body));
    await expect(createApiClient(BASE, { fetchFn }).getTutorials('fixture-token')).resolves.toEqual(body);
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/v1/tutorials`);
    expect(fetchFn.mock.calls[0][1].headers.Authorization).toBe('Bearer fixture-token');
  });
  it('deletes only the bearer owner without sending a target user id', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({ status: 'deleted' }));
    await expect(createApiClient(BASE, { fetchFn }).deleteAccount('fixture-token')).resolves.toEqual({ status: 'deleted' });
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/v1/auth/account`);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({ method: 'DELETE', headers: { Authorization: 'Bearer fixture-token' } });
    expect(fetchFn.mock.calls[0][1].body).toBeUndefined();
  });

  it('does not accept an unrelated response as successful account deletion', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({ status: 'ok' }));
    await expect(createApiClient(BASE, { fetchFn }).deleteAccount('fixture-token')).rejects.toMatchObject({ kind: 'parse' });
  });
  it('GET /v1/health returns the parsed body and calls the right URL', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(health));
    const api = createApiClient(BASE, { fetchFn });

    await expect(api.getHealth()).resolves.toEqual(health);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${BASE}/v1/health`);
    expect(init.headers).toMatchObject({ Accept: 'application/json' });
    expect(init.signal).toBeDefined();
  });

  it('GET /v1/items returns the item list', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(items));
    const api = createApiClient(BASE, { fetchFn });

    await expect(api.getItems()).resolves.toEqual(items);
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/v1/items`);
  });

  it('strips trailing slashes and whitespace from the base URL', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(health));
    const api = createApiClient(`  ${BASE}///  `, { fetchFn });

    await api.getHealth();
    expect(api.baseUrl).toBe(BASE);
    expect(fetchFn.mock.calls[0][0]).toBe(`${BASE}/v1/health`);
  });

  it('uses the global fetch when no fetchFn is given', async () => {
    const original = global.fetch;
    const mockFetch = jest.fn().mockResolvedValue(jsonResponse(health));
    global.fetch = mockFetch as unknown as typeof fetch;
    try {
      await expect(createApiClient(BASE).getHealth()).resolves.toEqual(health);
      expect(mockFetch).toHaveBeenCalledWith(`${BASE}/v1/health`, expect.any(Object));
    } finally {
      global.fetch = original;
    }
  });

  it('maps a rejected fetch to a network error', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const api = createApiClient(BASE, { fetchFn });

    const err = await api.getItems().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: 'network', status: null, code: null });
  });

  it('aborts and reports a timeout when the server does not answer in time', async () => {
    const fetchFn = hangingFetch();
    const api = createApiClient(BASE, { fetchFn, timeoutMs: 20 });

    const err = await api.getHealth().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).kind).toBe('timeout');
    const signal: AbortSignal = fetchFn.mock.calls[0][1].signal;
    expect(signal.aborted).toBe(true);
  });

  it('does not abort a request that finishes before the timeout', async () => {
    jest.useFakeTimers();
    try {
      let captured: AbortSignal | undefined;
      const fetchFn = jest.fn((_u: RequestInfo | URL, init?: RequestInit) => {
        captured = init?.signal ?? undefined;
        return Promise.resolve(jsonResponse(health));
      });
      await createApiClient(BASE, { fetchFn: fetchFn as typeof fetch, timeoutMs: 1000 }).getHealth();
      jest.advanceTimersByTime(5000);
      expect(captured?.aborted).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('maps a server error body {"detail":{code,message}} to an http error', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(jsonResponse({ detail: { code: 'not_found', message: 'Not Found' } }, 404));
    const api = createApiClient(BASE, { fetchFn });

    const err = await api.getItems().catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'http', status: 404, code: 'not_found', message: 'Not Found' });
  });

  it('maps a non-JSON error response to an http error without code', async () => {
    const fetchFn = jest.fn().mockResolvedValue(badJsonResponse(502));
    const err = await createApiClient(BASE, { fetchFn }).getHealth().catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'http', status: 502, code: null });
  });

  it('maps an error body in an unexpected shape to an http error without code', async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({ detail: 'oops' }, 500));
    const err = await createApiClient(BASE, { fetchFn }).getHealth().catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'http', status: 500, code: null });
  });

  it('maps an invalid JSON 200 response to a parse error', async () => {
    const fetchFn = jest.fn().mockResolvedValue(badJsonResponse(200));
    const err = await createApiClient(BASE, { fetchFn }).getItems().catch((e: unknown) => e);
    expect(err).toMatchObject({ kind: 'parse', status: 200 });
  });
});

describe('URL helpers', () => {
  it('normalizeBaseUrl trims and removes trailing slashes', () => {
    expect(normalizeBaseUrl(' http://10.0.0.2:8000/ ')).toBe('http://10.0.0.2:8000');
  });

  it.each([
    ['http://192.168.1.10:8000', true],
    ['https://example.org', true],
    ['http://localhost:8000/', true],
    ['192.168.1.10:8000', false],
    ['ftp://192.168.1.10', false],
    ['http://', false],
    ['', false],
  ])('isValidBaseUrl(%p) = %p', (url, expected) => {
    expect(isValidBaseUrl(url)).toBe(expected);
  });
});

describe('errorMessage', () => {
  it('returns Indonesian text for each error kind', () => {
    expect(errorMessage(new ApiError('network', 'x'))).toMatch(/Wi-Fi yang sama/);
    expect(errorMessage(new ApiError('timeout', 'x'))).toMatch(/terlalu lama/);
    expect(errorMessage(new ApiError('parse', 'x'))).toMatch(/tidak dapat dibaca/);
    expect(errorMessage(new ApiError('http', 'x', 404, 'not_found'))).toMatch(/tidak ditemukan/);
    expect(errorMessage(new ApiError('http', 'x', 503))).toMatch(/Server sedang bermasalah/);
    expect(errorMessage(new Error('boom'))).toMatch(/Terjadi kesalahan/);
  });
});
