import { isV2AnalyzeResponse, isV2Catalog, isV2Item } from '../src/api/v2Responses';
import { attemptFromV2Response, newProfile, parseAttempt } from '../src/user/pure';
import { syncPending } from '../src/data/sync';
import type { V2AnalyzeResponse } from '../src/api/types';

const result: V2AnalyzeResponse = {
  status: 'evaluated', item_id: 'l1_e', level: 1, result: 'mendekati', lip_result: 'mendekati',
  voice_result: 'sesuai', feedback: { code: 'PRONUNCIATION_NOT_MATCHED', message: 'Ikuti contoh E.' },
  quality_flags: [], visuals: null, engine: 'mediapipe_parselmouth_wav2vec2', processing_ms: 123,
};
const item = { id: 'l1_e', text: 'E', instruction: 'Ucapkan E.', videos: [], level: 1, automatic_evaluation: true };
it('accepts the actual v2 material/evaluation contract and rejects malformed or misleading results', () => {
  expect(isV2Catalog({ level_1: [item], words: [] })).toBe(true);
  expect(isV2Catalog({ level_1: [item, item], words: [] })).toBe(false);
  expect(isV2Item(item)).toBe(true);
  expect(isV2Item({ ...item, level: '1' })).toBe(false);
  expect(isV2AnalyzeResponse(result)).toBe(true);
  expect(isV2AnalyzeResponse({ ...result, status: 'retry' })).toBe(false);
  expect(isV2AnalyzeResponse({ ...result, voice_result: null })).toBe(false);
  expect(isV2AnalyzeResponse({ ...result, visuals: { loudness: { t_ms: [0], db: [] } } })).toBe(false);
});
it('preserves nullable v2 metadata through local persistence without inventing a score or version', () => {
  const attempt = attemptFromV2Response(result, 'session-1')!;
  expect(attempt).toMatchObject({ level: 1, overall: 'kuning', score: null, engineVersion: null, scorer: result.engine });
  expect(parseAttempt(JSON.parse(JSON.stringify(attempt)))).toEqual(attempt);
  const retry = { ...result, status: 'retry' as const, result: null, lip_result: null, voice_result: null };
  expect(attemptFromV2Response(retry, 'session-1')).toBeNull();
});
it('sends v2 attempts through the existing queue without deriving legacy graduation rules', async () => {
  const profile = newProfile('11111111-1111-4111-8111-111111111111');
  profile.attempts = Array.from({ length: 10 }, (_, index) =>
    attemptFromV2Response({ ...result, result: 'sesuai', lip_result: 'sesuai' }, 'session-' + (index % 2))!);
  const remote = { ensureUser: jest.fn().mockResolvedValue(profile.userId), upsert: jest.fn().mockResolvedValue(undefined) };
  const synced = await syncPending(profile, [], remote);
  expect(synced.attemptIds).toHaveLength(10);
  expect(remote.upsert).toHaveBeenCalledWith('attempts', expect.arrayContaining([
    expect.objectContaining({ item_id: 'l1_e', level: 1, status: 'ok', overall: 'hijau', score: null, engine_version: null }),
  ]));
  expect(remote.upsert.mock.calls.some(([table]) => table === 'progress')).toBe(false);
});
