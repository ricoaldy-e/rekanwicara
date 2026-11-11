import type { Item, Status } from '../src/api/types';
import {
  buildProgress,
  feedbackDetail,
  isStuck,
  meetsPassRule,
  passedAt,
  patternOf,
  planSession,
  reviewState,
  seededRng,
  sessionSlots,
  type AttemptRecord,
  type ListenRecord,
  type Rules,
} from '../src/state/progression';
import { CONSULT_ADVICE, reportText, weeklySummary } from '../src/user/report';

const DAY = 86_400_000;
const T0 = Date.parse('2026-11-01T08:00:00Z');
const at = (days: number, minutes = 0) => new Date(T0 + days * DAY + minutes * 60_000).toISOString();

/** Attempts of one item: statuses in order, `perSession` per session, one session per day. */
function run(itemId: string, statuses: string, perSession = 5, startDay = 0): AttemptRecord[] {
  const map: Record<string, Status> = { g: 'hijau', y: 'kuning', r: 'merah' };
  return [...statuses].map((s, k) => ({
    itemId,
    sessionId: `s${startDay + Math.floor(k / perSession)}`,
    at: at(startDay + Math.floor(k / perSession), k % perSession),
    overall: map[s],
  }));
}

const item = (item_id: string, level: number): Item => ({
  item_id,
  level,
  text: item_id.slice(3),
  units: ['a'],
  priority: 'required',
  emoji: null,
  active: true,
});
const ITEMS = [item('l0_hold_a', 0), item('l1_a', 1), item('l1_i', 1), item('l2_ma', 2), item('l3_mama', 3)];
const RULES: Rules = { listenCheckRequired: false, unlockAll: false };
const NOW = new Date(at(40));

describe('pass rule: 8 of the last 10 green, across at least 2 sessions', () => {
  it('passes with 8/10 green in 2 sessions', () => {
    expect(meetsPassRule(run('l1_a', 'gggggrgggy', 5))).toBe(true);
  });

  it('does not pass with 7/10', () => {
    expect(meetsPassRule(run('l1_a', 'gggrrgggyg', 5))).toBe(false);
  });

  it('does not pass inside a single session, however good', () => {
    expect(meetsPassRule(run('l1_a', 'gggggggggg', 10))).toBe(false);
  });

  it('needs ten attempts: nine green attempts are not enough', () => {
    expect(meetsPassRule(run('l1_a', 'ggggggggg', 5))).toBe(false);
  });

  it('looks only at the last ten attempts: old failures fade out of the window', () => {
    const old = run('l1_a', 'rrrrrrrrrr', 5, 0);
    const seven = run('l1_a', 'ggggggg', 5, 2); // window = 3 old reds + 7 green: 7/10
    const eight = run('l1_a', 'gggggggg', 5, 2); // window = 2 old reds + 8 green: 8/10
    expect(passedAt([...old, ...seven], [], false)).toBeNull();
    expect(passedAt([...old, ...eight], [], false)).toBe(eight[7].at);
  });

  it('records when it was first passed, not the latest attempt', () => {
    const attempts = [...run('l1_a', 'gggggggggg', 5), ...run('l1_a', 'rrrrr', 5, 3)];
    expect(passedAt(attempts, [], false)).toBe(attempts[9].at);
  });

  it('Level 3 also needs one "jelas" listen check when the companion requires it', () => {
    const attempts = run('l3_mama', 'gggggggggg', 5);
    const unclear: ListenRecord = { itemId: 'l3_mama', result: 'belum_jelas', at: at(3) };
    const clear: ListenRecord = { itemId: 'l3_mama', result: 'jelas', at: at(5) };
    expect(passedAt(attempts, [], true)).toBeNull();
    expect(passedAt(attempts, [unclear], true)).toBeNull();
    expect(passedAt(attempts, [clear], true)).toBe(clear.at); // passed when the second condition came true
    expect(passedAt(attempts, [], false)).toBe(attempts[9].at);
  });
});

describe('review schedule: day 1, 3, 7 and 14 after passing', () => {
  const passed = at(2);

  it('is first due one day after passing', () => {
    expect(reviewState([], passed)).toEqual({ done: 0, dueAt: at(3) });
  });

  it('a green attempt before the due time does not count; a red one after it does not either', () => {
    const early: AttemptRecord = { itemId: 'x', sessionId: 's', at: at(2, 30), overall: 'hijau' };
    const red: AttemptRecord = { itemId: 'x', sessionId: 's', at: at(3, 5), overall: 'merah' };
    expect(reviewState([early, red], passed).done).toBe(0);
  });

  it('walks through 1, 3, 7, 14 and then has nothing left to review', () => {
    const green = (day: number): AttemptRecord => ({ itemId: 'x', sessionId: `r${day}`, at: at(day), overall: 'hijau' });
    expect(reviewState([green(3)], passed)).toEqual({ done: 1, dueAt: at(5) }); // 3 days after passing
    expect(reviewState([green(3), green(5)], passed)).toEqual({ done: 2, dueAt: at(9) }); // 7 days
    expect(reviewState([green(3), green(5), green(9)], passed)).toEqual({ done: 3, dueAt: at(16) }); // 14 days
    expect(reviewState([green(3), green(5), green(9), green(16)], passed)).toEqual({ done: 4, dueAt: null });
  });

  it('a late review does not let the next ones follow at once', () => {
    const green = (minutes: number): AttemptRecord => ({ itemId: 'x', sessionId: 's', at: at(30, minutes), overall: 'hijau' });
    const state = reviewState([green(0), green(5), green(10)], passed); // three green attempts on day 30
    expect(state.done).toBe(1);
    expect(state.dueAt).toBe(at(31)); // at least a day after the review that was just done
  });
});

describe('stuck: under 40% green over the last 3 sessions', () => {
  it('is stuck at 2 of 9 green in three sessions', () => {
    expect(isStuck(run('l1_u', 'rrgrrgrrr', 3))).toBe(true);
  });

  it('is not stuck at exactly 40%', () => {
    expect(isStuck(run('l1_u', 'ggrrrggrrr'.slice(0, 10), 4).slice(0, 10))).toBe(false); // 4/10
  });

  it('needs three sessions, and enough attempts', () => {
    expect(isStuck(run('l1_u', 'rrrrrrrrrr', 5))).toBe(false); // two sessions
    expect(isStuck(run('l1_u', 'rrrrr', 2))).toBe(false); // three sessions but only 5 attempts
  });

  it('only the newest three sessions count', () => {
    const goodOld = run('l1_u', 'gggggg', 6, 0); // session s0
    const bad = run('l1_u', 'rrrrrrrrr', 3, 1); // sessions s1..s3
    expect(isStuck([...goodOld, ...bad])).toBe(true);
  });
});

describe('pattern: blocked first, random from 80% accuracy', () => {
  it('stays blocked below 5 attempts even when all are green', () => {
    expect(patternOf(run('l1_a', 'gggg'))).toBe('berblok');
  });

  it('turns random at 80% of the last 10 (and at least 5 attempts)', () => {
    expect(patternOf(run('l1_a', 'ggggg'))).toBe('acak');
    expect(patternOf(run('l1_a', 'ggggrggggg'))).toBe('acak'); // 9/10
    expect(patternOf(run('l1_a', 'gggrggrggg'))).toBe('acak'); // 8/10 = exactly 80%
    expect(patternOf(run('l1_a', 'gggrggrrgg'))).toBe('berblok'); // 7/10
  });

  it('falls back to blocked when accuracy drops', () => {
    expect(patternOf(run('l1_a', 'gggggrrrr'))).toBe('berblok'); // 5/9
  });
});

describe('reduced feedback', () => {
  it('Level 0-2 always show the full result', () => {
    for (const level of [0, 1, 2]) for (const n of [1, 2, 3]) expect(feedbackDetail(level, 'acak', n)).toBe('full');
  });

  it('Level 3 in the blocked pattern shows everything (first attempts are never hidden)', () => {
    for (const n of [1, 2, 3, 4]) expect(feedbackDetail(3, 'berblok', n)).toBe('full');
  });

  it('Level 3 in the random pattern shows the overall status on every 2nd attempt of the session only', () => {
    expect([1, 2, 3, 4].map((n) => feedbackDetail(3, 'acak', n))).toEqual(['hidden', 'overall', 'hidden', 'overall']);
  });
});

describe('buildProgress: stages and locks', () => {
  const passedA = run('l1_a', 'gggggggggg', 5);

  it('Level 0 and 1 are open from the start; Level 2 and 3 are locked', () => {
    const p = buildProgress(ITEMS, [], [], RULES, NOW);
    expect([...p.values()].map((x) => `${x.itemId}:${x.stage}`)).toEqual([
      'l0_hold_a:berlatih', 'l1_a:berlatih', 'l1_i:berlatih', 'l2_ma:terkunci', 'l3_mama:terkunci',
    ]); // fmt: skip
  });

  it('passing one Level 1 material opens Level 2, but not Level 3', () => {
    const p = buildProgress(ITEMS, passedA, [], RULES, new Date(at(1, 30))); // passed on day 1, review due on day 2
    expect(p.get('l1_a')?.stage).toBe('lulus');
    expect(p.get('l2_ma')?.stage).toBe('berlatih');
    expect(p.get('l3_mama')?.stage).toBe('terkunci');
  });

  it('"Buka semua materi" opens everything', () => {
    const p = buildProgress(ITEMS, [], [], { ...RULES, unlockAll: true }, NOW);
    expect(p.get('l3_mama')?.stage).toBe('berlatih');
  });

  it('a material that already has attempts is never locked again', () => {
    const p = buildProgress(ITEMS, run('l3_mama', 'g'), [], RULES, NOW);
    expect(p.get('l3_mama')?.locked).toBe(false);
  });

  it('a passed material becomes "ulasan" when the review is due and "lulus" again after it', () => {
    const base = [...passedA];
    const due = buildProgress(ITEMS, base, [], RULES, new Date(at(3, 1)));
    expect(due.get('l1_a')?.stage).toBe('ulasan');
    const reviewed = [...base, { itemId: 'l1_a', sessionId: 's9', at: at(3, 2), overall: 'hijau' as Status }];
    const after = buildProgress(ITEMS, reviewed, [], RULES, new Date(at(3, 3)));
    expect(after.get('l1_a')?.stage).toBe('lulus');
    expect(after.get('l1_a')?.nextReviewAt).toBe(at(4, 4)); // passed day 1 at 08:04, so day 3 = day 4 at 08:04
  });

  it('a stuck material is "macet", and passing wins over stuck', () => {
    const p = buildProgress(ITEMS, run('l1_i', 'rrgrrgrrr', 3), [], RULES, NOW);
    expect(p.get('l1_i')?.stage).toBe('macet');
    const q = buildProgress(ITEMS, [...run('l1_i', 'rrgrrgrrr', 3), ...run('l1_i', 'gggggggggg', 5, 10)], [], RULES, NOW);
    expect(['lulus', 'ulasan']).toContain(q.get('l1_i')?.stage);
  });

  it('reports counts, sessions, last status and the last ten statuses', () => {
    const p = buildProgress(ITEMS, run('l1_a', 'rrrrrrrrrrgy', 4), [], RULES, NOW).get('l1_a')!;
    expect(p.attempts).toBe(12);
    expect(p.sessions).toBe(3);
    expect(p.last).toBe('kuning');
    expect(p.last10).toHaveLength(10);
    expect(p.last10[9]).toBe('kuning');
  });

  it('ignores attempts of other materials', () => {
    const p = buildProgress(ITEMS, run('l1_a', 'ggg'), [], RULES, NOW);
    expect(p.get('l1_i')?.attempts).toBe(0);
  });
});

describe('planSession', () => {
  const rng = () => 0; // always the first candidate

  it('is three steps for 5 minutes, five for 10 and eight for 15', () => {
    expect([5, 10, 15].map(sessionSlots)).toEqual([3, 5, 8]);
  });

  it('starts with the Level 0 warm-up, then repeats the core material while the pattern is blocked', () => {
    const p = buildProgress(ITEMS, [], [], RULES, NOW);
    const plan = planSession(ITEMS, p, [], 10, NOW, rng);
    expect(plan.map((s) => `${s.role}:${s.itemId}`)).toEqual([
      'pemanasan:l0_hold_a', 'inti:l1_a', 'inti:l1_a', 'inti:l1_a',
    ]); // fmt: skip
    expect(plan.every((s) => !s.done)).toBe(true);
  });

  it('puts due reviews before the core material and adds a challenge from practised material', () => {
    const attempts = [...run('l1_a', 'gggggggggg', 5), ...run('l1_i', 'rg', 2, 2)];
    const now = new Date(at(3, 1)); // l1_a review is due
    const p = buildProgress(ITEMS, attempts, [], RULES, now);
    const plan = planSession(ITEMS, p, attempts, 10, now, rng);
    expect(plan[0]).toMatchObject({ role: 'pemanasan' });
    expect(plan[1]).toMatchObject({ role: 'ulasan', itemId: 'l1_a' });
    expect(plan.some((s) => s.role === 'inti' && s.itemId === 'l1_i')).toBe(true);
    expect(plan.length).toBeLessThanOrEqual(5);
  });

  it('marks steps done by today\'s attempts, one per attempt', () => {
    const now = new Date(at(5, 30));
    const attempts = [...run('l1_a', 'g', 1, 5), ...run('l1_a', 'g', 1, 5)]; // two attempts today
    const p = buildProgress(ITEMS, attempts, [], RULES, now);
    const plan = planSession(ITEMS, p, attempts, 10, now, rng);
    const core = plan.filter((s) => s.role === 'inti');
    expect(core.map((s) => s.done)).toEqual([true, true, false]);
  });

  it('is stable for the same seed and works with nothing to practise', () => {
    const a = seededRng('2026-11-11');
    const b = seededRng('2026-11-11');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(planSession([], new Map(), [], 10, NOW, rng)).toEqual([]);
  });
});

describe('weekly summary and report', () => {
  // l1_a: sessions s30, s31; l1_i: sessions s32, s33, s34 (session ids must not collide).
  const attempts = [...run('l1_a', 'gggggggggg', 5, 30), ...run('l1_i', 'rrgrrgrrr', 3, 32)];
  const now = new Date(at(36));
  const progress = buildProgress(ITEMS, attempts, [], RULES, now);

  it('counts sessions, attempts and green attempts of the last 7 days only', () => {
    const w = weeklySummary(progress, [...attempts, ...run('l1_u', 'gg', 2, 1)], now); // day 1 is too old
    expect(w.attempts).toBe(19);
    expect(w.green).toBe(10 + 2);
    expect(w.sessions).toBe(2 + 3);
    expect(w.passed).toEqual(['l1_a']);
    expect(w.stuck).toEqual(['l1_i']);
  });

  it('the text report names the stuck material, advises consulting a teacher or therapist, and is no clinical claim', () => {
    const text = reportText(weeklySummary(progress, attempts, now), (id) => id.slice(3));
    expect(text).toContain('Sesi latihan: 5');
    expect(text).toContain('Materi lulus: a');
    expect(text).toContain('Macet: i');
    expect(text).toContain(CONSULT_ADVICE);
    expect(text).toContain('bukan penilaian klinis');
    expect(text).not.toMatch(/\b(normal|abnormal|gangguan|diagnosis)\b/i);
  });

  it('has no advice when nothing is stuck', () => {
    const text = reportText(weeklySummary(buildProgress(ITEMS, [], [], RULES, now), [], now), (id) => id);
    expect(text).not.toContain('Saran');
    expect(text).toContain('Percobaan: 0');
  });
});
