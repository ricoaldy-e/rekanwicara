import {
  COUNTDOWN_FROM,
  initialRecorderState,
  recorderReducer,
  safetyMaxDurationS,
  type RecorderAction,
  type RecorderState,
} from '../src/recording/recorder';

const run = (actions: RecorderAction[], from: RecorderState = initialRecorderState) =>
  actions.reduce(recorderReducer, from);

describe('recorderReducer', () => {
  it('counts down 3-2-1 and then records', () => {
    let s = run([{ type: 'start' }]);
    expect(s).toMatchObject({ phase: 'countdown', count: COUNTDOWN_FROM });
    s = run([{ type: 'tick' }], s);
    expect(s.count).toBe(2);
    s = run([{ type: 'tick' }], s);
    expect(s.count).toBe(1);
    s = run([{ type: 'tick' }], s);
    expect(s).toMatchObject({ phase: 'recording', count: 0 });
  });

  it('tracks progress only while recording, then stops and finishes', () => {
    let s = run([{ type: 'progress', elapsedMs: 500 }]);
    expect(s.elapsedMs).toBe(0);
    s = run([{ type: 'start' }, { type: 'tick' }, { type: 'tick' }, { type: 'tick' }, { type: 'progress', elapsedMs: 1200 }]);
    expect(s.elapsedMs).toBe(1200);
    s = run([{ type: 'stop' }], s);
    expect(s.phase).toBe('finishing');
    s = run([{ type: 'finished' }], s);
    expect(s).toEqual(initialRecorderState);
  });

  it('ignores start while busy and allows it again after an error', () => {
    const counting = run([{ type: 'start' }, { type: 'tick' }]);
    expect(run([{ type: 'start' }], counting)).toBe(counting);
    const failed = run([{ type: 'failed', message: 'Perekaman gagal.' }], counting);
    expect(failed).toMatchObject({ phase: 'error', error: 'Perekaman gagal.' });
    expect(run([{ type: 'start' }], failed)).toMatchObject({ phase: 'countdown', error: null });
  });

  it('ignores stray ticks and stops outside their phase', () => {
    expect(run([{ type: 'tick' }])).toEqual(initialRecorderState);
    expect(run([{ type: 'stop' }])).toEqual(initialRecorderState);
  });
});

describe('safetyMaxDurationS', () => {
  it('rounds up to whole seconds plus one (Android maxDuration is an Int)', () => {
    expect(safetyMaxDurationS(2500)).toBe(4);
    expect(safetyMaxDurationS(4000)).toBe(5);
  });
});
