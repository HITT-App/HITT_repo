/**
 * 5B verification test — structured SSE streaming + LOG_FOOD write
 *
 * Usage (pre-obtained token — recommended for OAuth users):
 *   TEST_ACCESS_TOKEN=eyJ... bun run tests/test-structured.ts
 *
 * Usage (email/password fallback):
 *   TEST_EMAIL=you@example.com TEST_PASSWORD=yourpass bun run tests/test-structured.ts
 *
 * What it checks:
 *   1. Edge function accepts X-Response-Format: structured-v1
 *   2. Text chunks arrive in real-time (streaming works)
 *   3. Tool calls arrive as action chunks (streaming + tools works)
 *   4. LOG_FOOD action was emitted as a structured action chunk
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL    = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY        = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';
const FN_URL          = `${SUPABASE_URL}/functions/v1/ai-coach`;

const TEST_ACCESS_TOKEN = process.env.TEST_ACCESS_TOKEN ?? '';
const TEST_EMAIL        = process.env.TEST_EMAIL        ?? '';
const TEST_PASSWORD     = process.env.TEST_PASSWORD     ?? '';

const LOG_FOOD_MSG = 'I just ate a chicken caesar salad, can you log it?';

async function main() {
  const supabase = createClient(SUPABASE_URL, ANON_KEY);

  let token: string;
  let userId: string;

  if (TEST_ACCESS_TOKEN) {
    // ── Pre-obtained token path (OAuth users) ───────────────────────────────
    token = TEST_ACCESS_TOKEN;
    // Decode the user ID from the JWT without a library — it's base64url in segment 1
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
      userId = payload.sub;
      console.log('\n[1] Using provided access token. User ID:', userId);
    } catch {
      console.error('Could not decode JWT. Make sure TEST_ACCESS_TOKEN is a valid Supabase JWT.');
      process.exit(1);
    }
  } else if (TEST_EMAIL && TEST_PASSWORD) {
    // ── Email/password path (fallback) ──────────────────────────────────────
    console.log('\n[1] Signing in as', TEST_EMAIL);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    if (authError || !authData.session) {
      console.error('Auth failed:', authError?.message);
      process.exit(1);
    }
    token  = authData.session.access_token;
    userId = authData.session.user.id;
    console.log('Signed in. User ID:', userId);
  } else {
    console.error(
      'Provide either TEST_ACCESS_TOKEN or TEST_EMAIL + TEST_PASSWORD.\n' +
      'OAuth users: see instructions for getting the token from localStorage.'
    );
    process.exit(1);
  }

  // Use an authenticated client for DB queries so RLS allows the read
  const authedSupabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // ── Fetch first meal_logs row before the test ─────────────────────────────
  const { data: before } = await authedSupabase
    .from('meal_logs')
    .select('id, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(1);
  const beforeId = before?.[0]?.id ?? null;
  console.log('[Before] Most recent meal_logs row id:', beforeId ?? '(none)');

  // ── Call edge function with structured header ─────────────────────────────
  console.log('\n[2] Sending to ai-coach with X-Response-Format: structured-v1');
  console.log('    Message:', LOG_FOOD_MSG);

  const startMs = Date.now();
  const response = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Response-Format': 'structured-v1',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: LOG_FOOD_MSG }],
      customMemory: '',
      customResponseStyle: '',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Edge function error', response.status, err);
    process.exit(1);
  }

  console.log('\n[3] Streaming response — each SSE chunk printed as it arrives:\n');

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let textChunkCount = 0;
  let actionChunkCount = 0;
  let firstChunkMs: number | null = null;
  const actions: any[] = [];
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;

      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const chunk = JSON.parse(data);

        if (chunk.type === 'text') {
          if (firstChunkMs === null) firstChunkMs = Date.now();
          textChunkCount++;
          fullText += chunk.delta;
          process.stdout.write(chunk.delta);   // stream text live
        } else if (chunk.type === 'action') {
          actionChunkCount++;
          actions.push(chunk.action);
          process.stdout.write('\n');
          console.log(`\n  [ACTION] type=${chunk.action.type}  payload=${JSON.stringify(chunk.action.payload ?? {})}`);
        } else if (chunk.type === 'done') {
          // explicit done chunk
        }
      } catch {
        // malformed chunk
      }
    }
  }

  const elapsed = Date.now() - startMs;
  console.log('\n\n────────────────────────────────────────────────────────');
  console.log('[Stream summary]');
  console.log('  Total elapsed :', elapsed, 'ms');
  console.log('  First chunk   :', firstChunkMs !== null ? `${firstChunkMs - startMs}ms` : 'never');
  console.log('  Text chunks   :', textChunkCount);
  console.log('  Action chunks :', actionChunkCount);

  if (actionChunkCount === 0) {
    console.log('\n  ⚠️  NO ACTIONS arrived in stream.');
    console.log('     This means either:');
    console.log('     (a) gateway does not support streaming + tools — need Path B fallback');
    console.log('     (b) model chose not to call log_food for this prompt');
    console.log('     (c) tool call arrived but validation rejected it');
    console.log('\n  Full text response was:');
    console.log(' ', fullText);
  } else {
    console.log('\n  ✅ Actions arrived:');
    actions.forEach((a, i) => console.log(`    [${i}] ${a.type}:`, JSON.stringify(a.payload ?? {})));
  }

  // ── Check meal_logs ───────────────────────────────────────────────────────
  console.log('\n[4] Waiting 2s then checking meal_logs...');
  await new Promise(r => setTimeout(r, 2000));

  const { data: after, error: afterErr } = await authedSupabase
    .from('meal_logs')
    .select('id, custom_name, category, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(1);

  if (afterErr) {
    console.error('meal_logs query error:', afterErr.message);
  } else if (!after || after.length === 0) {
    console.log('  ⚠️  meal_logs is empty for this user');
  } else {
    const row = after[0];
    if (row.id === beforeId) {
      console.log('  ⚠️  meal_logs most recent row UNCHANGED — no new row was written');
      console.log('      (This is expected if no log_food action was emitted)');
    } else {
      console.log('  ✅ NEW meal_logs row written:');
      console.log(JSON.stringify(row, null, 4));
    }
  }

  console.log('\n────────────────────────────────────────────────────────');
  console.log('[VERDICT]');
  const toolsWork = actionChunkCount > 0 && actions.some(a => a.type === 'log_food');
  const writeWorks = after?.[0]?.id !== beforeId;
  console.log('  Streaming + tools :', toolsWork ? '✅ PASS' : '❌ FAIL');
  console.log('  meal_logs write   :', writeWorks ? '✅ PASS' : '— N/A (this script tests the edge function directly; DB writes are handled by useAI hook, not tested here)');

  if (!toolsWork) {
    console.log('\n  → Gateway does not support streaming tool calls, or model did not call log_food.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
