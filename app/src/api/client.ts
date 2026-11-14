import type {
  Wav2Vec2Response,
  CombinedResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  CalibrateRequest,
  CalibrateResponse,
  DatasetUploadRequest,
  DatasetUploadResponse,
  HealthResponse,
  ItemsResponse,
  MockVariant,
  UploadFile,
} from './types';
import { ApiError, httpError } from './apiError';
import { uploadNative } from './nativeUpload';
import { isCombinedResponse, isWav2Vec2Response } from './experimentResponses';
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
  analyze(req: AnalyzeRequest, options?: AnalysisCallOptions): Promise<AnalyzeResponse>;
  calibrate(req: CalibrateRequest, options?: AnalysisCallOptions): Promise<CalibrateResponse>;
  datasetUpload(req: DatasetUploadRequest, options?: UploadCallOptions): Promise<DatasetUploadResponse>;
  wav2vec2(file: UploadFile, options?: UploadCallOptions): Promise<Wav2Vec2Response>;
  combined(file: UploadFile, target: CombinedResponse['target'], options?: UploadCallOptions): Promise<CombinedResponse>;
  /** True when GET /v1/model-video/{itemId} exists (asks for 1 byte only), false on 404. */
  hasModelVideo(itemId: string): Promise<boolean>;
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

  return {
    baseUrl: base,
    getHealth: () => request<HealthResponse>('/v1/health'),
    getItems: () => request<ItemsResponse>('/v1/items'),

    analyze: ({ file, ...fields }, opts) =>
      upload<AnalyzeResponse>(`/v1/analyze${mockQuery(opts?.mock)}`, fields, file, opts),

    calibrate: ({ file, ...fields }, opts) =>
      upload<CalibrateResponse>(`/v1/calibrate${mockQuery(opts?.mock)}`, fields, file, opts),

    datasetUpload: ({ file, ...fields }, opts) =>
      upload<DatasetUploadResponse>('/v1/dataset/upload', fields, file, opts),

    async wav2vec2(file, opts) {
      const body = await uploadNative(`${base}/v1/experiments/wav2vec2`, file, opts);
      if (!isWav2Vec2Response(body)) {
        throw new ApiError('parse', 'Invalid Wav2Vec2 result');
      }
      return body;
    },

    async combined(file, target, opts) {
      const body = await uploadNative(`${base}/v1/experiments/combined`, file, opts, { target });
      if (!isCombinedResponse(body) || body.target !== target) throw new ApiError('parse', 'Invalid combined result');
      return body;
    },

    async hasModelVideo(itemId: string) {
      // Range: 1 byte is enough to learn whether the file exists (server answers 206/200 or 404).
      const res = await send(`/v1/model-video/${encodeURIComponent(itemId)}`, {
        headers: { Range: 'bytes=0-0', Accept: 'video/mp4' },
      });
      if (res.status === 200 || res.status === 206) return true;
      if (res.status === 404) return false;
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // not JSON: keep body null
      }
      throw httpError(res.status, body);
    },
  };
}
