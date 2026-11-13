import { ApiError, httpError, isRetryable } from './apiError';
import type { UploadFile } from './types';

/**
 * Multipart upload with progress (SPEC §8.2). React Native's fetch has no upload progress, so this
 * uses XMLHttpRequest, which accepts `{ uri, name, type }` file parts in FormData.
 */

export const UPLOAD_TIMEOUT_MS = 60_000;
export const DEFAULT_RETRY_DELAYS_MS = [1000, 2000] as const;

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0..1, or null when the total size is unknown. */
  fraction: number | null;
}

export interface UploadCallOptions {
  onProgress?: (p: UploadProgress) => void;
  /** Called before each automatic retry (attempt starts at 2). */
  onRetry?: (attempt: number, err: ApiError) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Delay before each automatic retry; its length is the number of retries. Default: 2 retries. */
  retryDelaysMs?: readonly number[];
}

/** The subset of XMLHttpRequest used here, so tests can provide a fake. */
export interface XhrLike {
  open(method: string, url: string): void;
  send(body: unknown): void;
  abort(): void;
  setRequestHeader(name: string, value: string): void;
  timeout: number;
  status: number;
  responseText: string;
  upload: { onprogress: ((ev: { loaded: number; total: number; lengthComputable: boolean }) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  ontimeout: (() => void) | null;
  onabort: (() => void) | null;
}

export type XhrFactory = () => XhrLike;

export interface MultipartRequest {
  url: string;
  fields: Record<string, string | number | undefined>;
  file: UploadFile;
  /** Extra request headers (e.g. Authorization for /v2). */
  headers?: Record<string, string>;
}

const defaultXhr: XhrFactory = () => new XMLHttpRequest() as unknown as XhrLike;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new ApiError('cancelled', 'Upload cancelled'));
    });
  });

function buildForm(req: MultipartRequest): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(req.fields)) {
    if (value !== undefined) form.append(key, String(value));
  }
  // React Native FormData file part.
  form.append('file', { uri: req.file.uri, name: req.file.name, type: req.file.type } as unknown as Blob);
  return form;
}

function attempt<T>(req: MultipartRequest, opts: UploadCallOptions, xhrFactory: XhrFactory): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new ApiError('cancelled', 'Upload cancelled'));
      return;
    }
    const xhr = xhrFactory();
    const onAbortSignal = () => xhr.abort();
    opts.signal?.addEventListener('abort', onAbortSignal);
    const done = () => opts.signal?.removeEventListener('abort', onAbortSignal);

    xhr.open('POST', req.url);
    xhr.timeout = opts.timeoutMs ?? UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader('Accept', 'application/json');
    for (const [name, value] of Object.entries(req.headers ?? {})) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (ev) => {
      opts.onProgress?.({
        loaded: ev.loaded,
        total: ev.total,
        fraction: ev.lengthComputable && ev.total > 0 ? Math.min(ev.loaded / ev.total, 1) : null,
      });
    };
    xhr.onload = () => {
      done();
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        if (xhr.status < 200 || xhr.status >= 300) reject(new ApiError('http', `HTTP ${xhr.status}`, xhr.status));
        else reject(new ApiError('parse', 'Response is not valid JSON', xhr.status));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
      else reject(httpError(xhr.status, body));
    };
    xhr.onerror = () => {
      done();
      reject(new ApiError('network', 'Network request failed'));
    };
    xhr.ontimeout = () => {
      done();
      reject(new ApiError('timeout', `No response within ${xhr.timeout} ms`));
    };
    xhr.onabort = () => {
      done();
      reject(new ApiError('cancelled', 'Upload cancelled'));
    };
    xhr.send(buildForm(req));
  });
}

/** POST multipart with progress; retries network/timeout failures (never 4xx/5xx answers). */
export async function uploadMultipart<T>(
  req: MultipartRequest,
  opts: UploadCallOptions = {},
  xhrFactory: XhrFactory = defaultXhr,
): Promise<T> {
  const delays = opts.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  for (let i = 0; ; i++) {
    try {
      return await attempt<T>(req, opts, xhrFactory);
    } catch (err) {
      if (!isRetryable(err) || i >= delays.length) throw err;
      opts.onRetry?.(i + 2, err as ApiError);
      await sleep(delays[i], opts.signal);
    }
  }
}
