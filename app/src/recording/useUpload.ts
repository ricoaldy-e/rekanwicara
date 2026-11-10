import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '../api/apiError';
import type { UploadCallOptions } from '../api/upload';

export type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fraction: number | null; attempt: number }
  | { status: 'done' }
  | { status: 'error'; error: unknown };

type Runner<T> = (opts: UploadCallOptions) => Promise<T>;

/** Tracks one upload at a time (progress, automatic retries, error) and cancels it on unmount. */
export function useUpload() {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async <T,>(runner: Runner<T>): Promise<T | null> => {
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState({ status: 'uploading', fraction: 0, attempt: 1 });
    try {
      const result = await runner({
        signal: ctrl.signal,
        onProgress: (p) => setState((s) => (s.status === 'uploading' ? { ...s, fraction: p.fraction } : s)),
        onRetry: (attempt) => setState({ status: 'uploading', fraction: 0, attempt }),
      });
      if (!ctrl.signal.aborted) setState({ status: 'done' });
      return result;
    } catch (error) {
      if (!(error instanceof ApiError && error.kind === 'cancelled')) setState({ status: 'error', error });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    controller.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { state, run, reset };
}
