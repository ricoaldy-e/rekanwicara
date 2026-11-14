import { HomeSessionError, loadHomeRecords } from '../src/home/records';

const UID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const WORD = '33333333-3333-4333-8333-333333333333';
const SYLLABLE = '44444444-4444-4444-8444-444444444444';
const mockSession = jest.fn();
const mockFrom = jest.fn();
const data: Record<string, Record<string, unknown>[]> = {};
const errors: Record<string, { error: { message: string }; status: number } | undefined> = {};
const queries: { table: string; filters: [string, unknown][]; orders: [string, unknown][]; range?: [number, number]; limit?: number }[] = [];
const attempt = { id: 'fixture-attempt', user_id: UID, item_id: 'l1_a', level: 1, status: 'ok', overall: 'hijau', created_at: '2026-11-14T01:00:00Z' };
const names = new Map([['l1_a', 'A']]);

interface QueryBuilder {
  select(): QueryBuilder;
  eq(key: string, value: unknown): QueryBuilder;
  in(key: string, value: unknown): QueryBuilder;
  order(key: string, options?: unknown): QueryBuilder;
  range(start: number, end: number): QueryBuilder;
  limit(value: number): QueryBuilder;
  then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown): Promise<unknown>;
}

jest.mock('../src/auth/companion', () => ({ getCompanionSession: () => mockSession() }));
jest.mock('../src/data/supabase', () => ({ getClient: () => ({ from: mockFrom }) }));

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(data)) delete data[key];
  for (const key of Object.keys(errors)) delete errors[key];
  queries.length = 0;
  mockSession.mockReset().mockResolvedValue({ user: { id: UID }, access_token: 'fixture-token' });
  mockFrom.mockImplementation((table: string) => {
    const query: typeof queries[number] = { table, filters: [], orders: [] };
    queries.push(query);
    const builder: QueryBuilder = {
      select: jest.fn(() => builder),
      eq: jest.fn((key: string, value: unknown) => { query.filters.push([key, value]); return builder; }),
      in: jest.fn((key: string, value: unknown) => { query.filters.push([key, value]); return builder; }),
      order: jest.fn((key: string, options?: unknown) => { query.orders.push([key, options]); return builder; }),
      range: jest.fn((start: number, end: number) => { query.range = [start, end]; return builder; }),
      limit: jest.fn((value: number) => { query.limit = value; return builder; }),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => {
        let result = data[table] ?? [];
        if (query.range) result = result.slice(query.range[0], query.range[1] + 1);
        if (query.limit) result = result.slice(0, query.limit);
        return Promise.resolve({ data: result, error: errors[table]?.error ?? null, status: errors[table]?.status ?? 200 }).then(resolve, reject);
      },
    };
    return builder;
  });
});

it('loads an empty account without inventing progress, time or activities', async () => {
  await expect(loadHomeRecords(UID, names)).resolves.toEqual({ progress: [], activities: [] });
  expect(queries.every((query) => query.filters.some(([key, value]) => key === 'user_id' && value === UID))).toBe(true);
  const attempts = queries.find((query) => query.table === 'attempts')!;
  expect(attempts.filters).toContainEqual(['status', 'ok']);
  expect(attempts.orders[0]).toEqual(['created_at', { ascending: false }]);
  expect(attempts.limit).toBe(10);
});

it('maps actual database fields for progress and activity', async () => {
  data.attempts = [attempt];
  data.progress = [{ user_id: UID, item_id: 'l1_a', stage: 'lulus', passed_at: '2026-11-14T00:00:00Z' }];
  const result = await loadHomeRecords(UID, names);
  expect(result.activities[0]).toMatchObject({ name: 'A', level: 1, result: 'Sesuai' });
  expect(result.progress).toEqual([{ itemId: 'l1_a', stage: 'lulus', passed: true }]);
});

it('resolves custom names only through owner-filtered tables and parent joins', async () => {
  data.attempts = [{ ...attempt, id: 'word', item_id: `custom_word:${WORD}`, level: 3 },
    { ...attempt, id: 'syllable', item_id: `custom_syllable:${SYLLABLE}`, level: 2 }];
  data.custom_words = [{ id: WORD, user_id: UID, word: 'TOLONG' }];
  data.custom_syllables = [{ id: SYLLABLE, syllable: 'TO', custom_words: { user_id: UID } }];
  const result = await loadHomeRecords(UID, names);
  expect(result.activities.map((item) => item.name)).toEqual(['TOLONG', 'TO']);
  expect(queries.find((query) => query.table === 'custom_words')!.filters).toEqual([['user_id', UID], ['id', [WORD]]]);
  expect(queries.find((query) => query.table === 'custom_syllables')!.filters).toEqual([['custom_words.user_id', UID], ['id', [SYLLABLE]]]);
});

it('reads every page of progress instead of truncating totals at the first page', async () => {
  data.progress = Array.from({ length: 201 }, (_, index) => ({ user_id: UID, item_id: `fixture-${index}`, stage: 'berlatih', passed_at: null }));
  const result = await loadHomeRecords(UID, names);
  expect(result.progress).toHaveLength(201);
  expect(queries.filter((query) => query.table === 'progress').map((query) => query.range)).toEqual([[0, 199], [200, 399]]);
});

it('rejects a missing session without querying the database', async () => {
  mockSession.mockResolvedValue(null);
  await expect(loadHomeRecords(UID, names)).rejects.toBeInstanceOf(HomeSessionError);
  expect(mockFrom).not.toHaveBeenCalled();
});

it('discards in-flight results when the account changes', async () => {
  mockSession.mockResolvedValueOnce({ user: { id: UID } }).mockResolvedValue({ user: { id: OTHER } });
  await expect(loadHomeRecords(UID, names)).rejects.toBeInstanceOf(HomeSessionError);
});

it('rejects cross-account rows instead of exposing them', async () => {
  data.attempts = [{ ...attempt, user_id: OTHER }];
  await expect(loadHomeRecords(UID, names)).rejects.toThrow('Akun data berbeda');
});

it('does not turn a database error into an empty successful response', async () => {
  errors.progress = { status: 503, error: { message: 'synthetic-unavailable' } };
  await expect(loadHomeRecords(UID, names)).rejects.toThrow('Progres belum dapat dimuat');
});

it('recognizes an expired database JWT as a session error', async () => {
  errors.attempts = { status: 401, error: { message: 'synthetic-expired' } };
  await expect(loadHomeRecords(UID, names)).rejects.toBeInstanceOf(HomeSessionError);
});
