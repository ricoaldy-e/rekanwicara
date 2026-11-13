import type { AnalyzeResponse, Status } from '../src/api/types';
import { catalogToL1, clampStatus, fromStored, fromV1, toStored, wordToPath } from '../src/data/mappers';
import { MOCK_CATALOG, MOCK_WORDS } from '../src/mock';

const visuals = { vowel_point: { f1: 700, f2: 1300 }, vowel_anchors: null, lip_contour: null, loudness: null };

function v1(overall: Status, bibir: Status | null, suara: Status, extra: Partial<AnalyzeResponse> = {}): AnalyzeResponse {
  return {
    status: 'ok',
    quality_flags: [],
    item_id: 'l1_a',
    level: 1,
    overall,
    score: 0.5,
    indicators: { bibir, suara },
    units: [{ index: 0, target: 'a', start_ms: 0, end_ms: 500, bibir, suara, status: overall, reason_code: null }],
    hint_id: 'a_open',
    visuals,
    scorer: 'rules',
    engine_version: 'test-1',
    processing_ms: 12,
    ...extra,
  };
}

let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe('fromV1', () => {
  it('maps the three Level 1 statuses', () => {
    expect(fromV1(v1('hijau', 'hijau', 'hijau'), 1).result).toBe('sesuai');
    expect(fromV1(v1('kuning', 'kuning', 'hijau'), 1).result).toBe('mendekati');
    const r = fromV1(v1('merah', 'merah', 'kuning'), 1);
    expect([r.result, r.lip_result, r.voice_result]).toEqual(['belum_sesuai', 'belum_sesuai', 'mendekati']);
    expect(r.sample).toBe(false);
    expect(r.visuals).toEqual(visuals);
  });

  it.each([2, 3] as const)('turns mendekati into belum_sesuai and drops visuals at Level %i', (level) => {
    const r = fromV1(v1('kuning', 'kuning', 'kuning'), level);
    expect([r.result, r.lip_result, r.voice_result]).toEqual(['belum_sesuai', 'belum_sesuai', 'belum_sesuai']);
    expect(r.visuals).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('puts the single hint under the lips when they are off, else under the voice, none when both fit', () => {
    const lipOff = fromV1(v1('kuning', 'kuning', 'kuning'), 1);
    expect(lipOff.lip_feedback).toBe('Buka mulut lebih lebar.');
    expect(lipOff.voice_feedback).toBeNull();
    const voiceOff = fromV1(v1('merah', 'hijau', 'merah'), 1);
    expect([voiceOff.lip_feedback, voiceOff.voice_feedback]).toEqual([null, 'Buka mulut lebih lebar.']);
    const ok = fromV1(v1('hijau', 'hijau', 'hijau', { hint_id: 'ok_good' }), 1);
    expect([ok.lip_feedback, ok.voice_feedback]).toEqual([null, null]);
  });

  it('maps a retry with the hint text and no statuses', () => {
    const r = fromV1(
      v1('hijau', null, 'hijau', {
        status: 'retry',
        overall: null,
        indicators: null,
        units: null,
        score: null,
        quality_flags: ['no_face'],
        hint_id: 'retry_no_face',
      }),
      1,
    );
    expect(r.status).toBe('retry');
    expect(r.feedback).toEqual({ code: 'retry_no_face', message: 'Wajah belum terlihat. Posisikan wajah di dalam bingkai.' });
    expect([r.result, r.lip_result, r.voice_result, r.visuals]).toEqual([null, null, null, null]);
    expect(r.quality_flags).toEqual(['no_face']);
  });

  it('never carries units or recognized text', () => {
    const r = fromV1(v1('hijau', 'hijau', 'hijau'), 1);
    expect(r).not.toHaveProperty('units');
    expect(JSON.stringify(r)).not.toContain('"target"');
  });

  it('keeps a missing lip indicator (v1 Level 0) as null', () => {
    expect(fromV1(v1('hijau', null, 'hijau'), 1).lip_result).toBeNull();
  });
});

describe('clampStatus', () => {
  it('keeps mendekati only at Level 1', () => {
    expect(clampStatus(1, 'mendekati')).toBe('mendekati');
    expect(clampStatus(2, 'mendekati')).toBe('belum_sesuai');
    expect(clampStatus(3, 'sesuai')).toBe('sesuai');
    expect(clampStatus(3, null)).toBeNull();
  });
});

describe('catalog mappers', () => {
  it('shows l0_* items as Level 1 and takes videos[0]', () => {
    const items = catalogToL1(MOCK_CATALOG);
    expect(items.find((i) => i.itemId === 'l0_hold_a')?.level).toBe(1);
    expect(items.every((i) => i.level === 1 && i.video === undefined)).toBe(true);
  });

  it('gives the two PA steps different keys but the same itemId', () => {
    const path = wordToPath(MOCK_WORDS.l3_papa);
    expect(path.syllables.map((s) => s.key)).toEqual(['l2_pa#1', 'l2_pa#2']);
    expect(new Set(path.syllables.map((s) => s.itemId))).toEqual(new Set(['l2_pa']));
    expect(path.whole).toMatchObject({ key: 'l3_papa', level: 3, source: 'default' });
  });

  it('goes straight to Level 3 for a word without syllables', () => {
    const path = wordToPath(MOCK_WORDS['custom_word:22222222-2222-2222-2222-222222222222']);
    expect(path.syllables).toEqual([]);
    expect(path.word.hasLevel2).toBe(false);
    expect(path.whole.source).toBe('custom');
  });
});

describe('stored status', () => {
  it('round-trips both ways', () => {
    for (const s of ['sesuai', 'mendekati', 'belum_sesuai'] as const) expect(fromStored(toStored(s))).toBe(s);
    for (const s of ['hijau', 'kuning', 'merah'] as const) expect(toStored(fromStored(s))).toBe(s);
    expect(toStored('mendekati')).toBe('kuning');
  });
});
