/**
 * Live smoke test — body scan data reaches the AI coach prompt.
 *
 * ai-coach injects the user's latest body_scan (body-fat %, confidence, trend)
 * into the USER PROFILE block of the prompt. This test inserts a scan with a
 * distinctive body-fat %, asks the coach to state it, checks the streamed reply
 * reflects that value, then deletes the scan.
 *
 * Usage: TEST_EMAIL=x TEST_PASSWORD=y bun run tests/smoke-body-scan-prompt.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';
const FN_URL = `${SUPABASE_URL}/functions/v1/ai-coach`;
const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

// Distinctive value that is unlikely to appear by chance in a body-fat reply.
const BODY_FAT = 23.7;

async function runCoach(token: string, message: string): Promise<string> {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Response-Format': 'structured-v1',
    },
    body: JSON.stringify({ messages: [{ role: 'user', content: message }], customMemory: '', customResponseStyle: '' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
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
        if (chunk.type === 'text') text += chunk.delta;
      } catch { /* skip non-JSON */ }
    }
  }
  return text;
}

async function main() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('Set TEST_EMAIL + TEST_PASSWORD');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL, password: TEST_PASSWORD,
  });
  if (authErr || !auth.session) {
    console.error('Sign-in failed:', authErr?.message);
    process.exit(1);
  }
  const uid = auth.user!.id;
  const token = auth.session.access_token;
  console.log('Authenticated as', TEST_EMAIL, '\n');

  // Insert a fresh, latest body scan with a distinctive body-fat %.
  const { data: inserted, error: insErr } = await supabase
    .from('body_scans')
    .insert({
      user_id: uid,
      estimated_body_fat: BODY_FAT,
      confidence_level: 'high',
      analysis: { note: 'smoke test', estimated_body_fat: BODY_FAT },
      scanned_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (insErr || !inserted) {
    console.error('❌ could not insert body scan:', insErr?.message);
    process.exit(1);
  }
  console.log('  ✅ inserted body scan with', BODY_FAT + '% body fat');

  // Confirm it's readable, then give the DB a moment to propagate before the coach reads it.
  const { data: readback } = await supabase.from('body_scans').select('estimated_body_fat').eq('id', inserted.id).single();
  console.log('  ▸ readback estimated_body_fat:', readback?.estimated_body_fat);
  await new Promise((r) => setTimeout(r, 3000));

  let ok = false;
  let text = '';
  try {
    text = await runCoach(token, 'Based on my latest body scan, what is my most recent body-fat estimate? Reply with the number.');
    // The prompt formats the value as "23.7%" — accept the exact value or its
    // rounded integer (the model may round when it speaks).
    ok = /23\.7|(?<!\d)23(?!\d)|(?<!\d)24(?!\d)/.test(text);
  } catch (e: any) {
    console.error('❌ coach call failed:', e.message);
  }

  console.log('  ▸ reply:', JSON.stringify(text.slice(0, 400)));
  console.log(`  ${ok ? '✅' : '❌'} body scan reflected in the coach reply`);

  // Clean up.
  await supabase.from('body_scans').delete().eq('id', inserted.id);
  console.log('  ✅ cleaned up test scan');

  console.log(`\n${ok ? '1 passed, 0 failed' : '0 passed, 1 failed'}`);
  process.exit(ok ? 0 : 1);
}

main();
