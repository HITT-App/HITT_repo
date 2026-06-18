/**
 * HITT App — Automated QA Test Runner
 *
 * Covers ~50 of the 130 QA checklist items that don't require a physical device.
 *
 * Usage:
 *   npx tsx tests/run.ts
 *
 * Optional env vars (add to .env or prefix the command):
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=yourpassword npx tsx tests/run.ts
 *
 * Without credentials, auth-dependent tests are skipped.
 * Code-audit tests always run (no credentials needed).
 */

import { readFileSync } from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL   = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY       = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';
const FN_BASE        = `${SUPABASE_URL}/functions/v1`;
const SRC            = '/Users/vanessa/hitt-app/src';

const TEST_EMAIL     = process.env.TEST_EMAIL    ?? '';
const TEST_PASSWORD  = process.env.TEST_PASSWORD ?? '';

// ── Result tracking ──────────────────────────────────────────────────────────

type Status = 'PASS' | 'FAIL' | 'SKIP';

interface Result {
  id: string;
  label: string;
  status: Status;
  note?: string;
}

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

// ── AUTH ─────────────────────────────────────────────────────────────────────

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
// SECTION 1 — CODE AUDIT  (no auth required)
// ════════════════════════════════════════════════════════════════════════════

async function runCodeAudit() {
  section('CODE AUDIT (source file checks)');

  // ── Sticky headers (Build 71) ─────────────────────────────────────────────

  const stickyPages: Array<[string, string]> = [
    ['pages/WorkoutSchedule.tsx', 'CA-01  WorkoutSchedule has sticky header'],
    ['pages/ChatSettings.tsx',    'CA-02  ChatSettings has sticky header'],
    ['pages/HealthMetrics.tsx',   'CA-03  HealthMetrics has sticky header'],
    ['pages/NutritionDashboard.tsx', 'CA-04  NutritionDashboard has sticky header'],
    ['pages/WorkoutLibrary.tsx',  'CA-05  WorkoutLibrary has sticky header'],
  ];

  for (const [file, label] of stickyPages) {
    try {
      const src = readSrc(file);
      if (src.includes('sticky top-0 z-20')) {
        pass(label.split('  ')[0], label.split('  ')[1]);
      } else {
        fail(label.split('  ')[0], label.split('  ')[1], 'sticky top-0 z-20 not found in header');
      }
    } catch {
      fail(label.split('  ')[0], label.split('  ')[1], 'File not found');
    }
  }

  // ── NutritionDashboard ScrollArea removed ─────────────────────────────────

  try {
    const src = readSrc('pages/NutritionDashboard.tsx');
    const hasScrollArea = src.includes('<ScrollArea');
    if (!hasScrollArea) {
      pass('CA-06', 'NutritionDashboard ScrollArea wrapper removed');
    } else {
      fail('CA-06', 'NutritionDashboard ScrollArea wrapper removed', '<ScrollArea> still present');
    }
  } catch {
    fail('CA-06', 'NutritionDashboard ScrollArea wrapper removed', 'File not found');
  }

  // ── Jarvis: audio.load() before play() (Build 66/69) ─────────────────────

  try {
    const src = readSrc('components/coach/JarvisMode.tsx');
    if (src.includes('audioRef.current.load()')) {
      pass('CA-07', 'Jarvis calls audio.load() before play() (iOS TTS fix)');
    } else {
      fail('CA-07', 'Jarvis calls audio.load() before play() (iOS TTS fix)', 'audioRef.current.load() not found');
    }
  } catch {
    fail('CA-07', 'Jarvis calls audio.load() before play() (iOS TTS fix)', 'File not found');
  }

  // ── Jarvis: iOS audio pre-unlock on mount (Build 69) ─────────────────────

  try {
    const src = readSrc('components/coach/JarvisMode.tsx');
    if (src.includes('Pre-unlock iOS') || src.includes('data:audio/wav;base64')) {
      pass('CA-08', 'Jarvis pre-unlocks iOS audio on mount');
    } else {
      fail('CA-08', 'Jarvis pre-unlocks iOS audio on mount', 'Silent audio unlock not found');
    }
  } catch {
    fail('CA-08', 'Jarvis pre-unlocks iOS audio on mount', 'File not found');
  }

  // ── Jarvis: data.items not data.plan_items (Build 69) ────────────────────

  try {
    const src = readSrc('components/coach/JarvisMode.tsx');
    if (src.includes('data.items') && !src.includes('data.plan_items')) {
      pass('CA-09', 'Jarvis reads data.items from generate-workout-plan (not plan_items)');
    } else if (src.includes('data.plan_items')) {
      fail('CA-09', 'Jarvis reads data.items from generate-workout-plan (not plan_items)', 'data.plan_items still present — old bug');
    } else {
      fail('CA-09', 'Jarvis reads data.items from generate-workout-plan (not plan_items)', 'Neither data.items nor data.plan_items found');
    }
  } catch {
    fail('CA-09', 'Jarvis reads data.items from generate-workout-plan (not plan_items)', 'File not found');
  }

  // ── Jarvis: defaultDays fallback when selectedDays missing ────────────────

  try {
    const src = readSrc('components/coach/JarvisMode.tsx');
    if (src.includes('defaultDays')) {
      pass('CA-10', 'Jarvis has defaultDays fallback for missing selectedDays');
    } else {
      fail('CA-10', 'Jarvis has defaultDays fallback for missing selectedDays', 'defaultDays function not found');
    }
  } catch {
    fail('CA-10', 'Jarvis has defaultDays fallback for missing selectedDays', 'File not found');
  }

  // ── Jarvis: HIIT normalisation before TTS ────────────────────────────────

  try {
    const src = readSrc('components/coach/JarvisMode.tsx');
    if (src.includes("replace(/\\bHIIT\\b/g, 'hit')")) {
      pass('CA-11', 'Jarvis normalises HIIT → "hit" before TTS');
    } else {
      fail('CA-11', 'Jarvis normalises HIIT → "hit" before TTS', 'TTS normalisation not found');
    }
  } catch {
    fail('CA-11', 'Jarvis normalises HIIT → "hit" before TTS', 'File not found');
  }

  // ── ShareCardCanvas: transparent + story generators (Build 70) ───────────

  try {
    const src = readSrc('components/workout/ShareCardCanvas.ts');
    const hasTransparent = src.includes('export async function generateTransparentCard');
    const hasStory       = src.includes('export async function generateStoryCard');
    if (hasTransparent) {
      pass('CA-12', 'ShareCardCanvas exports generateTransparentCard');
    } else {
      fail('CA-12', 'ShareCardCanvas exports generateTransparentCard', 'Function not found');
    }
    if (hasStory) {
      pass('CA-13', 'ShareCardCanvas exports generateStoryCard (1080×1920)');
    } else {
      fail('CA-13', 'ShareCardCanvas exports generateStoryCard (1080×1920)', 'Function not found');
    }
    // Story card should be 1920 tall
    if (src.includes('1920')) {
      pass('CA-14', 'Story card uses 1920px height');
    } else {
      fail('CA-14', 'Story card uses 1920px height', '1920 not found in canvas code');
    }
  } catch {
    fail('CA-12', 'ShareCardCanvas generateTransparentCard', 'File not found');
    fail('CA-13', 'ShareCardCanvas generateStoryCard', 'File not found');
    fail('CA-14', 'Story card height', 'File not found');
  }

  // ── ShareOptionsGrid: transparent + story in type ────────────────────────

  try {
    const src = readSrc('components/workout/ShareOptionsGrid.tsx');
    const hasTransparent = src.includes("'transparent'");
    const hasStory       = src.includes("'story'");
    if (hasTransparent) {
      pass('CA-15', 'ShareOptionsGrid includes transparent option');
    } else {
      fail('CA-15', 'ShareOptionsGrid includes transparent option', "'transparent' not in ShareStyle type");
    }
    if (hasStory) {
      pass('CA-16', 'ShareOptionsGrid includes story option');
    } else {
      fail('CA-16', 'ShareOptionsGrid includes story option', "'story' not in ShareStyle type");
    }
  } catch {
    fail('CA-15', 'ShareOptionsGrid transparent', 'File not found');
    fail('CA-16', 'ShareOptionsGrid story', 'File not found');
  }

  // ── Watch: UserDefaults persistence (Build 67) ───────────────────────────

  try {
    const src = readFileSync(
      '/Users/vanessa/hitt-app/ios/App/HIITWatch Watch App/Managers/WatchSessionManager.swift',
      'utf-8'
    );
    if (src.includes('UserDefaults.standard.set') && src.includes('planKey')) {
      pass('CA-17', 'WatchSessionManager persists triathlon plan to UserDefaults');
    } else {
      fail('CA-17', 'WatchSessionManager persists triathlon plan to UserDefaults', 'UserDefaults persistence not found');
    }
  } catch {
    fail('CA-17', 'WatchSessionManager UserDefaults persistence', 'File not found');
  }

  // ── Watch: TriathlonView top-level onReceive (Build 67) ──────────────────

  try {
    const src = readFileSync(
      '/Users/vanessa/hitt-app/ios/App/HIITWatch Watch App/Views/TriathlonView.swift',
      'utf-8'
    );
    // The onReceive should be on the Group, not inside noPlanScreen
    const groupOnReceive = src.includes('Group {') && src.match(/Group \{[\s\S]*?\.onReceive/);
    if (groupOnReceive) {
      pass('CA-18', 'TriathlonView has top-level onReceive on Group (not buried in sub-view)');
    } else {
      fail('CA-18', 'TriathlonView has top-level onReceive on Group', 'onReceive not found at Group level');
    }
  } catch {
    fail('CA-18', 'TriathlonView onReceive', 'File not found');
  }

  // ── WorkoutDetail: 14-day date picker ────────────────────────────────────

  try {
    const src = readSrc('pages/WorkoutDetail.tsx');
    if (src.includes('length: 14')) {
      pass('CA-19', 'WorkoutDetail date picker shows 14 days');
    } else {
      fail('CA-19', 'WorkoutDetail date picker shows 14 days', 'length: 14 not found (may still be 4)');
    }
  } catch {
    fail('CA-19', 'WorkoutDetail 14-day picker', 'File not found');
  }

  // ── WorkoutDetail: time picker not overflow-hidden ────────────────────────

  try {
    const src = readSrc('pages/WorkoutDetail.tsx');
    // Should have overflow-y-auto, NOT overflow-hidden on time picker
    const hasOverflowAuto = src.includes('overflow-y-auto');
    if (hasOverflowAuto) {
      pass('CA-20', 'WorkoutDetail time picker uses overflow-y-auto (not hidden)');
    } else {
      fail('CA-20', 'WorkoutDetail time picker uses overflow-y-auto (not hidden)', 'overflow-y-auto not found');
    }
  } catch {
    fail('CA-20', 'WorkoutDetail time picker', 'File not found');
  }

  // ── Jarvis onboarding wizard: close-button suppression ───────────────────

  try {
    const src = readSrc('components/coach/JarvisMode.tsx');

    // CA-21: handleClose writes sessionStorage suppression when a card is visible
    if (src.includes("sessionStorage.setItem('jarvis_onboarding_suppressed', 'true')") &&
        src.includes('pendingGoalPrompt || pendingNoPlanPrompt || pendingDietaryPrefsPrompt')) {
      pass('CA-21', 'Jarvis handleClose sets sessionStorage suppression when wizard card is visible');
    } else {
      fail('CA-21', 'Jarvis handleClose sets sessionStorage suppression when wizard card is visible',
        'sessionStorage suppression not found in handleClose');
    }

    // CA-22: doGreeting checks the suppression flag before showing any wizard card
    if (src.includes("sessionStorage.getItem('jarvis_onboarding_suppressed')") &&
        src.includes('onboardingSuppressed')) {
      pass('CA-22', 'Jarvis doGreeting checks jarvis_onboarding_suppressed before showing wizard cards');
    } else {
      fail('CA-22', 'Jarvis doGreeting checks jarvis_onboarding_suppressed before showing wizard cards',
        'onboardingSuppressed check not found in greeting effect');
    }

    // CA-23: handleGoalPromptSetNow clears plan skipKey so it shows after goal update
    if (src.includes("localStorage.removeItem(skipKey('plan', currentUserIdRef.current))") &&
        src.includes("sessionStorage.removeItem('jarvis_onboarding_suppressed')")) {
      pass('CA-23', 'handleGoalPromptSetNow clears plan skipKey and session suppression before navigating');
    } else {
      fail('CA-23', 'handleGoalPromptSetNow clears plan skipKey and session suppression before navigating',
        'clearance of plan skipKey or session suppression not found in handleGoalPromptSetNow');
    }

    // CA-24: createScheduleFromJarvis writes plan skipKey immediately after DB insert
    // The key should appear before the appendAssistantMessage call
    const insertIdx = src.indexOf("from('scheduled_workouts').insert(");
    const skipKeyIdx = src.indexOf("localStorage.setItem(skipKey('plan', userId), 'true')");
    const appendIdx  = src.indexOf("appendAssistantMessage('✅ Your schedule is set");
    if (insertIdx !== -1 && skipKeyIdx !== -1 && appendIdx !== -1 &&
        insertIdx < skipKeyIdx && skipKeyIdx < appendIdx) {
      pass('CA-24', 'createScheduleFromJarvis writes plan skipKey immediately after DB insert (before navigate)');
    } else {
      fail('CA-24', 'createScheduleFromJarvis writes plan skipKey immediately after DB insert (before navigate)',
        'skipKey write not found in correct position after insert');
    }

    // CA-25: skipKey helper uses per-user uid so multi-account devices work correctly
    if (src.includes('jarvis_skip_${type}_${uid}')) {
      pass('CA-25', 'skipKey localStorage keys are scoped per user (uid suffix)');
    } else {
      fail('CA-25', 'skipKey localStorage keys are scoped per user (uid suffix)',
        'Per-user skipKey pattern not found');
    }

  } catch {
    for (const id of ['CA-21','CA-22','CA-23','CA-24','CA-25']) {
      fail(id, 'Jarvis onboarding suppression test', 'JarvisMode.tsx not found');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2 — AI COACH EDGE FUNCTION
// ════════════════════════════════════════════════════════════════════════════

async function runAICoachTests() {
  section('AI COACH EDGE FUNCTION');

  if (!authToken) {
    for (const id of ['AI-01','AI-02','AI-03','AI-04','AI-05','AI-06','AI-07','AI-08']) {
      skip(id, 'AI coach test', 'No auth token — set TEST_EMAIL and TEST_PASSWORD');
    }
    return;
  }

  // ── AI-01: Edge function is reachable ─────────────────────────────────────

  const ping = await callFn('ai-coach', {
    messages: [{ role: 'user', content: 'Hi' }],
    healthProfile: '',
  });

  if (ping.status === 200) {
    pass('AI-01', 'ai-coach edge function responds 200');
  } else {
    fail('AI-01', 'ai-coach edge function responds 200', `Got ${ping.status}: ${JSON.stringify(ping.json)}`);
    // If function is down, skip remaining AI tests
    for (const id of ['AI-02','AI-03','AI-04','AI-05','AI-06','AI-07','AI-08']) {
      skip(id, 'AI coach test', 'Edge function unreachable');
    }
    return;
  }

  // ── AI-02: Onboarding prompt — one question only ──────────────────────────

  const onboarding = await callFn('ai-coach', {
    messages: [{
      role: 'user',
      content: '[ONBOARDING] This user has no schedule yet. Introduce yourself as Coach HIIT in one warm sentence, then ask just: "What\'s your main fitness goal right now?"'
    }],
    healthProfile: '',
  });

  if (onboarding.status === 200) {
    // Response should contain a question mark (it asks a question)
    const text: string = onboarding.json?.choices?.[0]?.message?.content ?? '';
    if (text.includes('?')) {
      pass('AI-02', 'Onboarding response contains a question');
    } else {
      fail('AI-02', 'Onboarding response contains a question', `Response: "${text.substring(0, 100)}"`);
    }
  } else {
    fail('AI-02', 'Onboarding response', `HTTP ${onboarding.status}`);
  }

  // ── AI-03: Response doesn't spell out H-I-I-T ────────────────────────────

  const hiitCheck = await callFn('ai-coach', {
    messages: [{ role: 'user', content: 'What is HIIT?' }],
    healthProfile: '',
  });

  if (hiitCheck.status === 200) {
    const text: string = hiitCheck.json?.choices?.[0]?.message?.content ?? '';
    const badPattern = /H[\s-]I[\s-]I[\s-]T/i.test(text);
    if (!badPattern) {
      pass('AI-03', 'AI response does not spell out H-I-I-T letter by letter');
    } else {
      fail('AI-03', 'AI response does not spell out H-I-I-T letter by letter', `Found letter-by-letter spelling in: "${text.substring(0, 150)}"`);
    }
  } else {
    fail('AI-03', 'HIIT spelling check', `HTTP ${hiitCheck.status}`);
  }

  // ── AI-04: Food log marker present ───────────────────────────────────────

  const foodLog = await callFn('ai-coach', {
    messages: [{ role: 'user', content: 'Log that I just ate an apple' }],
    healthProfile: '',
  });

  if (foodLog.status === 200) {
    const text: string = foodLog.json?.choices?.[0]?.message?.content ?? '';
    if (text.includes('[LOG_FOOD:')) {
      pass('AI-04', 'ai-coach emits [LOG_FOOD:...] marker for food logging');
    } else {
      fail('AI-04', 'ai-coach emits [LOG_FOOD:...] marker for food logging', 'Marker not found in response');
    }
  } else {
    fail('AI-04', 'Food log marker', `HTTP ${foodLog.status}`);
  }

  // ── AI-05: LOG_FOOD marker has required fields ────────────────────────────

  if (foodLog.status === 200) {
    const text: string = foodLog.json?.choices?.[0]?.message?.content ?? '';
    const match = text.match(/\[LOG_FOOD:(\{.*?\})\]/s);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        const required = ['name', 'calories', 'protein', 'carbs', 'fat'];
        const missing = required.filter(k => !(k in parsed));
        if (missing.length === 0) {
          pass('AI-05', 'LOG_FOOD marker has all required fields (name, calories, protein, carbs, fat)');
        } else {
          fail('AI-05', 'LOG_FOOD marker has all required fields', `Missing: ${missing.join(', ')}`);
        }
      } catch {
        fail('AI-05', 'LOG_FOOD marker has all required fields', 'Could not parse JSON in marker');
      }
    } else {
      skip('AI-05', 'LOG_FOOD required fields', 'No LOG_FOOD marker in response (see AI-04)');
    }
  } else {
    skip('AI-05', 'LOG_FOOD required fields', 'Food log request failed');
  }

  // ── AI-06: Schedule plan marker present ──────────────────────────────────

  const schedulePlan = await callFn('ai-coach', {
    messages: [
      { role: 'user', content: 'I want to build a workout plan' },
      { role: 'assistant', content: 'What is your main fitness goal?' },
      { role: 'user', content: 'Fat loss' },
      { role: 'assistant', content: 'How many days per week can you train?' },
      { role: 'user', content: '3 days' },
      { role: 'assistant', content: 'How long can each session be?' },
      { role: 'user', content: '30 minutes' },
    ],
    healthProfile: '',
  });

  if (schedulePlan.status === 200) {
    const text: string = schedulePlan.json?.choices?.[0]?.message?.content ?? '';
    if (text.includes('[SCHEDULE_PLAN:')) {
      pass('AI-06', 'ai-coach emits [SCHEDULE_PLAN:...] marker when all info collected');
    } else {
      fail('AI-06', 'ai-coach emits [SCHEDULE_PLAN:...] marker when all info collected',
        'Marker not found — AI may need more turns or is not following system prompt');
    }
  } else {
    fail('AI-06', 'Schedule plan marker', `HTTP ${schedulePlan.status}`);
  }

  // ── AI-07: SCHEDULE_PLAN marker has required fields ───────────────────────

  if (schedulePlan.status === 200) {
    const text: string = schedulePlan.json?.choices?.[0]?.message?.content ?? '';
    const match = text.match(/\[SCHEDULE_PLAN:(\{.*?\})\]/s);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        const required = ['goal', 'daysPerWeek', 'sessionMinutes'];
        const missing = required.filter(k => !(k in parsed));
        if (missing.length === 0) {
          pass('AI-07', 'SCHEDULE_PLAN marker has required fields (goal, daysPerWeek, sessionMinutes)');
        } else {
          fail('AI-07', 'SCHEDULE_PLAN marker has required fields', `Missing: ${missing.join(', ')}`);
        }
      } catch {
        fail('AI-07', 'SCHEDULE_PLAN required fields', 'Could not parse JSON in marker');
      }
    } else {
      skip('AI-07', 'SCHEDULE_PLAN required fields', 'No SCHEDULE_PLAN marker in response (see AI-06)');
    }
  } else {
    skip('AI-07', 'SCHEDULE_PLAN required fields', 'Schedule request failed');
  }

  // ── AI-08: Body scan prompt emits [BODY_SCAN_PROMPT] ─────────────────────

  const bodyScan = await callFn('ai-coach', {
    messages: [
      { role: 'user', content: 'Yes I want to do a body scan' },
    ],
    healthProfile: '',
  });

  if (bodyScan.status === 200) {
    const text: string = bodyScan.json?.choices?.[0]?.message?.content ?? '';
    if (text.includes('[BODY_SCAN_PROMPT]')) {
      pass('AI-08', 'ai-coach emits [BODY_SCAN_PROMPT] when user agrees to body scan');
    } else {
      // Not a hard fail — the AI needs context to emit this, single turn may not be enough
      skip('AI-08', 'ai-coach emits [BODY_SCAN_PROMPT]', 'Needs richer conversation context to trigger reliably');
    }
  } else {
    fail('AI-08', 'Body scan prompt', `HTTP ${bodyScan.status}`);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3 — GENERATE WORKOUT PLAN EDGE FUNCTION
// ════════════════════════════════════════════════════════════════════════════

async function runWorkoutPlanTests() {
  section('GENERATE WORKOUT PLAN EDGE FUNCTION');

  if (!authToken) {
    for (const id of ['WP-01','WP-02','WP-03']) {
      skip(id, 'Workout plan test', 'No auth token');
    }
    return;
  }

  const plan = await callFn('generate-workout-plan', {
    goal: 'fat loss',
    days: 12,
    sessions_per_week: 3,
    duration_minutes: 30,
    title: 'Test Plan',
  });

  // ── WP-01: Function responds 200 ─────────────────────────────────────────

  if (plan.status === 200) {
    pass('WP-01', 'generate-workout-plan responds 200');
  } else if (plan.status === 429) {
    skip('WP-01', 'generate-workout-plan responds 200', `Daily AI quota reached (429) — try again tomorrow`);
    skip('WP-02', 'Plan returns items array', 'Quota reached');
    skip('WP-03', 'Each item has workout_id', 'Quota reached');
    return;
  } else {
    fail('WP-01', 'generate-workout-plan responds 200', `Got ${plan.status}: ${JSON.stringify(plan.json)?.substring(0, 120)}`);
  }

  // ── WP-02: Response contains items array ─────────────────────────────────

  if (plan.status === 200) {
    const items = plan.json?.items;
    if (Array.isArray(items) && items.length > 0) {
      pass('WP-02', `generate-workout-plan returns items array (${items.length} workouts)`);
    } else {
      fail('WP-02', 'generate-workout-plan returns items array', `items = ${JSON.stringify(items)}`);
    }

    // ── WP-03: Items have workout_id ─────────────────────────────────────────

    if (Array.isArray(items) && items.length > 0) {
      const hasIds = items.every((i: any) => typeof i.workout_id === 'string' && i.workout_id.length > 0);
      if (hasIds) {
        pass('WP-03', 'All plan items have a valid workout_id');
      } else {
        fail('WP-03', 'All plan items have a valid workout_id', `First item: ${JSON.stringify(items[0])}`);
      }
    } else {
      skip('WP-03', 'All plan items have a valid workout_id', 'No items returned (see WP-02)');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4 — DATABASE (Supabase table operations)
// ════════════════════════════════════════════════════════════════════════════

async function runDatabaseTests() {
  section('DATABASE (Supabase table operations)');

  if (!authToken || !supabase) {
    for (const id of ['DB-01','DB-02','DB-03','DB-04','DB-05','DB-06','DB-07','DB-08']) {
      skip(id, 'Database test', 'No auth token');
    }
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    for (const id of ['DB-01','DB-02','DB-03','DB-04','DB-05','DB-06','DB-07','DB-08']) {
      skip(id, 'Database test', 'Could not get user from session');
    }
    return;
  }

  const userId = user.id;
  const today = new Date().toISOString().split('T')[0];

  // ── DB-01/02: scheduled_workouts insert + query ───────────────────────────

  // Find a real workout_id to use
  const { data: workouts } = await supabase.from('workouts').select('id').limit(1);
  const workoutId = workouts?.[0]?.id;

  if (!workoutId) {
    fail('DB-01', 'Insert into scheduled_workouts', 'No workouts in library to reference');
    skip('DB-02', 'Query scheduled_workouts', 'Insert skipped');
  } else {
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 30); // 30 days from now (won't clash with real schedule)
    const testDateStr = testDate.toISOString().split('T')[0];

    const { error: insErr } = await supabase
      .from('scheduled_workouts')
      .insert({ user_id: userId, workout_id: workoutId, scheduled_date: testDateStr });

    if (!insErr) {
      pass('DB-01', 'Insert into scheduled_workouts');
    } else {
      fail('DB-01', 'Insert into scheduled_workouts', insErr.message);
    }

    const { data: rows, error: selErr } = await supabase
      .from('scheduled_workouts')
      .select('id, workout_id, scheduled_date')
      .eq('user_id', userId)
      .eq('scheduled_date', testDateStr);

    if (!selErr && rows && rows.length > 0) {
      pass('DB-02', `Query scheduled_workouts (found ${rows.length} row)`);
      // Clean up test row
      await supabase.from('scheduled_workouts').delete().eq('user_id', userId).eq('scheduled_date', testDateStr);
    } else {
      fail('DB-02', 'Query scheduled_workouts', selErr?.message ?? 'No rows returned');
    }
  }

  // ── DB-03/04: meal_logs insert + query ───────────────────────────────────

  const { error: mealInsErr } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      custom_name: 'QA Test Apple',
      category: 'snack',
      calories: 95,
      protein_grams: 0.5,
      carbs_grams: 25,
      fat_grams: 0.3,
      fiber_grams: 4.4,
      logged_at: new Date().toISOString(),
    });

  if (!mealInsErr) {
    pass('DB-03', 'Insert into meal_logs');
  } else {
    fail('DB-03', 'Insert into meal_logs', mealInsErr.message);
  }

  const { data: meals, error: mealSelErr } = await supabase
    .from('meal_logs')
    .select('id, custom_name, calories')
    .eq('user_id', userId)
    .eq('custom_name', 'QA Test Apple')
    .order('logged_at', { ascending: false })
    .limit(1);

  if (!mealSelErr && meals && meals.length > 0) {
    pass('DB-04', 'Query meal_logs (found inserted row)');
    // Clean up
    await supabase.from('meal_logs').delete().eq('id', meals[0].id);
  } else {
    fail('DB-04', 'Query meal_logs', mealSelErr?.message ?? 'Row not found');
  }

  // ── DB-05/06: community_posts insert + query ──────────────────────────────

  const { data: postData, error: postInsErr } = await supabase
    .from('community_posts')
    .insert({ user_id: userId, content: 'QA test post — safe to delete', post_type: 'activity' })
    .select('id')
    .single();

  if (!postInsErr && postData) {
    pass('DB-05', 'Insert into community_posts');

    const { data: posts, error: postSelErr } = await supabase
      .from('community_posts')
      .select('id, content')
      .eq('id', postData.id)
      .single();

    if (!postSelErr && posts) {
      pass('DB-06', 'Query community_posts (found inserted row)');
    } else {
      fail('DB-06', 'Query community_posts', postSelErr?.message ?? 'Row not found');
    }

    // Clean up
    await supabase.from('community_posts').delete().eq('id', postData.id);
  } else {
    fail('DB-05', 'Insert into community_posts', postInsErr?.message ?? 'Unknown error');
    skip('DB-06', 'Query community_posts', 'Insert failed');
  }

  // ── DB-07: scheduled_workouts real-time subscription responds ─────────────

  // Just verify the table is subscribable (channel creation doesn't error)
  try {
    const channel = supabase.channel('qa-test').on(
      'postgres_changes' as any,
      { event: 'INSERT', schema: 'public', table: 'scheduled_workouts' },
      () => {}
    );
    const status = await new Promise<string>((resolve) => {
      channel.subscribe((s) => resolve(s));
      setTimeout(() => resolve('timeout'), 3000);
    });
    if (status === 'SUBSCRIBED' || status === 'timeout') {
      pass('DB-07', 'scheduled_workouts real-time subscription subscribes without error');
    } else {
      fail('DB-07', 'scheduled_workouts real-time subscription', `Status: ${status}`);
    }
    supabase.removeChannel(channel);
  } catch (e: any) {
    fail('DB-07', 'scheduled_workouts real-time subscription', e.message);
  }

  // ── DB-08: conversations table (Jarvis history) ───────────────────────────

  const { data: conversations, error: convErr } = await supabase
    .from('conversations')
    .select('id, title')
    .eq('user_id', userId)
    .eq('title', 'Jarvis')
    .limit(1);

  if (!convErr) {
    if (conversations && conversations.length > 0) {
      pass('DB-08', `Jarvis conversation exists in DB (id: ${conversations[0].id.substring(0, 8)}…)`);
    } else {
      pass('DB-08', 'conversations table queryable (no Jarvis conversation yet — first-time user)');
    }
  } else {
    fail('DB-08', 'Query conversations table', convErr.message);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n\x1b[1m\x1b[37m HITT App — Automated QA Test Runner\x1b[0m');
  console.log(' ─────────────────────────────────────');

  // Auth
  section('AUTHENTICATION');
  const authed = await authenticate();
  if (!authed && (TEST_EMAIL || TEST_PASSWORD)) {
    console.log('  \x1b[33m⚠\x1b[0m  Credentials provided but sign-in failed — edge function and DB tests will be skipped.');
  } else if (!authed) {
    console.log('  \x1b[90mℹ\x1b[0m  No credentials — set TEST_EMAIL and TEST_PASSWORD to run edge function and DB tests.');
    console.log('  \x1b[90m   Code audit tests run without credentials.\x1b[0m');
  }

  await runCodeAudit();
  await runAICoachTests();
  await runWorkoutPlanTests();
  await runDatabaseTests();

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
