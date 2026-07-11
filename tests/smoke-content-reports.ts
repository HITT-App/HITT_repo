/**
 * Live smoke test — in-app content reporting (App Store Guideline 1.2).
 *
 * Verifies the reporting pipeline against the deployed Supabase backend:
 * a user can file a report, read it back, cannot double-report the same item,
 * bad input is rejected, and they can retract it. The 3-distinct-reporter
 * auto-hide trigger needs 3 users / service role and is checked separately
 * (noted below), not here.
 *
 * Usage: TEST_EMAIL=x TEST_PASSWORD=y bun run tests/smoke-content-reports.ts
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';
const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

// Fixed test IDs so re-runs converge on a single (deduped) row.
const TEST_CONTENT_ID = '00000000-0000-0000-0000-00000000c0d1';
const TEST_REPORTED_USER = '00000000-0000-0000-0000-00000000c0d2';
const OTHER_CONTENT_ID = '00000000-0000-0000-0000-00000000c0d3';

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, note = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${note ? ' — ' + note : ''}`);
  ok ? pass++ : fail++;
};

async function main() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.error('Set TEST_EMAIL + TEST_PASSWORD');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, ANON_KEY);
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL, password: TEST_PASSWORD,
  });
  if (authErr || !auth.user) {
    console.error('Sign-in failed:', authErr?.message);
    process.exit(1);
  }
  const uid = auth.user.id;
  console.log('Authenticated as', TEST_EMAIL, '\n');

  // Clean any residue from a prior run.
  await supabase.from('content_reports').delete().eq('reporter_id', uid).in('content_id', [TEST_CONTENT_ID, OTHER_CONTENT_ID]);

  // 1. File a report.
  const { error: insErr } = await supabase.from('content_reports').insert({
    reporter_id: uid, reported_user_id: TEST_REPORTED_USER,
    content_type: 'post', content_id: TEST_CONTENT_ID, reason: 'spam', details: 'smoke test',
  });
  check('user can file a report', !insErr, insErr?.message);

  // 2. Reporter reads their own report; it starts pending.
  const { data: own } = await supabase.from('content_reports').select('*').eq('content_id', TEST_CONTENT_ID);
  check('reporter reads own report (pending)', !!own && own.length === 1 && own[0].status === 'pending');

  // 3. Same user cannot report the same item twice (unique index).
  const { error: dupErr } = await supabase.from('content_reports').insert({
    reporter_id: uid, reported_user_id: TEST_REPORTED_USER,
    content_type: 'post', content_id: TEST_CONTENT_ID, reason: 'spam',
  });
  check('duplicate report rejected', !!dupErr && /duplicate|unique/i.test(dupErr.message ?? ''), dupErr?.message ?? 'NO ERROR');

  // 4. Invalid reason rejected by the CHECK constraint.
  const { error: badReason } = await supabase.from('content_reports').insert({
    reporter_id: uid, content_type: 'post', content_id: OTHER_CONTENT_ID, reason: 'not_a_reason',
  });
  check('invalid reason rejected', !!badReason, badReason ? '' : 'NO ERROR');

  // 5. Reporter can retract (delete) their own report — and it's really gone.
  await supabase.from('content_reports').delete().eq('reporter_id', uid).eq('content_id', TEST_CONTENT_ID);
  const { data: after } = await supabase.from('content_reports').select('id').eq('content_id', TEST_CONTENT_ID);
  check('reporter can retract own report', !!after && after.length === 0);

  console.log('\n  ℹ auto-hide at 3 distinct reporters requires 3 users / service role — verify manually.');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main();
