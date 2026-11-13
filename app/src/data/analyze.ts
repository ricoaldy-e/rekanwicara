/** Analysis of one recording as a v2 result, from /v1 (+ fromV1), /v2, or mock (EXPO_PUBLIC_ANALYZE_API). */
import type { ApiClient } from '../api/client';
import type { UploadFile } from '../api/types';
import type { UploadCallOptions } from '../api/upload';
import { createV2Client, type GetToken } from '../api/v2';
import { ANALYZE_API, type AnalyzeApi } from '../config';
import { mockAnalyzeResponse } from '../mock';
import { cleanV2, fromV1 } from './mappers';
import type { AnalyzeResult, PracticeItem } from './types';

/** /v1/analyze knows only the ids in server/app/content/items.json, so it cannot score custom words (K10). */
export class NotSupportedError extends Error {
  readonly code = 'NOT_SUPPORTED_V1';
  constructor() {
    super('Custom materials cannot be analyzed by /v1');
    this.name = 'NotSupportedError';
  }
}

export interface AnalyzeInput {
  file: UploadFile;
  item: PracticeItem;
  sessionId: string;
  userId: string;
}

export interface AnalyzeOptions extends UploadCallOptions {
  /** The v1 client the app already uses (also gives the base URL for v2). */
  api: ApiClient;
  getToken?: GetToken;
  /** Defaults to ANALYZE_API; tests pass it explicitly. */
  source?: AnalyzeApi;
}

let mockTurn = 0;

export async function analyze(input: AnalyzeInput, opts: AnalyzeOptions): Promise<AnalyzeResult> {
  const { api, getToken, source = ANALYZE_API, ...callOpts } = opts;
  const { file, item, sessionId, userId } = input;
  if (source === 'mock') {
    return cleanV2({ ...mockAnalyzeResponse(item.itemId, item.level, mockTurn++), sample: true });
  }
  if (source === 'v2') {
    const res = await createV2Client({ baseUrl: api.baseUrl, getToken }).analyze(
      { file, item_id: item.itemId, session_id: sessionId },
      callOpts,
    );
    return cleanV2({ ...res, sample: false });
  }
  if (item.source === 'custom') throw new NotSupportedError();
  const res = await api.analyze({ file, user_id: userId, item_id: item.itemId, session_id: sessionId }, callOpts);
  return fromV1(res, item.level);
}
