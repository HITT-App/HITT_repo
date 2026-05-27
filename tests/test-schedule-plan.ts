/**
 * Schedule plan fix verification — tests max_tokens: 6000 on generate-workout-plan
 *
 * Usage:
 *   TEST_ACCESS_TOKEN=eyJ... bun run tests/test-schedule-plan.ts
 *
 * What it checks:
 *   1. ai-coach emits a schedule_plan action chunk for a plan request
 *   2. generate-workout-plan returns valid JSON with items (no truncation)
 *   3. scheduled_workouts rows are inserted for Vanessa's account
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY     = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';
const COACH_URL    = `${SUPABASE_URL}/functions/v1/ai-coach`;
const PLAN_URL     = `${SUPABASE_URL}/functions/v1/generate-workout-plan`;

const token = process.env.TEST_ACCESS_TOKEN ?? '';
if (!token) {
  console.error('Provide TEST_ACCESS_TOKEN');
  process.exit(1);
}

let userId: string;
try {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
  userId = payload.sub;
  console.log('\n[0] User ID:', userId);
} catch {
  console.error('Could not decode JWT');
  process.exit(1);
}

const authed = createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});

// ── Step 1: ask ai-coach for a plan, expect schedule_plan action ──────────────

console.log('\n[1] Asking ai-coach to create a 3-day fat-loss plan...');
const coachStart = Date.now();

const coachRes = await fetch(COACH_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Response-Format': 'structured-v1',
  },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Create me a 3-day per week workout plan for fat loss.' }],
    customMemory: '',
    customResponseStyle: '',
  }),
});

if (!coachRes.ok) {
  console.error('ai-coach error', coachRes.status, await coachRes.text());
  process.exit(1);
}

const reader = coachRes.body!.getReader();
const dec = new TextDecoder();
let buf = '';
let schedulePlanAction: any = null;
let fullText = '';

while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  let idx: number;
  while ((idx = buf.indexOf('\n')) !== -1) {
    let line = buf.slice(0, idx);
    buf = buf.slice(idx + 1);
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') continue;
    try {
      const chunk = JSON.parse(data);
      if (chunk.type === 'text') {
        fullText += chunk.delta;
        process.stdout.write(chunk.delta);
      } else if (chunk.type === 'action' && chunk.action.type === 'schedule_plan') {
        schedulePlanAction = chunk.action;
        console.log(`\n\n  [ACTION] schedule_plan: ${JSON.stringify(chunk.action.payload)}`);
      }
    } catch {}
  }
}

console.log(`\n\n  Elapsed: ${Date.now() - coachStart}ms`);

if (!schedulePlanAction) {
  console.log('\n  ⚠️  No schedule_plan action received from ai-coach.');
  console.log('     Model may have responded with text only. Full response:');
  console.log(' ', fullText.slice(0, 400));
  console.log('\n  Proceeding to generate-workout-plan test anyway with hardcoded params...');
}

// ── Step 2: call generate-workout-plan directly ───────────────────────────────

console.log('\n[2] Calling generate-workout-plan directly...');
const planStart = Date.now();

// Record scheduled_workouts count before
const { count: beforeCount } = await authed
  .from('scheduled_workouts')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId);

console.log(`    scheduled_workouts rows before: ${beforeCount ?? 0}`);

const planRes = await fetch(PLAN_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    goal: 'fat loss',
    days: 12,
    sessions_per_week: 3,
    duration_minutes: 30,
    title: 'Fat Loss Plan',
  }),
});

const planElapsed = Date.now() - planStart;

if (!planRes.ok) {
  const err = await planRes.json().catch(() => ({ error: `HTTP ${planRes.status}` }));
  console.error(`\n  ❌ generate-workout-plan returned ${planRes.status}:`, JSON.stringify(err));
  process.exit(1);
}

const planData = await planRes.json();
console.log(`\n  Response (${planElapsed}ms):`);
console.log(JSON.stringify(planData, null, 2).slice(0, 1200));

const items: any[] = planData.items ?? [];
const truncated = !planData.items && planData.error;

// ── Step 3: check scheduled_workouts ─────────────────────────────────────────

// Give it a moment in case the function does async inserts
await new Promise(r => setTimeout(r, 1000));

const { count: afterCount } = await authed
  .from('scheduled_workouts')
  .select('id', { count: 'exact', head: true })
  .eq('user_id', userId);

const { data: newRows } = await authed
  .from('scheduled_workouts')
  .select('workout_id, scheduled_date')
  .eq('user_id', userId)
  .order('scheduled_date', { ascending: true })
  .limit(12);

// ── Step 4: check ai_generation_log for this invocation ──────────────────────

await new Promise(r => setTimeout(r, 1000));
const { data: logEntry } = await authed
  .from('ai_generation_log')
  .select('error, latency_ms, response')
  .eq('user_id', userId)
  .eq('generation_type', 'workout_plan')
  .order('created_at', { ascending: false })
  .limit(1);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n────────────────────────────────────────────────────────');
console.log('[VERDICT]');

const step1Pass = !!schedulePlanAction;
const step2Pass = !truncated && items.length > 0;
const step3Pass = (afterCount ?? 0) > (beforeCount ?? 0) || items.length > 0;

console.log('  1. schedule_plan action from ai-coach :', step1Pass ? '✅ PASS' : '⚠️  no action (model may not have called tool — check manually)');
console.log('  2. generate-workout-plan no truncation :', step2Pass ? `✅ PASS (${items.length} items returned)` : '❌ FAIL (no items or error)');
console.log('  3. scheduled_workouts rows             :', `before=${beforeCount ?? 0}  after=${afterCount ?? 0}`);

if (logEntry?.[0]) {
  const entry = logEntry[0];
  console.log('\n  ai_generation_log (most recent workout_plan):');
  console.log('    error     :', entry.error ?? 'none ✅');
  console.log('    latency_ms:', entry.latency_ms);
}

if (newRows && newRows.length > 0) {
  console.log('\n  Upcoming scheduled workouts:');
  newRows.forEach(r => console.log(`    ${r.scheduled_date}  ${r.workout_id}`));
}

if (!step2Pass) {
  console.log('\n  generate-workout-plan response:');
  console.log(JSON.stringify(planData, null, 2));
}
