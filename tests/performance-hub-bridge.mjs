import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = await mkdtemp(join(tmpdir(), 'hub-bridge-test-'));
const athleteId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const otherId = '33333333-3333-4333-8333-333333333333';
const activityId = '44444444-4444-4444-8444-444444444444';
const hash = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('planner-secret'))).toString('hex');
let handler;
let fixtures, privateReads, tokenType, authUser, failingTable;
class Query {
  constructor(table) { this.table = table; this.predicates = []; this.start = 0; this.end = Infinity; }
  select() { return this; }
  eq(k, v) { this.predicates.push(row => row[k] === v); return this; }
  is(k, v) { this.predicates.push(row => (row[k] ?? null) === v); return this; }
  gte(k, v) { this.predicates.push(row => row[k] >= v); return this; }
  lte(k, v) { this.predicates.push(row => row[k] <= v); return this; }
  order() { return this; }
  range(a, b) { this.start = a; this.end = b; return this; }
  insert() { this.mutation = true; return this; }
  maybeSingle() { this.single = true; return this; }
  then(resolve, reject) { return Promise.resolve().then(() => {
    if (this.table === failingTable) return { data: null, error: { message: 'simulated query failure' } };
    if (this.mutation) return { data: null, error: null };
    if (!['profiles', 'external_planner_tokens'].includes(this.table)) privateReads++;
    let rows = this.table === 'external_planner_tokens' ? [{ id: 'token-id', token_hash: hash, planner_type: tokenType, is_active: true }] : fixtures[this.table] ?? [];
    rows = rows.filter(row => this.predicates.every(test => test(row))).slice(this.start, this.end + 1);
    return { data: this.single ? rows[0] ?? null : rows, error: null };
  }).then(resolve, reject); }
}
function reset() {
  privateReads = 0; tokenType = 'performance'; authUser = actorId; failingTable = null;
  fixtures = { profiles: [{ id: actorId, role: 'trainer' }, { id: athleteId, email: 'athlete@test.example', assigned_trainer_id: actorId }], external_activities: [{ id: activityId, user_id: athleteId, start_time: '2026-10-20T12:00:00Z', local_date: '2026-10-20', sport_type: 'run', deleted_at: null }], activity_streams: [{ activity_id: activityId, user_id: athleteId, time_stream: [0, 1], velocity_smooth_stream: [3, 4], watts_stream: null }] };
}
globalThis.__bridgeDb = { auth: { getUser: async () => ({ data: { user: authUser ? { id: authUser } : null } }) }, from: table => new Query(table) };
globalThis.Deno = { env: { get: key => key === 'JWT_SECRET' ? 'test-secret' : 'https://hub.test' }, serve: fn => { handler = fn; } };
try {
  await build({ entryPoints: ['supabase/functions/performance-hub-bridge/index.ts'], outfile: join(dir, 'bridge.mjs'), bundle: true, platform: 'node', format: 'esm', plugins: [{ name: 'test-boundaries', setup(build) {
    build.onResolve({ filter: /^npm:/ }, args => ({ path: args.path, namespace: 'mock-boundary' }));
    build.onLoad({ filter: /.*/, namespace: 'mock-boundary' }, args => ({ contents: args.path.includes('supabase-js') ? 'export const createClient = () => globalThis.__bridgeDb;' : 'export const jwtVerify = async (jwt) => { if (jwt !== "verified-satellite-jwt") throw new Error("invalid"); return { payload: { user_id: "22222222-2222-4222-8222-222222222222" } }; };', loader: 'js' }));
  } }] });
  await import(pathToFileURL(join(dir, 'bridge.mjs')));
  const request = (path = 'context', headers = { Authorization: 'Bearer supabase-jwt', 'X-Planner-Token': 'planner-secret' }, extra = '') => new Request(`https://hub.test/performance-hub-bridge/${path}?athlete_id=${athleteId}${extra}`, { headers });
  reset(); assert.equal((await handler(request('context', {}))).status, 401); assert.equal(privateReads, 0);
  reset(); assert.equal((await handler(request('context', { Authorization: 'Bearer jwt', 'X-Planner-Token': 'wrong' }))).status, 401); assert.equal(privateReads, 0);
  reset(); tokenType = 'endurance'; assert.equal((await handler(request())).status, 403); assert.equal(privateReads, 0);
  reset(); authUser = null; assert.equal((await handler(request())).status, 401); assert.equal(privateReads, 0);
  reset(); authUser = null; assert.equal((await handler(request('context', { Authorization: 'Bearer verified-satellite-jwt', 'X-Planner-Token': 'planner-secret' }))).status, 200);
  reset(); fixtures.profiles[1].assigned_trainer_id = otherId; assert.equal((await handler(request())).status, 403); assert.equal(privateReads, 0, 'authorization must precede private data queries');
  reset(); const success = await handler(request()); assert.equal(success.status, 200); const context = await success.json(); assert.equal(context.data.external.length, 1); assert.deepEqual(context.errors, {});
  reset(); fixtures.external_activities = Array.from({ length: 1201 }, (_, i) => ({ id: `row-${i}`, user_id: athleteId, start_time: '2026-10-20T12:00:00Z' })); assert.equal((await (await handler(request())).json()).data.external.length, 1201, 'history must page beyond 1000 rows');
  reset(); failingTable = 'bioimpedance_measurements'; const partial = await (await handler(request())).json(); assert.ok(partial.errors.bioimpedance); assert.equal(partial.data.external.length, 1);
  reset(); const stream = await (await handler(request('streams', undefined, `&activity_id=${activityId}`))).json(); assert.deepEqual(stream.series.speed, [3, 4]); assert.equal(stream.series.watts, null);
  reset(); fixtures.external_activities[0].user_id = otherId; assert.equal((await handler(request('streams', undefined, `&activity_id=${activityId}`))).status, 404);
  reset(); assert.equal((await handler(request('context', undefined, '&date_from=2026-10-22&date_to=2026-10-01'))).status, 400);
  assert.equal((await handler(new Request('https://hub.test/bridge/context', { method: 'POST' }))).status, 405);
  assert.equal((await handler(new Request('https://hub.test/bridge/context', { method: 'OPTIONS' }))).status, 200);
  // Exercise the existing wearable handler with the satellite read fallback.
  // Its provider/JWT boundary remains mocked; real action/ownership/consent checks run.
  await build({ entryPoints: ['supabase/functions/open-wearables/index.ts'], outfile: join(dir, 'wearables.mjs'), bundle: true, platform: 'node', format: 'esm', plugins: [{ name: 'test-boundaries', setup(build) {
    build.onResolve({ filter: /^npm:/ }, args => ({ path: args.path, namespace: 'mock-boundary' }));
    build.onLoad({ filter: /.*/, namespace: 'mock-boundary' }, args => ({ contents: args.path.includes('supabase-js') ? 'export const createClient = () => globalThis.__bridgeDb;' : 'export const jwtVerify = async (jwt) => { if (jwt !== "verified-satellite-jwt") throw new Error("invalid"); return { payload: { user_id: "22222222-2222-4222-8222-222222222222" } }; };', loader: 'js' }));
  } }] });
  await import(pathToFileURL(join(dir, 'wearables.mjs')));
  const wearableRequest = (action, token = 'verified-satellite-jwt', planner = 'planner-secret') => new Request('https://hub.test/open-wearables', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Planner-Token': planner, 'Content-Type': 'application/json' }, body: JSON.stringify({ action, executed_session_id: activityId }) });
  reset(); authUser = null;
  assert.equal((await handler(wearableRequest('sync-workouts'))).status, 401, 'satellite fallback must not authorize mutation actions');
  assert.equal((await handler(wearableRequest('get-session-timeseries', 'invalid-signature'))).status, 401);
  assert.equal((await handler(wearableRequest('get-session-timeseries', 'verified-satellite-jwt', 'wrong'))).status, 401);
  tokenType = 'endurance';
  assert.equal((await handler(wearableRequest('get-session-timeseries'))).status, 401, 'fallback requires Performance application token');
  reset(); authUser = null; fixtures.executed_sessions = [{ id: activityId, athlete_id: athleteId }];
  const consent = await handler(wearableRequest('get-session-timeseries'));
  assert.equal(consent.status, 403, 'wearable consent remains required after satellite authentication');
  assert.match((await consent.json()).error, /consent/i);
  reset(); authUser = null; fixtures.executed_sessions = [{ id: activityId, athlete_id: otherId }];
  const deniedWearable = await handler(wearableRequest('get-session-timeseries'));
  assert.equal(deniedWearable.status, 403);
  assert.match((await deniedWearable.json()).error, /access denied/i);
  console.log('PASS: 20 bridge/wearable authentication, action scope, authorization, consent, pagination, partial-failure, stream ownership, method and date-range checks. JWT and database providers are mocked at their boundaries.');
} finally { await rm(dir, { recursive: true, force: true }); }
