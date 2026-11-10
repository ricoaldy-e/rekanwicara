import { render, screen } from '@testing-library/react-native';

import type { AnalyzeResponse, Status, UnitResult, Visuals } from '../src/api/types';
import { DISCLAIMER, ResultView } from '../src/results/ResultView';

// Shaped like the server's mock responses (server/app/api/mock.py), SPEC §5.
const ANCHORS = {
  a: { f1: 780, f2: 1350 },
  i: { f1: 320, f2: 2300 },
  u: { f1: 350, f2: 900 },
};
const RING: [number, number][] = Array.from({ length: 20 }, (_, k) => [
  0.5 + 0.45 * Math.cos((2 * Math.PI * k) / 20),
  0.5 + 0.3 * Math.sin((2 * Math.PI * k) / 20),
]);

function unit(index: number, target: string, bibir: Status | null, suara: Status, reason: UnitResult['reason_code']): UnitResult {
  const status = [bibir, suara].filter((s): s is Status => s !== null).sort().includes('merah')
    ? 'merah'
    : [bibir, suara].includes('kuning')
      ? 'kuning'
      : 'hijau';
  return { index, target, start_ms: 120 + index * 400, end_ms: 520 + index * 400, bibir, suara, status, reason_code: reason };
}

function ok(over: Omit<Partial<AnalyzeResponse>, 'visuals'> & { visuals?: Partial<Visuals> }): AnalyzeResponse {
  const { visuals, ...rest } = over;
  return {
    status: 'ok',
    quality_flags: [],
    item_id: 'l3_mama',
    level: 3,
    overall: 'hijau',
    score: 1,
    indicators: { bibir: 'hijau', suara: 'hijau' },
    units: [unit(0, 'ma', 'hijau', 'hijau', null), unit(1, 'ma', 'hijau', 'hijau', null)],
    hint_id: 'ok_good',
    visuals: {
      vowel_point: { f1: 760, f2: 1330 },
      vowel_anchors: ANCHORS,
      lip_contour: { points: RING },
      loudness: null,
      ...visuals,
    },
    scorer: 'rules',
    engine_version: '0.1.0',
    processing_ms: 800,
    ...rest,
  };
}

const HIJAU = ok({});
const KUNING = ok({
  overall: 'kuning',
  score: 0.5,
  indicators: { bibir: 'hijau', suara: 'kuning' },
  units: [unit(0, 'ma', 'hijau', 'hijau', null), unit(1, 'ma', 'hijau', 'kuning', 'closure_voicing_expected')],
  hint_id: 'm_voicing',
});
const MERAH = ok({
  overall: 'merah',
  score: 0.5,
  indicators: { bibir: 'hijau', suara: 'merah' },
  units: [unit(0, 'ma', 'hijau', 'hijau', null), unit(1, 'ma', 'hijau', 'merah', 'closure_voicing_expected')],
  hint_id: 'm_voicing',
});
const RETRY = ok({
  status: 'retry',
  quality_flags: ['too_quiet'],
  overall: null,
  score: null,
  indicators: null,
  units: null,
  hint_id: 'retry_quiet',
  visuals: { vowel_point: null, vowel_anchors: null, lip_contour: null, loudness: null },
});
const LEVEL0 = ok({
  item_id: 'l0_hold_a',
  level: 0,
  indicators: { bibir: null, suara: 'hijau' },
  units: [unit(0, 'a', null, 'hijau', null)],
  visuals: {
    vowel_point: null,
    vowel_anchors: null,
    lip_contour: null,
    loudness: {
      t_ms: Array.from({ length: 300 }, (_, k) => k * 10),
      db: Array.from({ length: 300 }, (_, k) => 40 + 20 * Math.sin(k / 30)),
    },
  },
});

describe('ResultView', () => {
  it.each([
    ['hijau', HIJAU, 'Bibir: Sesuai', 'Suara: Sesuai', 'Bagus! Coba sekali lagi tanpa melihat layar.'],
    [
      'kuning',
      KUNING,
      'Bibir: Sesuai',
      'Suara: Mendekati',
      'Saat bibir rapat, biarkan suara keluar lewat hidung. Rasakan getaran di hidung.',
    ],
    [
      'merah',
      MERAH,
      'Bibir: Sesuai',
      'Suara: Belum sesuai',
      'Saat bibir rapat, biarkan suara keluar lewat hidung. Rasakan getaran di hidung.',
    ],
  ])('%s shows both indicators with text, the hint and the disclaimer', async (_name, result, bibir, suara, hint) => {
    await render(<ResultView result={result} />);
    expect(screen.getByTestId('result-bibir')).toHaveAccessibleName(bibir);
    expect(screen.getByTestId('result-suara')).toHaveAccessibleName(suara);
    expect(screen.getByText(bibir)).toBeTruthy(); // status is text too, not colour alone
    expect(screen.getByTestId('result-hint')).toHaveTextContent(hint);
    expect(screen.getByTestId('result-disclaimer')).toHaveTextContent(DISCLAIMER);
    expect(screen.getByTestId('vowel-map')).toBeTruthy();
    expect(screen.getByTestId('lip-mirror')).toBeTruthy();
    expect(screen.queryByTestId('loudness-chart')).toBeNull();
  });

  it('shows the uncalibrated note only when the server says so', async () => {
    await render(<ResultView result={ok({ quality_flags: ['uncalibrated'] })} />);
    expect(screen.getByTestId('result-uncalibrated')).toBeTruthy();
  });

  it('does not show the uncalibrated note after calibration', async () => {
    await render(<ResultView result={HIJAU} />);
    expect(screen.queryByTestId('result-uncalibrated')).toBeNull();
  });

  it('retry shows the retry sentence and no indicators or charts', async () => {
    await render(<ResultView result={RETRY} />);
    expect(screen.getByTestId('result-hint')).toHaveAccessibleName('Suara belum terdeteksi. Coba bersuara lebih jelas.');
    expect(screen.queryByTestId('result-bibir')).toBeNull();
    expect(screen.queryByTestId('result-suara')).toBeNull();
    expect(screen.queryByTestId('vowel-map')).toBeNull();
    expect(screen.queryByTestId('lip-mirror')).toBeNull();
    expect(screen.getByTestId('result-disclaimer')).toBeTruthy();
  });

  it('Level 0 shows only the Suara indicator and the loudness chart', async () => {
    await render(<ResultView result={LEVEL0} />);
    expect(screen.queryByTestId('result-bibir')).toBeNull();
    expect(screen.getByTestId('result-suara')).toBeTruthy();
    expect(screen.getByTestId('loudness-chart')).toBeTruthy();
    expect(screen.queryByTestId('vowel-map')).toBeNull();
    expect(screen.queryByTestId('lip-mirror')).toBeNull();
  });

  it('skips the vowel map when an anchor is missing and the mirror for the "mmm" hum', async () => {
    const hum = ok({
      units: [unit(0, 'm_hum', 'hijau', 'hijau', null)],
      visuals: { vowel_anchors: { a: null, i: null, u: null } },
    });
    await render(<ResultView result={hum} />);
    expect(screen.queryByTestId('vowel-map')).toBeNull();
    expect(screen.queryByTestId('lip-mirror')).toBeNull();
  });

  it('never uses clinical wording', async () => {
    await render(<ResultView result={MERAH} />);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(normal|abnormal|gangguan|diagnosis)\b/i);
  });

  it('gives each chart a text alternative', async () => {
    await render(<ResultView result={HIJAU} />);
    expect(screen.getByTestId('vowel-map')).toHaveAccessibleName(/paling dekat dengan bunyi a/);
    expect(screen.getByTestId('lip-mirror')).toHaveAccessibleName(/Garis putus-putus/);
  });
});
