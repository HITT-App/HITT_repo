/**
 * HITT App — Apple Watch Integration Tests
 *
 * Covers the TypeScript layer (WatchPlugin.ts, watch-event-handler.ts) via
 * source-text audit and the log-watch-workout edge function via live HTTP.
 *
 * Usage:
 *   npx tsx tests/watch-integration.test.ts
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=yourpassword npx tsx tests/watch-integration.test.ts
 *
 * Code-audit tests always run. Edge function tests require auth.
 */

import { readFileSync } from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY     = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';
const FN_BASE      = `${SUPABASE_URL}/functions/v1`;
const SRC          = '/Users/vanessa/hitt-app/src';

const TEST_EMAIL    = process.env.TEST_EMAIL    ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

// ── Result tracking ───────────────────────────────────────────────────────────

type Status = 'PASS' | 'FAIL' | 'SKIP';
interface Result { id: string; label: string; status: Status; note?: string }

const results: Result[] = [];
let supabase: SupabaseClient;
let authToken = '';

function pass(id: string, label: string) {
  results.push({ id, label, status: 'PASS' });
  console.log(`  \x1b[32m✓\x1b[0m  [${id}] ${label}`);
}

function fail(id: string, label: string, note: string) {
  results.push({ id, label, status: 'FAIL', note });
  console.log(`  \x1b[31m✗\x1b[0m  [${id}] ${label}`);
  console.log(`       \x1b[33m→ ${note}\x1b[0m`);
}

function skip(id: string, label: string, note = 'Needs auth') {
  results.push({ id, label, status: 'SKIP', note });
  console.log(`  \x1b[90m–\x1b[0m  [${id}] ${label} \x1b[90m(skipped: ${note})\x1b[0m`);
}

function section(title: string) {
  console.log(`\n\x1b[1m\x1b[34m━━━  ${title}  ━━━\x1b[0m`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function readSrc(path: string): string {
  return readFileSync(`${SRC}/${path}`, 'utf-8');
}

async function callFn(name: string, body: object): Promise<{ status: number; json: any }> {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function authenticate(): Promise<boolean> {
  if (!TEST_EMAIL || !TEST_PASSWORD) return false;
  supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.session) {
    console.log(`  \x1b[31m✗\x1b[0m  Auth failed: ${error?.message ?? 'no session'}`);
    return false;
  }
  authToken = data.session.access_token;
  console.log(`  \x1b[32m✓\x1b[0m  Signed in as ${TEST_EMAIL}`);
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1 — WATCHPLUGIN SOURCE AUDIT
// ════════════════════════════════════════════════════════════════════════════

async function runWatchPluginAudit() {
  section('WATCHPLUGIN SOURCE AUDIT');

  let src: string;
  try {
    src = readSrc('plugins/WatchPlugin.ts');
  } catch {
    for (const id of ['WP-01','WP-02','WP-03','WP-04','WP-05','WP-06','WP-07','WP-08']) {
      fail(id, 'WatchPlugin audit', 'src/plugins/WatchPlugin.ts not found');
    }
    return;
  }

  // ── WP-01: sendStructuredWorkoutToWatch no-ops on non-native ─────────────

  // The function must guard with `if (!Capacitor.isNativePlatform()) return`
  // before calling the native plugin — otherwise it would throw on web.
  const sendStructuredFn = src.match(
    /export const sendStructuredWorkoutToWatch[\s\S]*?^}/m
  )?.[0] ?? '';
  if (sendStructuredFn.includes('!Capacitor.isNativePlatform()') && sendStructuredFn.includes('return')) {
    pass('WP-01', 'sendStructuredWorkoutToWatch guards with !Capacitor.isNativePlatform() early return');
  } else {
    fail('WP-01', 'sendStructuredWorkoutToWatch guards with !Capacitor.isNativePlatform() early return',
      'Guard not found inside sendStructuredWorkoutToWatch body');
  }

  // ── WP-02: sendWorkoutToWatch also guards non-native ─────────────────────

  const sendWorkoutFn = src.match(
    /export const sendWorkoutToWatch[\s\S]*?^}/m
  )?.[0] ?? '';
  if (sendWorkoutFn.includes('!Capacitor.isNativePlatform()') && sendWorkoutFn.includes('return')) {
    pass('WP-02', 'sendWorkoutToWatch guards with !Capacitor.isNativePlatform() early return');
  } else {
    fail('WP-02', 'sendWorkoutToWatch guards with !Capacitor.isNativePlatform() early return',
      'Guard not found inside sendWorkoutToWatch body');
  }

  // ── WP-03: sendWorkoutToWatch calls sendWorkout (not sendStructuredWorkout) ─

  if (sendWorkoutFn.includes('sendWorkout(') && !sendWorkoutFn.includes('sendStructuredWorkout(')) {
    pass('WP-03', 'sendWorkoutToWatch calls WatchPluginImpl.sendWorkout (not sendStructuredWorkout)');
  } else {
    fail('WP-03', 'sendWorkoutToWatch calls WatchPluginImpl.sendWorkout',
      'sendWorkout call not found — may be calling wrong underlying method');
  }

  // ── WP-04: WatchWorkout shape has required fields ─────────────────────────

  const hasId       = src.includes('id: string');
  const hasName     = src.includes('name: string');
  const hasDuration = src.includes('durationMinutes: number');
  const hasExercises = src.includes('exercises: WatchExercise[]');
  if (hasId && hasName && hasDuration && hasExercises) {
    pass('WP-04', 'WatchWorkout interface has id, name, durationMinutes, exercises fields');
  } else {
    const missing = [
      !hasId && 'id',
      !hasName && 'name',
      !hasDuration && 'durationMinutes',
      !hasExercises && 'exercises',
    ].filter(Boolean).join(', ');
    fail('WP-04', 'WatchWorkout interface has all required fields', `Missing: ${missing}`);
  }

  // ── WP-05: WatchExercise optional rest fields ─────────────────────────────

  // restAfterSetSeconds and restAfterExerciseSeconds must be optional (marked with ?)
  const hasRestAfterSet = src.includes('restAfterSetSeconds?:');
  const hasRestAfterEx  = src.includes('restAfterExerciseSeconds?:');
  if (hasRestAfterSet && hasRestAfterEx) {
    pass('WP-05', 'WatchExercise.restAfterSetSeconds and restAfterExerciseSeconds are optional (?)');
  } else {
    const missing = [
      !hasRestAfterSet && 'restAfterSetSeconds?',
      !hasRestAfterEx  && 'restAfterExerciseSeconds?',
    ].filter(Boolean).join(', ');
    fail('WP-05', 'WatchExercise rest fields are optional', `Not declared optional: ${missing}`);
  }

  // ── WP-06: WatchExercise core fields are also optional ───────────────────

  // sets, reps, durationSeconds are all optional — workouts may use any combination
  const hasSetsOpt     = src.includes('sets?:');
  const hasRepsOpt     = src.includes('reps?:');
  const hasDurSecOpt   = src.includes('durationSeconds?:');
  if (hasSetsOpt && hasRepsOpt && hasDurSecOpt) {
    pass('WP-06', 'WatchExercise.sets, reps, durationSeconds are all optional (?)');
  } else {
    const missing = [
      !hasSetsOpt   && 'sets?',
      !hasRepsOpt   && 'reps?',
      !hasDurSecOpt && 'durationSeconds?',
    ].filter(Boolean).join(', ');
    fail('WP-06', 'WatchExercise optional exercise fields', `Not declared optional: ${missing}`);
  }

  // ── WP-07: onWatchWorkoutEvent returns a no-op on non-native ─────────────

  // The early-return on non-native must return () => {} (a no-op unsubscribe function)
  // so callers can always call the returned cleanup without null-checking.
  const onWatchFn = src.match(
    /export const onWatchWorkoutEvent[\s\S]*?^};/m
  )?.[0] ?? '';
  if (onWatchFn.includes('return () => {}')) {
    pass('WP-07', 'onWatchWorkoutEvent returns () => {} no-op on non-native platform');
  } else {
    fail('WP-07', 'onWatchWorkoutEvent returns () => {} no-op on non-native platform',
      'return () => {} not found in onWatchWorkoutEvent body');
  }

  // ── WP-08: WatchWorkoutEvent has all required event types ────────────────

  const hasStarted   = src.includes('"workoutStarted"');
  const hasCompleted = src.includes('"workoutCompleted"');
  const hasCancelled = src.includes('"workoutCancelled"');
  if (hasStarted && hasCompleted && hasCancelled) {
    pass('WP-08', 'WatchWorkoutEvent.event union includes workoutStarted, workoutCompleted, workoutCancelled');
  } else {
    const missing = [
      !hasStarted   && 'workoutStarted',
      !hasCompleted && 'workoutCompleted',
      !hasCancelled && 'workoutCancelled',
    ].filter(Boolean).join(', ');
    fail('WP-08', 'WatchWorkoutEvent event union', `Missing: ${missing}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — WATCH EVENT HANDLER SINGLETON AUDIT
// ════════════════════════════════════════════════════════════════════════════

async function runWatchEventHandlerAudit() {
  section('WATCH EVENT HANDLER SINGLETON AUDIT');

  let src: string;
  try {
    src = readFileSync('/Users/vanessa/hitt-app/src/lib/watch-event-handler.ts', 'utf-8');
  } catch {
    for (const id of ['WEH-01','WEH-02','WEH-03','WEH-04','WEH-05']) {
      fail(id, 'watch-event-handler audit', 'src/lib/watch-event-handler.ts not found');
    }
    return;
  }

  // ── WEH-01: module-level initialised flag prevents double-subscribe ───────

  // The `initialised` variable must be declared at module scope (not inside
  // initWatchEventHandler) so it persists across calls.
  const moduleLevel = src.match(/^let initialised\s*=/m);
  if (moduleLevel) {
    pass('WEH-01', 'initWatchEventHandler: initialised flag declared at module scope (not inside function)');
  } else {
    fail('WEH-01', 'initWatchEventHandler: initialised at module scope',
      'let initialised not found at top level — double-subscribe guard may not work');
  }

  // ── WEH-02: guard checks initialised before subscribing ──────────────────

  const guardPattern = src.includes('if (initialised');
  if (guardPattern) {
    pass('WEH-02', 'initWatchEventHandler checks initialised flag before subscribing');
  } else {
    fail('WEH-02', 'initWatchEventHandler checks initialised flag', 'if (initialised) guard not found');
  }

  // ── WEH-03: guard also checks isNativePlatform ────────────────────────────

  if (src.includes('!Capacitor.isNativePlatform()')) {
    pass('WEH-03', 'initWatchEventHandler early-returns on non-native platform');
  } else {
    fail('WEH-03', 'initWatchEventHandler early-returns on non-native',
      '!Capacitor.isNativePlatform() check not found in watch-event-handler.ts');
  }

  // ── WEH-04: sets initialised = true before subscribing (not after) ────────

  // Setting the flag before the subscription call prevents a second call during
  // an async gap from registering a duplicate listener.
  const initTrueIdx   = src.indexOf('initialised = true');
  const subscribeIdx  = src.indexOf('onWatchWorkoutEvent(');
  if (initTrueIdx !== -1 && subscribeIdx !== -1 && initTrueIdx < subscribeIdx) {
    pass('WEH-04', 'initialised = true is set before onWatchWorkoutEvent() call (race-free)');
  } else {
    fail('WEH-04', 'initialised = true before onWatchWorkoutEvent()',
      `initTrueIdx=${initTrueIdx} subscribeIdx=${subscribeIdx} — order may be wrong`);
  }

  // ── WEH-05: only subscribes to workoutCompleted events ───────────────────

  // The handler filters on event.event !== "workoutCompleted" so other events
  // (workoutStarted, workoutCancelled) are ignored safely.
  if (src.includes('"workoutCompleted"')) {
    pass('WEH-05', 'Event handler filters on workoutCompleted (other events are ignored)');
  } else {
    fail('WEH-05', 'Event handler filters on workoutCompleted', '"workoutCompleted" not found in handler body');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — PAYLOAD CONSTRUCTION AUDIT (WorkoutDetail + WorkoutPlayer)
// ════════════════════════════════════════════════════════════════════════════

async function runPayloadConstructionAudit() {
  section('WATCH PAYLOAD CONSTRUCTION AUDIT');

  // WorkoutDetail — sendStructuredWorkoutToWatch payload
  try {
    const src = readSrc('pages/WorkoutDetail.tsx');

    // ── PC-01: WorkoutDetail sends id, name, durationMinutes, exercises ──────

    const sendBlock = src.match(/sendStructuredWorkoutToWatch\(\{[\s\S]*?\}\)/)?.[0] ?? '';
    const hasId       = sendBlock.includes('id:');
    const hasName     = sendBlock.includes('name:');
    const hasDuration = sendBlock.includes('durationMinutes:');
    const hasExercises = sendBlock.includes('exercises:');
    if (hasId && hasName && hasDuration && hasExercises) {
      pass('PC-01', 'WorkoutDetail sends id, name, durationMinutes, exercises to Watch');
    } else {
      const missing = [
        !hasId && 'id', !hasName && 'name',
        !hasDuration && 'durationMinutes', !hasExercises && 'exercises',
      ].filter(Boolean).join(', ');
      fail('PC-01', 'WorkoutDetail sendStructuredWorkoutToWatch payload', `Missing fields: ${missing}`);
    }

    // ── PC-02: WorkoutDetail maps exercise fields correctly ──────────────────

    // Must map: id, name, sets (optional), reps (optional), durationSeconds (optional)
    // The ?? undefined pattern is important — passes undefined (omitted) not null (invalid)
    const hasExId   = sendBlock.includes('id: ex.id');
    const hasExName = sendBlock.includes('name: ex.title') || sendBlock.includes('name: ex.name');
    const hasSets   = sendBlock.includes('sets:') && sendBlock.includes('?? undefined');
    if (hasExId && hasExName && hasSets) {
      pass('PC-02', 'WorkoutDetail maps exercise id, name, sets with ?? undefined null-coalescing');
    } else {
      fail('PC-02', 'WorkoutDetail exercise mapping',
        `id=${hasExId} name=${hasExName} sets-with-??-undefined=${hasSets}`);
    }

    // ── PC-03: WorkoutDetail does NOT include restAfterSetSeconds in payload ──

    // rest fields are optional on WatchExercise but the DB exercises table
    // doesn't have a rest column; they must not be mapped to undefined via a
    // missing field (which would fail type narrowing on the Watch side).
    // Acceptable: field absent entirely, or explicitly set to undefined.
    // Fail: if src tries to read a non-existent db column like ex.rest_after_set.
    const badRest = sendBlock.includes('ex.rest_after_set') || sendBlock.includes('ex.restAfterSet');
    if (!badRest) {
      pass('PC-03', 'WorkoutDetail does not attempt to map non-existent rest columns from DB');
    } else {
      fail('PC-03', 'WorkoutDetail rest column mapping',
        'Found attempt to read ex.rest_after_set or ex.restAfterSet — column does not exist in DB');
    }
  } catch {
    fail('PC-01', 'WorkoutDetail payload', 'src/pages/WorkoutDetail.tsx not found');
    fail('PC-02', 'WorkoutDetail exercise mapping', 'File not found');
    fail('PC-03', 'WorkoutDetail rest columns', 'File not found');
  }

  // WorkoutPlayer — sendWorkoutToWatch payload
  try {
    const src = readSrc('pages/WorkoutPlayer.tsx');

    // ── PC-04: WorkoutPlayer sends id, name, durationMinutes, exercises ──────

    const sendBlock = src.match(/sendWorkoutToWatch\(\{[\s\S]*?\}\)/)?.[0] ?? '';
    const hasId       = sendBlock.includes('id:');
    const hasName     = sendBlock.includes('name:');
    const hasDuration = sendBlock.includes('durationMinutes:');
    const hasExercises = sendBlock.includes('exercises:');
    if (hasId && hasName && hasDuration && hasExercises) {
      pass('PC-04', 'WorkoutPlayer sends id, name, durationMinutes, exercises to Watch');
    } else {
      const missing = [
        !hasId && 'id', !hasName && 'name',
        !hasDuration && 'durationMinutes', !hasExercises && 'exercises',
      ].filter(Boolean).join(', ');
      fail('PC-04', 'WorkoutPlayer sendWorkoutToWatch payload', `Missing fields: ${missing}`);
    }

    // ── PC-05: WorkoutPlayer provides a durationMinutes fallback ─────────────

    // durationMinutes comes from DB but may be null — must have a fallback
    // (e.g. ?? 30) so the Watch always gets a number.
    if (sendBlock.includes('?? 30') || sendBlock.includes('|| 30')) {
      pass('PC-05', 'WorkoutPlayer provides ?? 30 fallback for durationMinutes (handles null DB value)');
    } else {
      fail('PC-05', 'WorkoutPlayer durationMinutes fallback',
        '?? 30 or || 30 not found — Watch may receive undefined for durationMinutes');
    }
  } catch {
    fail('PC-04', 'WorkoutPlayer payload', 'src/pages/WorkoutPlayer.tsx not found');
    fail('PC-05', 'WorkoutPlayer durationMinutes fallback', 'File not found');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — LOG-WATCH-WORKOUT EDGE FUNCTION
// ════════════════════════════════════════════════════════════════════════════

async function runLogWatchWorkoutTests() {
  section('LOG-WATCH-WORKOUT EDGE FUNCTION');

  if (!authToken) {
    for (const id of ['LWW-01','LWW-02','LWW-03','LWW-04','LWW-05','LWW-06']) {
      skip(id, 'log-watch-workout', 'No auth token — set TEST_EMAIL and TEST_PASSWORD');
    }
    return;
  }

  // ── LWW-01: rejects missing Authorization header (401) ───────────────────

  const noAuth = await fetch(`${FN_BASE}/log-watch-workout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ workoutId: 'test', durationSeconds: 60 }),
  });
  if (noAuth.status === 401) {
    pass('LWW-01', 'log-watch-workout returns 401 without Authorization header');
  } else {
    fail('LWW-01', 'log-watch-workout returns 401 without auth', `Got ${noAuth.status}`);
  }

  // ── LWW-02: rejects missing required fields (400) ─────────────────────────

  // workoutId and durationSeconds are both required
  const missingFields = await callFn('log-watch-workout', {
    workoutName: 'Test Workout',
    // intentionally omit workoutId and durationSeconds
  });
  if (missingFields.status === 400) {
    pass('LWW-02', 'log-watch-workout returns 400 when workoutId and durationSeconds are missing');
  } else {
    fail('LWW-02', 'log-watch-workout returns 400 for missing required fields',
      `Got ${missingFields.status}: ${JSON.stringify(missingFields.json)?.substring(0, 120)}`);
  }

  // ── LWW-03: rejects missing durationSeconds only (400) ───────────────────

  const missingDuration = await callFn('log-watch-workout', {
    workoutId: 'watch-test-only-id',
    // intentionally omit durationSeconds
  });
  if (missingDuration.status === 400) {
    pass('LWW-03', 'log-watch-workout returns 400 when only durationSeconds is missing');
  } else {
    fail('LWW-03', 'log-watch-workout returns 400 for missing durationSeconds',
      `Got ${missingDuration.status}: ${JSON.stringify(missingDuration.json)?.substring(0, 120)}`);
  }

  // ── LWW-04: accepts valid payload and returns { ok: true } ───────────────

  // Use a unique workoutId to avoid deduplication conflicts on re-runs
  const uniqueId = `qa-test-${Date.now()}`;
  const valid = await callFn('log-watch-workout', {
    workoutId: uniqueId,
    workoutName: 'QA Watch Test Workout',
    activityType: 'hiit',
    durationSeconds: 1800,
    calories: 250,
    averageHeartRate: 145,
    endedAt: new Date().toISOString(),
  });
  if (valid.status === 200 && valid.json?.ok === true) {
    pass('LWW-04', 'log-watch-workout accepts valid payload and returns { ok: true }');
  } else {
    fail('LWW-04', 'log-watch-workout accepts valid payload',
      `Got ${valid.status}: ${JSON.stringify(valid.json)?.substring(0, 120)}`);
  }

  // ── LWW-05: deduplication — submitting same workoutId twice is idempotent ─

  // The DB insert uses onConflict("user_id, source_platform, source_platform_id").ignore()
  // so a second insert with the same workoutId must succeed (not error) but not duplicate.
  const duplicate = await callFn('log-watch-workout', {
    workoutId: uniqueId, // same id as LWW-04
    workoutName: 'QA Watch Test Workout',
    durationSeconds: 1800,
    calories: 250,
    averageHeartRate: 145,
    endedAt: new Date().toISOString(),
  });
  if (duplicate.status === 200 && duplicate.json?.ok === true) {
    pass('LWW-05', 'log-watch-workout is idempotent — duplicate workoutId returns { ok: true } without error');
  } else {
    fail('LWW-05', 'log-watch-workout idempotent on duplicate workoutId',
      `Got ${duplicate.status}: ${JSON.stringify(duplicate.json)?.substring(0, 120)}`);
  }

  // ── LWW-06: optional fields are truly optional ────────────────────────────

  // calories, averageHeartRate, activityType, startedAt, endedAt are all optional.
  // Sending only the two required fields must succeed.
  const minimal = await callFn('log-watch-workout', {
    workoutId: `qa-test-minimal-${Date.now()}`,
    durationSeconds: 300,
    // everything else intentionally omitted
  });
  if (minimal.status === 200 && minimal.json?.ok === true) {
    pass('LWW-06', 'log-watch-workout succeeds with only required fields (calories/hr/activityType optional)');
  } else {
    fail('LWW-06', 'log-watch-workout optional fields',
      `Got ${minimal.status}: ${JSON.stringify(minimal.json)?.substring(0, 120)}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5 — LOG-WATCH-WORKOUT SOURCE AUDIT
// ════════════════════════════════════════════════════════════════════════════

async function runLogWatchWorkoutSourceAudit() {
  section('LOG-WATCH-WORKOUT SOURCE AUDIT');

  let src: string;
  try {
    src = readFileSync(
      '/Users/vanessa/hitt-app/supabase/functions/log-watch-workout/index.ts',
      'utf-8'
    );
  } catch {
    for (const id of ['LWWS-01','LWWS-02','LWWS-03','LWWS-04']) {
      fail(id, 'log-watch-workout source audit', 'supabase/functions/log-watch-workout/index.ts not found');
    }
    return;
  }

  // ── LWWS-01: deduplication conflict clause present ────────────────────────

  if (src.includes('.onConflict(') && src.includes('.ignore()')) {
    pass('LWWS-01', 'log-watch-workout uses .onConflict(...).ignore() for deduplication');
  } else {
    fail('LWWS-01', 'log-watch-workout deduplication clause',
      '.onConflict().ignore() not found — duplicate Watch workouts may cause DB errors');
  }

  // ── LWWS-02: inserts into activity_logs with source_platform = apple_watch ─

  if (src.includes('"activity_logs"') && src.includes('source_platform') && src.includes('"apple_watch"')) {
    pass('LWWS-02', 'log-watch-workout inserts into activity_logs with source_platform = "apple_watch"');
  } else {
    fail('LWWS-02', 'log-watch-workout activity_logs insert',
      'activity_logs table name, source_platform, or "apple_watch" value not found');
  }

  // ── LWWS-03: startedAt derived from durationSeconds when not provided ─────

  // When the Watch doesn't send startedAt, the function must derive it:
  // startedAt = endedAt - durationSeconds * 1000 (so the activity log has a valid range)
  if (src.includes('durationSeconds * 1000')) {
    pass('LWWS-03', 'log-watch-workout derives startedAt from durationSeconds when not provided');
  } else {
    fail('LWWS-03', 'log-watch-workout startedAt derivation',
      'durationSeconds * 1000 not found — startedAt may be missing when omitted from payload');
  }

  // ── LWWS-04: uses service role key for the insert (bypasses RLS) ─────────

  // The DB insert uses an admin client created from SUPABASE_SERVICE_ROLE_KEY
  // so RLS on activity_logs doesn't block the write.
  if (src.includes('SUPABASE_SERVICE_ROLE_KEY') && src.includes('createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')) {
    pass('LWWS-04', 'log-watch-workout uses service role key for DB insert (bypasses RLS)');
  } else {
    fail('LWWS-04', 'log-watch-workout uses service role key',
      'Admin client with SUPABASE_SERVICE_ROLE_KEY not found — DB insert may fail due to RLS');
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n\x1b[1m\x1b[37m HITT App — Apple Watch Integration Tests\x1b[0m');
  console.log(' ─────────────────────────────────────────');

  section('AUTHENTICATION');
  const authed = await authenticate();
  if (!authed && (TEST_EMAIL || TEST_PASSWORD)) {
    console.log('  \x1b[33m⚠\x1b[0m  Credentials provided but sign-in failed — edge function tests will be skipped.');
  } else if (!authed) {
    console.log('  \x1b[90mℹ\x1b[0m  No credentials — set TEST_EMAIL and TEST_PASSWORD to run edge function tests.');
    console.log('  \x1b[90m   Source audit tests run without credentials.\x1b[0m');
  }

  await runWatchPluginAudit();
  await runWatchEventHandlerAudit();
  await runPayloadConstructionAudit();
  await runLogWatchWorkoutSourceAudit();
  await runLogWatchWorkoutTests();

  // ── Summary ───────────────────────────────────────────────────────────────

  const passed  = results.filter(r => r.status === 'PASS').length;
  const failed  = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total   = results.length;

  console.log('\n\x1b[1m━━━  SUMMARY  ━━━\x1b[0m');
  console.log(`  Total:   ${total}`);
  console.log(`  \x1b[32mPassed:  ${passed}\x1b[0m`);
  if (failed > 0)  console.log(`  \x1b[31mFailed:  ${failed}\x1b[0m`);
  if (skipped > 0) console.log(`  \x1b[90mSkipped: ${skipped}\x1b[0m`);

  if (failed > 0) {
    console.log('\n\x1b[1m\x1b[31mFAILED TESTS:\x1b[0m');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`  \x1b[31m✗\x1b[0m  [${r.id}] ${r.label}`);
      if (r.note) console.log(`       \x1b[33m→ ${r.note}\x1b[0m`);
    }
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\x1b[31mUnhandled error:\x1b[0m', e);
  process.exit(1);
});
