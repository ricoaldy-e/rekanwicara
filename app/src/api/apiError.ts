import type { ErrorResponse } from './types';

/**
 * - network: the server could not be reached (wrong URL, different Wi-Fi, server off).
 * - timeout: no response within the timeout.
 * - http: the server answered with a non-2xx status (`code` comes from the server body when present).
 * - parse: the server answered 2xx but the body was not valid JSON.
 * - cancelled: the caller aborted the request (e.g. left the screen).
 */
export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse' | 'cancelled';

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

export function isErrorResponse(body: unknown): body is ErrorResponse {
  if (typeof body !== 'object' || body === null || !('detail' in body)) return false;
  const detail = (body as { detail: unknown }).detail;
  return typeof detail === 'object' && detail !== null && typeof (detail as { code?: unknown }).code === 'string';
}

/** Builds the ApiError for a non-2xx response from its (already parsed, possibly invalid) body. */
export function httpError(status: number, body: unknown): ApiError {
  if (isErrorResponse(body)) return new ApiError('http', body.detail.message, status, body.detail.code);
  return new ApiError('http', `HTTP ${status}`, status);
}

/** Errors worth retrying automatically: the request may not have reached the server. */
export function isRetryable(err: unknown): boolean {
  return err instanceof ApiError && (err.kind === 'network' || err.kind === 'timeout');
}
