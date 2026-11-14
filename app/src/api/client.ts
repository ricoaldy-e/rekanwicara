import type {
  CustomWordDetail,
  CustomWordWrite,
  CustomWordList,
  CustomWordDeletion,
  AccountDeletionResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  CalibrateRequest,
  CalibrateResponse,
  HealthResponse,
  ItemsResponse,
  MockVariant,
  UploadFile,
} from './types';
import { ApiError, httpError } from './apiError';
import { uploadMultipart, type UploadCallOptions, type XhrFactory } from './upload';

type MultipartFields = Record<string, string | number | undefined>;

export const DEFAULT_TIMEOUT_MS = 10_000;

export { ApiError, type ApiErrorKind } from './apiError';

export interface ApiClientOptions {
  timeoutMs?: number;
  /** Injected for tests; defaults to the global fetch. */
  fetchFn?: typeof fetch;
  /** Injected for tests; defaults to the global XMLHttpRequest (used for uploads with progress). */
  xhrFactory?: XhrFactory;
}

/** Upload options plus the dev-only mock variant query (SPEC §5 "Mode mock"). */
export interface AnalysisCallOptions extends UploadCallOptions {
  mock?: MockVariant;
}

export interface ApiClient {
  readonly baseUrl: string;
  getHealth(): Promise<HealthResponse>;
  getItems(): Promise<ItemsResponse>;
  listCustomWords(accessToken: string): Promise<CustomWordList>;
  getCustomWord(id: string, accessToken: string): Promise<CustomWordDetail>;
  createCustomWord(body: CustomWordWrite, accessToken: string): Promise<CustomWordDetail>;
  updateCustomWord(id: string, body: CustomWordWrite, accessToken: string): Promise<CustomWordDetail>;
  deleteCustomWord(id: string, revision: number, accessToken: string): Promise<CustomWordDeletion>;
  cleanupCustomWord(id: string, accessToken: string): Promise<CustomWordDetail>;
  deleteAccount(accessToken: string): Promise<AccountDeletionResponse>;
  analyze(req: AnalyzeRequest, options?: AnalysisCallOptions): Promise<AnalyzeResponse>;
  calibrate(req: CalibrateRequest, options?: AnalysisCallOptions): Promise<CalibrateResponse>;
}

/** Trim whitespace and trailing slashes so `${base}/v1/...` never has `//`. */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function createApiClient(baseUrl: string, options: ApiClientOptions = {}): ApiClient {
  const base = normalizeBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  /** fetch with timeout; maps transport failures to ApiError (network / timeout). */
  async function send(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    try {
      return await fetchFn(`${base}${path}`, {
        ...init,
        headers: { Accept: 'application/json', ...(init.headers ?? {}) },
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new ApiError('timeout', `No response within ${timeoutMs} ms`);
      throw new ApiError('network', 'Network request failed');
    } finally {
      clearTimeout(timer);
    }
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await send(path, init);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      if (!res.ok) throw new ApiError('http', `HTTP ${res.status}`, res.status);
      throw new ApiError('parse', 'Response is not valid JSON', res.status);
    }
    if (!res.ok) throw httpError(res.status, body);
    return body as T;
  }

  function upload<T>(path: string, fields: MultipartFields, file: UploadFile, opts?: UploadCallOptions) {
    return uploadMultipart<T>({ url: `${base}${path}`, fields, file }, opts, options.xhrFactory);
  }

  const mockQuery = (mock?: MockVariant) => (mock ? `?mock=${encodeURIComponent(mock)}` : '');

  function custom<T>(path: string, accessToken: string, method = 'GET', body?: CustomWordWrite) {
    return request<T>(`/v2/custom-words${path}`, {
      method,
      headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  return {
    baseUrl: base,
    listCustomWords: (token) => custom<CustomWordList>('', token),
    getCustomWord: (id, token) => custom<CustomWordDetail>(`/${encodeURIComponent(id)}`, token),
    createCustomWord: (body, token) => custom<CustomWordDetail>('', token, 'POST', body),
    updateCustomWord: (id, body, token) => custom<CustomWordDetail>(`/${encodeURIComponent(id)}`, token, 'PATCH', body),
    deleteCustomWord: (id, revision, token) => custom<CustomWordDeletion>(`/${encodeURIComponent(id)}?revision=${revision}`, token, 'DELETE'),
    cleanupCustomWord: (id, token) => custom<CustomWordDetail>(`/${encodeURIComponent(id)}/cleanup`, token, 'POST'),
    getHealth: () => request<HealthResponse>('/v1/health'),
    getItems: () => request<ItemsResponse>('/v1/items'),
    async deleteAccount(accessToken) {
      const body = await request<AccountDeletionResponse>('/v1/auth/account', {
        method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (body?.status !== 'deleted') throw new ApiError('parse', 'Invalid account deletion result');
      return body;
    },

    analyze: ({ file, ...fields }, opts) =>
      upload<AnalyzeResponse>(`/v1/analyze${mockQuery(opts?.mock)}`, fields, file, opts),

    calibrate: ({ file, ...fields }, opts) =>
      upload<CalibrateResponse>(`/v1/calibrate${mockQuery(opts?.mock)}`, fields, file, opts),

  };
}
