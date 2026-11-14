/** Real Supabase SDK/RLS checks. Synthetic metadata only; operator access is cleanup-only. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { createClient } = require('../../app/node_modules/@supabase/supabase-js');
const ts = require('../../app/node_modules/typescript');

const root = path.resolve(__dirname, '../..');
const sourceRoot = path.join(root, 'app/src');
// Load the actual pure payload/queue code without React Native, mocks, or a new dependency.
const modules = new Map();
function source(relative) {
  const file = path.resolve(sourceRoot, relative);
  if (modules.has(file)) return modules.get(file).exports;
  if (!['user/pure.ts', 'data/sync.ts', 'state/progression.ts'].some((name) => file === path.join(sourceRoot, name))) {
    throw new Error('UnexpectedSourceModule');
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  if (code.diagnostics.some((item) => item.category === ts.DiagnosticCategory.Error)) throw new Error('SourceCompileFailed');
  const module = new Module(file);
  modules.set(file, module);
  module.filename = file;
  module.paths = Module._nodeModulePaths(path.dirname(file));
  module.require = (request) => {
    if (!request.startsWith('.')) throw new Error('UnexpectedSourceDependency');
    return source(path.relative(sourceRoot, path.resolve(path.dirname(file), request + '.ts')));
  };
  module._compile(code.outputText, file);
  return module.exports;
}
const { attemptFromV2Response, newProfile, markSynced } = source('user/pure.ts');
const { syncPending } = source('data/sync.ts');
const planPath = process.argv[2];
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
if (!/^sdk_v2_test_[a-f0-9]{32}$/.test(plan.item_id) || plan.session_id !== plan.item_id ||
  plan.attempt_ids.length !== 3 || new Set(plan.attempt_ids).size !== 3 ||
  plan.all_attempt_ids.length !== 4 || new Set(plan.all_attempt_ids).size !== 4 ||
  !plan.attempt_ids.every((id) => plan.all_attempt_ids.includes(id)) ||
  !plan.all_attempt_ids.includes(plan.invalid_attempt_id) || plan.attempt_ids.includes(plan.invalid_attempt_id) ||
  !plan.all_attempt_ids.every((id) => /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(id))) throw new Error('InvalidTestScope');
const reportPath = path.join(path.dirname(planPath), 'results.json');
const report = { cases: {}, http: [], cleanup: {}, limitations: [
  'Synthetic metadata; no pronunciation or camera validation.',
  'Node Supabase SDK and real application payload/queue functions; not native SDK storage.',
  'Progress fixture verifies database/RLS only; current v2 queue does not derive progress or graduation.',
] };
let input = '';
let config;
const clients = {};
let owners = {};

function persist() { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2)); }
function check(name, passed, facts = {}, fatal = true) {
  report.cases[name] = { ...facts, passed: Boolean(passed) };
  console.log(JSON.stringify({ [name]: report.cases[name] }));
  persist();
  if (!passed && fatal) throw new Error('CheckFailed:' + name);
}
function sdk(alias, key, headers = {}) {
  return createClient(config.project, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers, fetch: async (input, init) => {
      const route = new URL(typeof input === 'string' ? input : input.url).pathname;
      let role;
      if ((alias === 'A' || alias === 'B') && route.startsWith('/rest/v1/')) {
        const bearer = new Headers(init?.headers).get('Authorization')?.split(' ')[1];
        const claims = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString());
        if (claims.role !== 'authenticated' || claims.sub !== owners[alias]) throw new Error('WrongRequestIdentity');
        role = claims.role;
      }
      const response = await fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(45000) });
      report.http.push({ account: alias, method: init?.method || 'GET',
        route: route.replace(/\/auth\/v1\/token.*/, '/auth/v1/token'), status: response.status,
        ...(role ? { jwt_role: role, owner_matches: true } : {}) });
      return response;
    } },
  });
}
function status(result) { return { status: result.status, code: result.error?.code || null }; }
function attemptQuery(client, ids = plan.all_attempt_ids) {
  return client.from('attempts').select('*').in('id', ids).eq('session_id', plan.session_id);
}
function progressQuery(client) {
  return client.from('progress').select('*').eq('item_id', plan.item_id);
}
function remote(alias) {
  const client = clients[alias];
  return {
    async ensureUser() {
      const value = await client.auth.getUser();
      if (value.error || value.data.user?.id !== owners[alias] || value.data.user.is_anonymous) throw new Error('SessionChanged');
      return value.data.user.id;
    },
    async upsert(table, rows) {
      if (rows.some((row) => row.user_id !== owners[alias])) throw new Error('OwnerMismatch');
      const value = await client.from(table).upsert(rows, {
        onConflict: table === 'attempts' ? 'id' : 'user_id,item_id', ignoreDuplicates: false,
      });
      check('queue_' + alias + '_' + report.http.length, !value.error, { ...status(value), table });
    },
  };
}
function evaluated(result) {
  return { status: 'evaluated', item_id: plan.item_id, level: 1, result, lip_result: result,
    voice_result: result, feedback: { code: 'SDK_PERSISTENCE_TEST', message: 'Metadata pengujian penyimpanan.' },
    quality_flags: [], visuals: null, engine: 'mediapipe_parselmouth_wav2vec2', processing_ms: 0 };
}
function progressRow(uid, values) {
  return { user_id: uid, item_id: plan.item_id, stage: 'berlatih', last_10: values,
    sessions_count: 1, passed_at: null, next_review_at: null };
}
async function snapshot(alias) {
  const [attempts, progress] = await Promise.all([attemptQuery(clients[alias]), progressQuery(clients[alias])]);
  if (attempts.error || progress.error) throw new Error('SnapshotFailed');
  return JSON.stringify({ attempts: attempts.data.sort((a, b) => a.id.localeCompare(b.id)), progress: progress.data });
}
async function cleanup() {
  const issues = [];
  for (const alias of Object.keys(owners)) {
    const client = clients[alias];
    const attempts = await client.from('attempts').delete().in('id', plan.all_attempt_ids)
      .eq('session_id', plan.session_id).eq('user_id', owners[alias]).select('id');
    const progress = await client.from('progress').delete().eq('item_id', plan.item_id)
      .eq('user_id', owners[alias]).select('item_id');
    report.cleanup['authenticated_' + alias] = { attempts: status(attempts), progress: status(progress),
      attempts_deleted: attempts.data?.length || 0, progress_deleted: progress.data?.length || 0 };
  }
  let remaining = 0;
  for (const alias of Object.keys(owners)) {
    const [a, p] = await Promise.all([attemptQuery(clients[alias]), progressQuery(clients[alias])]);
    if (a.error || p.error) { issues.push('cleanup_verification_failed'); remaining += 1; }
    else remaining += a.data.length + p.data.length;
  }
  report.cleanup.operator_used = false;
  if (remaining && config.operator_key) {
    const operator = sdk('operator_cleanup_only', config.operator_key);
    const a = await operator.from('attempts').delete().in('id', plan.all_attempt_ids)
      .eq('session_id', plan.session_id).in('user_id', Object.values(owners)).select('id');
    const p = await operator.from('progress').delete().eq('item_id', plan.item_id)
      .in('user_id', Object.values(owners)).select('item_id');
    report.cleanup.operator_used = true;
    report.cleanup.operator = { attempts: status(a), progress: status(p),
      attempts_deleted: a.data?.length || 0, progress_deleted: p.data?.length || 0 };
    const [verifyA, verifyP] = await Promise.all([
      operator.from('attempts').select('id').in('id', plan.all_attempt_ids).eq('session_id', plan.session_id),
      operator.from('progress').select('user_id').eq('item_id', plan.item_id),
    ]);
    remaining = verifyA.error || verifyP.error ? null : verifyA.data.length + verifyP.data.length;
    if (a.error || p.error) issues.push('operator_cleanup_failed');
  }
  report.cleanup.remaining_rows = remaining;
  report.cleanup.all_clean = remaining === 0;
  report.cleanup.issues = issues;
  console.log(JSON.stringify({ cleanup: report.cleanup }));
}
async function run() {
  check('public_key_only_for_user_requests', Boolean(config.public_key) && config.public_key !== config.operator_key && !config.public_key.startsWith('sb_secret_'));
  try {
    for (const credentials of config.accounts) {
      const alias = credentials.alias;
      clients[alias] = sdk(alias, config.public_key);
      const auth = await clients[alias].auth.signInWithPassword({ email: credentials.email, password: credentials.password });
      credentials.email = credentials.password = null;
      check('login_' + alias, !auth.error && auth.data.user?.is_anonymous === false, { error_code: auth.error?.code || null });
      owners[alias] = auth.data.user.id;
    }
    check('two_distinct_accounts', owners.A !== owners.B);
    fs.writeFileSync(path.join(path.dirname(planPath), 'owner-ids.json'), JSON.stringify(owners));
    for (const alias of ['A', 'B']) {
      const [a, p] = await Promise.all([attemptQuery(clients[alias]), progressQuery(clients[alias])]);
      check('empty_test_scope_' + alias, !a.error && !p.error && a.data.length === 0 && p.data.length === 0);
    }
    const profiles = { A: newProfile(owners.A), B: newProfile(owners.B) };
    const fixtures = [['A', 'mendekati'], ['A', 'belum_sesuai'], ['B', 'sesuai']];
    fixtures.forEach(([alias, result], index) => {
      const attempt = attemptFromV2Response(evaluated(result), plan.session_id);
      attempt.id = plan.attempt_ids[index];
      profiles[alias].attempts.push(attempt);
    });
    for (const alias of ['A', 'B']) {
      const result = await syncPending(profiles[alias], [], remote(alias));
      check('actual_queue_first_' + alias, result.error === null && result.attemptIds.length === profiles[alias].attempts.length);
      const replay = await syncPending(profiles[alias], [], remote(alias));
      check('actual_queue_replay_' + alias, replay.error === null && replay.attemptIds.length === profiles[alias].attempts.length);
      const rows = await attemptQuery(clients[alias]);
      check('stored_null_and_no_duplicates_' + alias, !rows.error && rows.data.length === profiles[alias].attempts.length &&
        rows.data.every((row) => row.user_id === owners[alias] && row.score === null && row.engine_version === null && row.status === 'ok' && row.level === 1),
        { ...status(rows), rows: rows.data?.length, null_score: rows.data?.every((row) => row.score === null) });
      check('mapping_' + alias, rows.data.every((row) => profiles[alias].attempts.find((attempt) => attempt.id === row.id)?.overall === row.overall));
      check('complete_payload_round_trip_' + alias, rows.data.every((row) => {
        const expected = profiles[alias].attempts.find((attempt) => attempt.id === row.id);
        return row.item_id === expected.itemId && row.session_id === expected.sessionId &&
          row.indicators?.bibir === expected.indicators.bibir && row.indicators?.suara === expected.indicators.suara &&
          row.hint_id === expected.hintId && row.scorer === expected.scorer && Date.parse(row.created_at) === Date.parse(expected.at);
      }));
      const writes = report.http.filter((event) => event.account === alias && event.method === 'POST').length;
      const acknowledged = markSynced(profiles[alias], new Set(result.attemptIds), new Set());
      const noOp = await syncPending(acknowledged, [], remote(alias));
      check('acknowledged_not_resent_' + alias, noOp.attemptIds.length === 0 &&
        report.http.filter((event) => event.account === alias && event.method === 'POST').length === writes);
      check('queue_does_not_guess_progress_' + alias, !report.http.some((event) =>
        event.account === alias && event.route === '/rest/v1/progress' && event.method === 'POST'));
      const values = profiles[alias].attempts.map((row) => row.overall);
      const row = progressRow(owners[alias], values);
      for (const step of ['first', 'replay']) {
        const progress = await clients[alias].from('progress').upsert(row, { onConflict: 'user_id,item_id' });
        check('progress_' + alias + '_' + step, !progress.error, status(progress));
      }
      const progress = await progressQuery(clients[alias]);
      check('progress_single_owned_row_' + alias, !progress.error && progress.data.length === 1 &&
        progress.data[0].user_id === owners[alias] && progress.data[0].stage === 'berlatih' && progress.data[0].passed_at === null &&
        progress.data[0].next_review_at === null && progress.data[0].sessions_count === 1 &&
        JSON.stringify(progress.data[0].last_10) === JSON.stringify(values),
        { ...status(progress), rows: progress.data?.length });
    }
    const retry = attemptFromV2Response({ ...evaluated('sesuai'), status: 'retry', result: null, lip_result: null, voice_result: null }, plan.session_id);
    check('retry_is_not_an_attempt', retry === null);
    const before = { A: await snapshot('A'), B: await snapshot('B') };
    for (const [reader, owner] of [['B', 'A'], ['A', 'B']]) {
      const ids = profiles[owner].attempts.map((row) => row.id);
      const attempts = await attemptQuery(clients[reader], ids);
      const progress = await clients[reader].from('progress').select('*').eq('user_id', owners[owner]).eq('item_id', plan.item_id);
      check('isolation_read_attempts_' + reader, !attempts.error && attempts.data.length === 0, status(attempts));
      check('isolation_read_progress_' + reader, !progress.error && progress.data.length === 0, status(progress));
      const updateA = await clients[reader].from('attempts').update({ hint_id: 'UNAUTHORIZED_TEST_EDIT' }).eq('id', ids[0]).select('id');
      const updateP = await clients[reader].from('progress').update({ stage: 'macet' }).eq('user_id', owners[owner]).eq('item_id', plan.item_id).select('item_id');
      check('isolation_update_attempts_' + reader, updateA.error?.code === '42501' || !updateA.error && updateA.data.length === 0, status(updateA));
      check('isolation_update_progress_' + reader, updateP.error?.code === '42501' || !updateP.error && updateP.data.length === 0, status(updateP));
      const insertA = await clients[reader].from('attempts').upsert({ id: ids[0], user_id: owners[owner], session_id: plan.session_id,
        item_id: plan.item_id, level: 1, status: 'ok', overall: 'merah', score: null }, { onConflict: 'id' });
      const insertP = await clients[reader].from('progress').upsert(progressRow(owners[owner], ['merah']), { onConflict: 'user_id,item_id' });
      check('isolation_upsert_attempts_' + reader, insertA.error?.code === '42501', status(insertA));
      check('isolation_upsert_progress_' + reader, insertP.error?.code === '42501', status(insertP));
      const deleteA = await clients[reader].from('attempts').delete().eq('id', ids[0]).eq('session_id', plan.session_id).select('id');
      const deleteP = await clients[reader].from('progress').delete().eq('user_id', owners[owner]).eq('item_id', plan.item_id).select('item_id');
      check('isolation_delete_attempts_' + reader, deleteA.error?.code === '42501' || !deleteA.error && deleteA.data.length === 0, status(deleteA));
      check('isolation_delete_progress_' + reader, deleteP.error?.code === '42501' || !deleteP.error && deleteP.data.length === 0, status(deleteP));
    }
    check('owners_unchanged_after_isolation', before.A === await snapshot('A') && before.B === await snapshot('B'));
    const invalid = await clients.A.from('attempts').insert({ id: plan.invalid_attempt_id, user_id: owners.A,
      session_id: plan.session_id, item_id: plan.item_id, level: 1, status: 'evaluated', overall: 'sesuai', score: null });
    check('unmapped_v2_values_rejected', invalid.error?.code === '23514', status(invalid));
    const anon = sdk('anon', config.public_key);
    const denied = await anon.from('attempts').upsert({ id: plan.invalid_attempt_id, user_id: owners.A,
      session_id: plan.session_id, item_id: plan.item_id, level: 1, status: 'ok', overall: 'hijau', score: null });
    check('anon_write_denied', denied.error?.code === '42501', status(denied));
  } finally {
    try { await cleanup(); } catch (error) { report.cleanup = { all_clean: false, error: error.name }; }
    for (const alias of Object.keys(owners)) {
      const logout = await clients[alias].auth.signOut({ scope: 'local' });
      check('logout_local_' + alias, !logout.error, {}, false);
    }
  }
}
process.stdin.setEncoding('utf8');
if (process.argv.includes('--self-check')) {
  const assert = require('node:assert/strict');
  for (const [value, color] of [['sesuai', 'hijau'], ['mendekati', 'kuning'], ['belum_sesuai', 'merah']]) {
    const attempt = attemptFromV2Response(evaluated(value), plan.session_id);
    assert.equal(attempt.score, null);
    assert.equal(attempt.engineVersion, null);
    assert.equal(attempt.overall, color);
    assert.equal(attempt.level, 1);
  }
  assert.equal(attemptFromV2Response({ ...evaluated('sesuai'), status: 'retry', result: null,
    lip_result: null, voice_result: null }, plan.session_id), null);
  assert.equal(typeof syncPending, 'function');
  console.log(JSON.stringify({ source_loader_self_check: true, cloud_requests: 0 }));
  process.exit(0);
}
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', async () => {
  try {
    config = JSON.parse(input);
    input = '';
    await run();
  } catch (error) {
    report.error = error.message.startsWith('CheckFailed:') ? error.message : error.name;
    process.exitCode = 1;
  } finally {
    report.summary = { passed: Object.values(report.cases).filter((item) => item.passed).length,
      failed: Object.entries(report.cases).filter(([, item]) => !item.passed).map(([name]) => name), all_clean: report.cleanup.all_clean === true };
    persist();
    console.log(JSON.stringify({ summary: report.summary }));
    if (!report.cleanup.all_clean) process.exitCode = 1;
  }
});
