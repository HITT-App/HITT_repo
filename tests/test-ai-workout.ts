/**
 * One-off test for 5F edge functions: generate-ai-workout and generate-ai-workout-plan.
 *
 * Auth strategy: generateLink (magiclink) → hashed_token → /auth/v1/verify → access_token.
 * This produces a real user JWT for user_id a4cbfe56-bc10-484c-9b3c-aa0d5677fbbd
 * without needing email/password or Google OAuth.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> bun run tests/test-ai-workout.ts
 *   SUPABASE_SERVICE_ROLE_KEY=<key> bun run tests/test-ai-workout.ts --mode=plan
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://pbrqdlkjoxvglcdlixbi.supabase.co'
const ANON_KEY      = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM'
const TARGET_USER   = 'a4cbfe56-bc10-484c-9b3c-aa0d5677fbbd'
const FN_BASE       = `${SUPABASE_URL}/functions/v1`

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is not set')
  process.exit(1)
}

const mode = process.argv.includes('--mode=plan') ? 'plan' : 'single'

function tomorrow(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// ─── Step 1: Get a real user access_token ────────────────────────────────────

async function getUserAccessToken(): Promise<string> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Get the user's email (needed for generateLink)
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(TARGET_USER)
  if (userErr || !userData?.user?.email) {
    throw new Error(`getUserById failed: ${userErr?.message ?? 'no user returned'}`)
  }
  const email = userData.user.email
  console.log(`  User email: ${email}`)

  // Generate a magic link — gives us a hashed_token we can exchange for a session
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: 'http://localhost:3000' },
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${linkErr?.message ?? 'no hashed_token in response'}`)
  }
  const hashedToken = linkData.properties.hashed_token
  console.log(`  Magic link generated (token: ${hashedToken.slice(0, 12)}…)`)

  // Exchange hashed_token for a real access_token via /auth/v1/verify
  const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
    },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken }),
  })
  const session = await verifyRes.json() as Record<string, unknown>
  if (!verifyRes.ok || !session.access_token) {
    throw new Error(`/auth/v1/verify failed (${verifyRes.status}): ${JSON.stringify(session)}`)
  }

  console.log(`  Session obtained (expires_in: ${session.expires_in}s)\n`)
  return session.access_token as string
}

// ─── Step 2: Call the edge function ──────────────────────────────────────────

async function callFunction(accessToken: string): Promise<{ body: unknown; latencyMs: number }> {
  const fnName = mode === 'plan' ? 'generate-ai-workout-plan' : 'generate-ai-workout'
  const body = mode === 'plan'
    ? { intent: 'a 4-day muscle building plan with good variety', daysPerWeek: 4, startDate: tomorrow() }
    : { intent: 'a 20-minute full body HIIT session, no equipment needed' }

  console.log(`Calling ${fnName} …`)
  console.log(`Body: ${JSON.stringify(body)}\n`)

  const t0 = Date.now()
  const res = await fetch(`${FN_BASE}/${fnName}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const latencyMs = Date.now() - t0
  const responseBody = await res.json()

  if (!res.ok) {
    throw new Error(`Function returned ${res.status}: ${JSON.stringify(responseBody)}`)
  }

  return { body: responseBody, latencyMs }
}

// ─── Step 3: Read the ai_generation_log entry ─────────────────────────────────

async function readLog(): Promise<void> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const genType = mode === 'plan' ? 'generate_ai_workout_plan' : 'generate_ai_workout'

  const { data, error } = await admin
    .from('ai_generation_log')
    .select('created_at, generation_type, latency_ms, error, response')
    .eq('user_id', TARGET_USER)
    .eq('generation_type', genType)
    .order('created_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('⚠️  Could not read ai_generation_log:', error.message)
    return
  }

  console.log('\n─── ai_generation_log (latest 3 rows) ────────────────────────')
  for (const row of data ?? []) {
    const status = row.error ? `❌  error: ${row.error}` : `✓  latency_ms: ${row.latency_ms}`
    console.log(`  ${row.created_at}  ${status}`)
    if (row.response) console.log(`  response summary: ${JSON.stringify(row.response)}`)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log(`\n═══ HITT 5F test — mode: ${mode} ═══\n`)

try {
  console.log('── Step 1: auth ──')
  const accessToken = await getUserAccessToken()

  console.log(`── Step 2: call function ──`)
  const { body, latencyMs } = await callFunction(accessToken)

  console.log(`\n── Result ────────────────────────────────────────────────────`)
  console.log(`Round-trip time: ${latencyMs}ms  ${latencyMs < 10000 ? '✓ <10s' : latencyMs < 25000 ? '⚠️  10–25s' : '❌ >25s (thinkingConfig may not be capping)'}`)
  console.log('\nFull JSON response:')
  console.log(JSON.stringify(body, null, 2))

  await readLog()

  console.log('\n─────────────────────────────────────────────────────────────')
  if (latencyMs < 10000) {
    console.log('✓  Latency OK — thinkingConfig is being honoured.')
  } else if (latencyMs < 25000) {
    console.log('⚠️  Latency borderline — may be thinking hard or cold start. Run again to confirm.')
  } else {
    console.log('❌  Latency >25s — thinkingConfig may be ignored or thinking budget too high. Do NOT ship until investigated.')
  }
} catch (err) {
  console.error('\n❌  Test failed:', err instanceof Error ? err.message : String(err))
  process.exit(1)
}
