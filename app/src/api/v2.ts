/**
 * FastAPI v2 client (docs/kontrak-fe-final.md §2, §5, §9). Not yet called against a real server:
 * the local server has /v1 only.
 */
import { ApiError, httpError } from './apiError';
import { DEFAULT_TIMEOUT_MS, normalizeBaseUrl } from './client';
import type { AnalyzeResponseV2, CatalogDTO, UploadFile, WordDTO } from './types';
import { uploadMultipart, type UploadCallOptions, type XhrFactory } from './upload';

/** Access token for `Authorization: Bearer`; passed in so this module never imports auth (no cycle). */
export type GetToken = () => Promise<string | null> | string | null;

export interface V2Options {
  baseUrl: string;
  getToken?: GetToken;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  xhrFactory?: XhrFactory;
}

/** §9: code used when an error body carries none. */
const CODE_BY_STATUS: Record<number, string> = {
  400: 'INVALID_INPUT',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'ITEM_NOT_FOUND',
  413: 'FILE_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA',
  422: 'INVALID_INPUT',
  429: 'GENERATION_RATE_LIMITED',
  503: 'AI_UNAVAILABLE',
  504: 'INFERENCE_TIMEOUT',
};

export function withV2Code(err: unknown): unknown {
  if (!(err instanceof ApiError) || err.kind !== 'http' || err.code || err.status === null) return err;
  return new ApiError('http', err.message, err.status, CODE_BY_STATUS[err.status] ?? null);
}

async function authHeader(getToken?: GetToken): Promise<Record<string, string>> {
  const token = getToken ? await getToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function createV2Client(opts: V2Options) {
  const base = normalizeBaseUrl(opts.baseUrl);
  const fetchFn = opts.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function get<T>(path: string): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    let res: Response;
    try {
      res = await fetchFn(`${base}${path}`, {
        headers: { Accept: 'application/json', ...(await authHeader(opts.getToken)) },
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new ApiError('timeout', `No response within ${timeoutMs} ms`);
      throw new ApiError('network', 'Network request failed');
    } finally {
      clearTimeout(timer);
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      if (!res.ok) throw withV2Code(new ApiError('http', `HTTP ${res.status}`, res.status));
      throw new ApiError('parse', 'Response is not valid JSON', res.status);
    }
    if (!res.ok) throw withV2Code(httpError(res.status, body));
    return body as T;
  }

  return {
    getCatalog: () => get<CatalogDTO>('/v2/catalog'),
    getWord: (id: string) => get<WordDTO>(`/v2/words/${encodeURIComponent(id)}`),
    async analyze(
      req: { file: UploadFile; item_id: string; session_id: string },
      callOpts?: UploadCallOptions,
    ): Promise<AnalyzeResponseV2> {
      const { file, ...fields } = req;
      try {
        return await uploadMultipart<AnalyzeResponseV2>(
          { url: `${base}/v2/analyze`, fields, file, headers: await authHeader(opts.getToken) },
          callOpts,
          opts.xhrFactory,
        );
      } catch (err) {
        throw withV2Code(err);
      }
    },
  };
}

export type V2Client = ReturnType<typeof createV2Client>;
