import { render, screen, within } from '@testing-library/react-native';

import type { AnalyzeResponse, Status, Visuals } from '../src/api/types';
import { fromV1 } from '../src/data/mappers';
import type { AnalyzeResult, PracticeItem } from '../src/data/types';
import { DISCLAIMER, ResultView } from '../src/results/ResultView';

// Shaped like the server's /v1 mock responses (server/app/api/mock.py), then mapped like the app does.
const ANCHORS = { a: { f1: 780, f2: 1350 }, i: { f1: 320, f2: 2300 }, u: { f1: 350, f2: 900 } };
const RING: [number, number][] = Array.from({ length: 20 }, (_, k) => [
  0.5 + 0.45 * Math.cos((2 * Math.PI * k) / 20),
  0.5 + 0.3 * Math.sin((2 * Math.PI * k) / 20),
]);
const VISUALS: Visuals = { vowel_point: { f1: 760, f2: 1330 }, vowel_anchors: ANCHORS, lip_contour: { points: RING }, loudness: null };

const A: PracticeItem = { key: 'l1_a', itemId: 'l1_a', level: 1, text: 'A', instruction: '', source: 'default' };
const HOLD: PracticeItem = { key: 'l0_hold_a', itemId: 'l0_hold_a', level: 1, text: 'A panjang', instruction: '', source: 'default' };
const MA: PracticeItem = { key: 'l2_ma#1', itemId: 'l2_ma', level: 2, text: 'MA', instruction: '', source: 'default', position: 1 };

function v1(overall: Status, bibir: Status | null, suara: Status, extra: Partial<AnalyzeResponse> = {}): AnalyzeResponse {
  return {
    status: 'ok', quality_flags: [], item_id: 'l1_a', level: 1, overall, score: 1,
    indicators: { bibir, suara }, units: null, hint_id: 'a_open', visuals: VISUALS,
    scorer: 'rules', engine_version: '0.1.0', processing_ms: 800, ...extra,
  };
}

function v2(over: Partial<AnalyzeResult>): AnalyzeResult {
  return {
    status: 'evaluated', item_id: 'l2_ma', level: 2, result: 'sesuai', lip_result: 'sesuai', voice_result: 'sesuai',
    lip_feedback: null, voice_feedback: null, feedback: { code: 'ok', message: '' }, quality_flags: [],
    visuals: null, engine: 'test', processing_ms: 1, sample: false, ...over,
  };
}

const RETRY: AnalyzeResult = v2({
  status: 'retry', level: 1, result: null, lip_result: null, voice_result: null, quality_flags: ['too_quiet'],
  feedback: { code: 'retry_quiet', message: 'Suara belum terdeteksi. Coba bersuara lebih jelas.' },
});

let warn: jest.SpyInstance;
beforeEach(() => {
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => warn.mockRestore());

describe('ResultView Level 1', () => {
  it.each([
    ['hijau', 'Sesuai'],
    ['kuning', 'Mendekati'],
    ['merah', 'Belum sesuai'],
  ] as const)('%s shows the three-status badges with text, the charts and the disclaimer', async (status, label) => {
    await render(<ResultView result={fromV1(v1(status, status, status), 1)} item={A} />);
    expect(screen.getByTestId('result-bibir')).toHaveAccessibleName(`Bibir: ${label}`);
    expect(screen.getByTestId('result-suara')).toHaveAccessibleName(`Suara: ${label}`);
    // The card shows the indicator name and the status as text too, not colour alone (Figma 48:166).
    expect(within(screen.getByTestId('result-bibir')).getByText('Bibir')).toBeTruthy();
    expect(within(screen.getByTestId('result-bibir')).getByText(label)).toBeTruthy();
    expect(screen.getByTestId('vowel-map')).toBeTruthy();
    expect(screen.getByTestId('lip-mirror')).toBeTruthy();
    expect(screen.getByTestId('result-disclaimer')).toHaveTextContent(DISCLAIMER);
  });

  it('gives each chart a text alternative', async () => {
    await render(<ResultView result={fromV1(v1('hijau', 'hijau', 'hijau'), 1)} item={A} />);
    expect(screen.getByTestId('vowel-map')).toHaveAccessibleName(/paling dekat dengan bunyi a/);
    expect(screen.getByTestId('lip-mirror')).toHaveAccessibleName(/Garis putus-putus/);
  });

  it('a held sound shows only Suara and the loudness chart', async () => {
    const loud = { t_ms: Array.from({ length: 300 }, (_, k) => k * 10), db: Array.from({ length: 300 }, (_, k) => 40 + 20 * Math.sin(k / 30)) };
    const res = v1('hijau', null, 'hijau', { item_id: 'l0_hold_a', level: 0, visuals: { vowel_point: null, vowel_anchors: null, lip_contour: null, loudness: loud } });
    await render(<ResultView result={fromV1(res, 1)} item={HOLD} />);
    expect(screen.queryByTestId('result-bibir')).toBeNull();
    expect(screen.getByTestId('result-suara')).toBeTruthy();
    expect(screen.getByTestId('loudness-chart')).toBeTruthy();
    expect(screen.queryByTestId('vowel-map')).toBeNull();
    expect(screen.queryByTestId('lip-mirror')).toBeNull();
  });

  it('shows the uncalibrated note only when the server says so', async () => {
    await render(<ResultView result={fromV1(v1('hijau', 'hijau', 'hijau', { quality_flags: ['uncalibrated'] }), 1)} item={A} />);
    expect(screen.getByTestId('result-uncalibrated')).toBeTruthy();
  });
});

describe('ResultView Level 2–3', () => {
  it('shows two statuses and no chart, even when visuals arrive', async () => {
    await render(<ResultView result={v2({ result: 'belum_sesuai', voice_result: 'belum_sesuai', visuals: VISUALS })} item={MA} />);
    expect(screen.getByTestId('result-bibir')).toHaveAccessibleName('Bibir: Sesuai');
    expect(screen.getByTestId('result-suara')).toHaveAccessibleName('Suara: Belum sesuai');
    for (const id of ['vowel-map', 'lip-mirror', 'loudness-chart']) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.getByTestId('result-target')).toHaveTextContent(/Suku kata target.*ma/);
  });

  it('never shows Mendekati at Level 2, even from a v1 kuning', async () => {
    await render(<ResultView result={fromV1(v1('kuning', 'kuning', 'kuning', { item_id: 'l2_ma', level: 2 }), 2)} item={MA} />);
    expect(screen.queryByText(/Mendekati/)).toBeNull();
    expect(screen.getByTestId('result-bibir')).toHaveAccessibleName('Bibir: Belum sesuai');
  });
});

describe('ResultView feedback', () => {
  it('shows at most two sentences, Bibir first', async () => {
    await render(<ResultView result={v2({ lip_result: 'belum_sesuai', voice_result: 'belum_sesuai', lip_feedback: 'Rapatkan bibir.', voice_feedback: 'Ucapkan lebih keras.' })} item={MA} />);
    const card = screen.getByTestId('result-hint');
    expect(card).toHaveTextContent(/Rapatkan bibir\..*Ucapkan lebih keras\./);
  });

  it('renders no feedback card when both indicators fit', async () => {
    await render(<ResultView result={v2({})} item={MA} />);
    expect(screen.queryByTestId('result-hint')).toBeNull();
  });

  it('a retry shows its reason and no badge or chart', async () => {
    await render(<ResultView result={RETRY} item={A} />);
    expect(screen.getByTestId('result-retry')).toBeTruthy();
    expect(screen.getByTestId('result-retry-reason')).toHaveAccessibleName('Suara belum terdeteksi. Coba bersuara lebih jelas.');
    expect(screen.getByText('Rekaman ini tidak dihitung sebagai percobaan.')).toBeTruthy();
    for (const id of ['result-bibir', 'result-suara', 'vowel-map', 'lip-mirror']) expect(screen.queryByTestId(id)).toBeNull();
    expect(screen.getByTestId('result-disclaimer')).toBeTruthy();
  });

  it('labels a mock sample', async () => {
    await render(<ResultView result={v2({ sample: true })} item={MA} />);
    expect(screen.getByTestId('result-sample')).toHaveAccessibleName('Hasil contoh, bukan analisis rekaman.');
  });

  it('never uses clinical wording', async () => {
    await render(<ResultView result={fromV1(v1('merah', 'merah', 'merah'), 1)} item={A} />);
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/\b(normal|abnormal|gangguan|diagnosis|terapi)\b/i);
  });
});

describe('ResultView Kekerasan suara (only from response data)', () => {
  const loud = { t_ms: Array.from({ length: 50 }, (_, k) => k * 10), db: Array.from({ length: 50 }, (_, k) => 40 + k / 5) };

  it('is not rendered at Level 1 when the response has no loudness data', async () => {
    await render(<ResultView result={fromV1(v1('hijau', 'hijau', 'hijau'), 1)} item={A} />);
    expect(screen.queryByText('Kekerasan suara')).toBeNull();
    expect(screen.queryByTestId('loudness-chart')).toBeNull();
  });

  it('is rendered, without a target bar, when the response carries loudness', async () => {
    const res = v1('hijau', 'hijau', 'hijau', { visuals: { ...VISUALS, loudness: loud } });
    await render(<ResultView result={fromV1(res, 1)} item={A} />);
    expect(screen.getByText('Kekerasan suara')).toBeTruthy();
    expect(screen.getByTestId('loudness-chart')).toBeTruthy();
    expect(screen.queryByText(/zona target/)).toBeNull();
  });

  it('is never rendered at Level 2–3 even if loudness arrives', async () => {
    await render(<ResultView result={v2({ visuals: { ...VISUALS, loudness: loud } })} item={MA} />);
    expect(screen.queryByTestId('loudness-chart')).toBeNull();
  });
});

describe('ResultView layout', () => {
  it('shows the Level 1 target as a lip drawing with "Bentuk bibir target" and the vowel name', async () => {
    await render(<ResultView result={fromV1(v1('hijau', 'hijau', 'hijau'), 1)} item={A} />);
    expect(screen.getByTestId('result-target')).toHaveTextContent(/Bentuk bibir target.*Vokal “a”/);
  });

  it('uses the word card with "Kata target" at Level 3', async () => {
    const mama: PracticeItem = { key: 'l3_mama', itemId: 'l3_mama', level: 3, text: 'MAMA', instruction: '', source: 'default' };
    await render(<ResultView result={v2({ level: 3, item_id: 'l3_mama' })} item={mama} />);
    expect(screen.getByTestId('result-target')).toHaveTextContent(/Kata target.*mama/);
  });
});
