import type { ErrorResponse, HealthResponse, ItemsResponse } from './types';

export const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * - network: the server could not be reached (wrong URL, different Wi-Fi, server off).
 * - timeout: no response within the timeout.
 * - http: the server answered with a non-2xx status (`code` comes from the server body when present).
 * - parse: the server answered 2xx but the body was not valid JSON.
 */
export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string | null;

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export interface ApiClientOptions {
  timeoutMs?: number;
  /** Injected for tests; defaults to the global fetch. */
  fetchFn?: typeof fetch;
}

export interface ApiClient {
  readonly baseUrl: string;
  getHealth(): Promise<HealthResponse>;
  getItems(): Promise<ItemsResponse>;
}

/** Trim whitespace and trailing slashes so `${base}/v1/...` never has `//`. */
export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** Accepts only http(s) URLs with a host. Used by the Settings screen before saving. */
export function isValidBaseUrl(url: string): boolean {
  const u = normalizeBaseUrl(url);
  return /^https?:\/\/[^\s/:]+(:\d{1,5})?(\/[^\s]*)?$/i.test(u);
}

function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return false;
  const detail = (body as { detail: unknown }).detail;
  return typeof detail === 'object' && detail !== null && typeof (detail as { code?: unknown }).code === 'string';
}

export function createApiClient(baseUrl: string, options: ApiClientOptions = {}): ApiClient {
  const base = normalizeBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchFn = options.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    let res: Response;
    try {
      res = await fetchFn(`${base}${path}`, {
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

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      if (!res.ok) throw new ApiError('http', `HTTP ${res.status}`, res.status);
      throw new ApiError('parse', 'Response is not valid JSON', res.status);
    }

    if (!res.ok) {
      if (isErrorResponse(body)) {
        throw new ApiError('http', body.detail.message, res.status, body.detail.code);
      }
      throw new ApiError('http', `HTTP ${res.status}`, res.status);
    }
    return body as T;
  }

  return {
    baseUrl: base,
    getHealth: () => request<HealthResponse>('/v1/health'),
    getItems: () => request<ItemsResponse>('/v1/items'),
  };
}
