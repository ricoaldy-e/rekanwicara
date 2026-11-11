import type { AnalyzeResponse, QualityFlag } from '../src/api/types';
import { retryHint } from '../src/content/hints';
import { lipRing, lipPolygon, RING_POINTS, targetShape, unitShapes } from '../src/results/lipShapes';
import { downsample, loudnessXY, nearestAnchor, vowelMapXY } from '../src/results/scale';
import {
  addAttempt,
  attemptFromResponse,
  isValidPin,
  makeId,
  MAX_ATTEMPTS,
  newProfile,
  parseProfile,
} from '../src/user/pure';

describe('user ids and PIN', () => {
  it('makeId fits the server pattern (letters, digits, _ and -, max 64)', () => {
    for (const id of [makeId('u'), makeId('s')]) expect(id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(makeId('u')).not.toBe(makeId('u'));
  });

  it('accepts exactly four digits', () => {
    expect(isValidPin('1234')).toBe(true);
    for (const bad of ['', '123', '12345', 'abcd', '12 4', '12.4']) expect(isValidPin(bad)).toBe(false);
  });
});

const RESPONSE: AnalyzeResponse = {
  status: 'ok',
  quality_flags: [],
  item_id: 'l3_mama',
  level: 3,
  overall: 'kuning',
  score: 0.5,
  indicators: { bibir: 'hijau', suara: 'kuning' },
  units: [],
  hint_id: 'm_voicing',
  visuals: { vowel_point: null, vowel_anchors: null, lip_contour: null, loudness: null },
  scorer: 'rules',
  engine_version: '0.1.0',
  processing_ms: 800,
};

describe('attempts', () => {
  it('an analysis result becomes an unsynced attempt with its own uuid, session and time', () => {
    const now = new Date('2026-11-11T08:00:00Z');
    const a = attemptFromResponse(RESPONSE, 's_abc', now)!;
    expect(a).toMatchObject({
      itemId: 'l3_mama', level: 3, sessionId: 's_abc', at: now.toISOString(), overall: 'kuning',
      score: 0.5, hintId: 'm_voicing', synced: false,
    }); // fmt: skip
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(attemptFromResponse(RESPONSE, 's_abc', now)!.id).not.toBe(a.id);
  });

  it('a retry result is not an attempt', () => {
    const retry: AnalyzeResponse = { ...RESPONSE, status: 'retry', overall: null, score: null, indicators: null, units: null };
    expect(attemptFromResponse(retry, 's')).toBeNull();
  });

  it('keeps the newest MAX_ATTEMPTS and does not mutate the profile', () => {
    const first = attemptFromResponse(RESPONSE, 's')!;
    let p = newProfile();
    const before = p;
    p = addAttempt(p, first);
    expect(before.attempts).toEqual([]);
    for (let k = 0; k < MAX_ATTEMPTS; k++) p = addAttempt(p, { ...first, id: `x${k}` });
    expect(p.attempts).toHaveLength(MAX_ATTEMPTS);
    expect(p.attempts.some((a) => a.id === first.id)).toBe(false); // the oldest was dropped
  });
});

describe('stored profile', () => {
  it('falls back to a fresh profile for missing, corrupt or unsafe data', () => {
    for (const raw of [null, '', 'not json', '{"userId":"../etc"}', '{"userId":123}']) {
      const p = parseProfile(raw);
      expect(p.onboarded).toBe(false);
      expect(p.userId).toMatch(/^u_/);
    }
  });

  it('keeps onboarding, consent and calibration flags', () => {
    const p = { ...newProfile(), onboarded: true, consentUser: true, consentCompanion: true, calibrated: true };
    expect(parseProfile(JSON.stringify(p))).toEqual(p);
  });
});

describe('retry hints', () => {
  it('maps the first flag in SPEC §6.2 order to its sentence', () => {
    expect(retryHint(['too_short', 'no_face'])).toBe('Wajah belum terlihat. Posisikan wajah di dalam bingkai.');
    expect(retryHint(['too_noisy'])).toBe('Ruangan terlalu bising. Coba di tempat yang lebih tenang.');
  });

  it('is null when no flag needs a new recording', () => {
    expect(retryHint([])).toBeNull();
    expect(retryHint(['uncalibrated'] as QualityFlag[])).toBeNull();
  });
});

describe('lip shapes', () => {
  it('every ring has the server\'s 20 points inside the unit square', () => {
    for (const shape of ['relaxed', 'a', 'i', 'u', 'closed'] as const) {
      const ring = lipRing(shape);
      expect(ring).toHaveLength(RING_POINTS);
      for (const [x, y] of ring) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(1);
      }
    }
  });

  it('draws wider shapes wider: i is wider and flatter than u', () => {
    const extent = (pts: [number, number][], k: 0 | 1) => Math.max(...pts.map((p) => p[k])) - Math.min(...pts.map((p) => p[k]));
    const i = lipPolygon('i', 60, 40);
    const u = lipPolygon('u', 60, 40);
    expect(extent(i, 0)).toBeGreaterThan(extent(u, 0));
    expect(extent(i, 1)).toBeLessThan(extent(u, 1));
  });

  it('unitShapes shows closed lips first for a consonant; targetShape reads the last vowel', () => {
    expect(unitShapes('ma')).toEqual(['closed', 'a']);
    expect(unitShapes('i')).toEqual(['i']);
    expect(unitShapes('m_hum')).toEqual(['closed']);
    expect(targetShape(['ma', 'bi'])).toBe('i');
    expect(targetShape(['m_hum'])).toBeNull();
    expect(targetShape([])).toBeNull();
  });
});

describe('chart scales', () => {
  it('F2 runs right to left and F1 top to bottom', () => {
    const iVowel = vowelMapXY({ f1: 300, f2: 2400 });
    const uVowel = vowelMapXY({ f1: 350, f2: 900 });
    const aVowel = vowelMapXY({ f1: 800, f2: 1400 });
    expect(iVowel.x).toBeLessThan(uVowel.x); // high F2 on the left
    expect(aVowel.y).toBeGreaterThan(iVowel.y); // high F1 lower on the chart
  });

  it('clamps values outside the axis ranges', () => {
    expect(vowelMapXY({ f1: 5000, f2: -10 })).toEqual({ x: 1, y: 1 });
    expect(vowelMapXY({ f1: 0, f2: 9000 })).toEqual({ x: 0, y: 0 });
  });

  it('finds the nearest anchor and tolerates missing ones', () => {
    const anchors = { a: { f1: 780, f2: 1350 }, i: { f1: 320, f2: 2300 }, u: { f1: 350, f2: 900 } };
    expect(nearestAnchor({ f1: 760, f2: 1330 }, anchors)).toBe('a');
    expect(nearestAnchor({ f1: 330, f2: 2250 }, anchors)).toBe('i');
    expect(nearestAnchor({ f1: 760, f2: 1330 }, { a: null, i: null, u: null })).toBeNull();
  });

  it('downsample keeps the first and last value and the limit', () => {
    const values = Array.from({ length: 1000 }, (_, k) => k);
    const out = downsample(values, 150);
    expect(out).toHaveLength(150);
    expect(out[0]).toBe(0);
    expect(out[out.length - 1]).toBe(999);
    expect(downsample([1, 2, 3], 150)).toEqual([1, 2, 3]);
  });

  it('loudnessXY puts the loudest point on top and handles an empty or flat series', () => {
    const pts = loudnessXY([0, 10, 20], [40, 60, 50]);
    expect(pts[1].y).toBe(0);
    expect(pts[0].y).toBe(1);
    expect(loudnessXY([], [])).toEqual([]);
    expect(loudnessXY([0, 10], [50, 50]).every((p) => Number.isFinite(p.y))).toBe(true);
  });
});
