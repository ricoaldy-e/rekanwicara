/**
 * FastAPI v2 client (docs/kontrak-fe-final.md §2, §5, §9). Not yet called against a real server:
 * the local server has /v1 only.
 */
import { ApiError, httpError } from './apiError';
import { DEFAULT_TIMEOUT_MS, normalizeBaseUrl } from './client';
import type { AnalyzeResponseV2, CatalogDTO, InstructionRequest, InstructionResponse, UploadFile, WordDTO } from './types';
import { uploadMultipart, type UploadCallOptions, type XhrFactory } from './upload';

/** Access token for `Authorization: Bearer`; passed in so this module never imports auth (no cycle). */
export type GetToken = () => Promise<string | null> | string | null;

export interface V2Options {
  baseUrl: string;
  getToken?: GetToken;
  /** Called once after a 401: refresh the session and return true when it worked (kontrak §9). */
  refreshSession?: () => Promise<boolean>;
  /** The session could not be refreshed: the app signs out and goes to the sign-in screen. */
  onSessionLost?: () => void;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  xhrFactory?: XhrFactory;
}

const INSTRUCTION_TIMEOUT_MS = 20_000;

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

const isUnauthenticated = (err: unknown) => err instanceof ApiError && err.code === 'UNAUTHENTICATED';

async function authHeader(getToken?: GetToken): Promise<Record<string, string>> {
  const token = getToken ? await getToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function createV2Client(opts: V2Options) {
  const base = normalizeBaseUrl(opts.baseUrl);
  const fetchFn = opts.fetchFn ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(path: string, init: { body?: unknown; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
    const limit = init.timeoutMs ?? timeoutMs;
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, limit);
    const onAbort = () => controller.abort();
    init.signal?.addEventListener('abort', onAbort);
    let res: Response;
    try {
      res = await fetchFn(`${base}${path}`, {
        method: init.body === undefined ? 'GET' : 'POST',
        headers: {
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(await authHeader(opts.getToken)),
        },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        signal: controller.signal,
      });
    } catch {
      if (timedOut) throw new ApiError('timeout', `No response within ${limit} ms`);
      if (init.signal?.aborted) throw new ApiError('cancelled', 'Request cancelled');
      throw new ApiError('network', 'Network request failed');
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', onAbort);
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

  const get = <T,>(path: string) => request<T>(path);

  /** 401 UNAUTHENTICATED: refresh the session and try once more; if that fails, tell the app the session is lost. */
  async function authed<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (err) {
      if (!isUnauthenticated(err) || !opts.refreshSession) throw err;
      if (await opts.refreshSession().catch(() => false)) {
        try {
          return await call();
        } catch (again) {
          if (!isUnauthenticated(again)) throw again;
        }
      }
      opts.onSessionLost?.();
      throw err;
    }
  }

  return {
    getCatalog: () => authed(() => get<CatalogDTO>('/v2/catalog')),
    getWord: (id: string) => authed(() => get<WordDTO>(`/v2/words/${encodeURIComponent(id)}`)),
    /** kontrak §7: only the text goes out, never a video. Times out after 20 s. */
    generateInstruction: (req: InstructionRequest, signal?: AbortSignal) =>
      authed(() => request<InstructionResponse>('/v2/instructions/generate', { body: req, signal, timeoutMs: INSTRUCTION_TIMEOUT_MS })),
    async analyze(
      req: { file: UploadFile; item_id: string; session_id: string },
      callOpts?: UploadCallOptions,
    ): Promise<AnalyzeResponseV2> {
      const { file, ...fields } = req;
      return authed(async () => {
        try {
          return await uploadMultipart<AnalyzeResponseV2>(
            { url: `${base}/v2/analyze`, fields, file, headers: await authHeader(opts.getToken) },
            callOpts,
            opts.xhrFactory,
          );
        } catch (err) {
          throw withV2Code(err);
        }
      });
    },
  };
}

export type V2Client = ReturnType<typeof createV2Client>;
