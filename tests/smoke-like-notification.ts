/**
 * Live smoke test — "someone liked your post" notification (task #112).
 *
 * The like→notify chain is already built end to end:
 *
 *   community_likes INSERT
 *     → create_like_notification() trigger  → community_notifications row  (in-app inbox)
 *     → fanout_community_notification()     → pg_net POST → notify-user    (device push)
 *
 * Reports say users don't get notified. This test splits the chain so you can
 * see WHICH half is broken rather than guessing.
 *
 *   Tier 1 (two user accounts, anon key) — the in-app inbox row.
 *   Tier 2 (service-role key, optional)  — the push half: vault config,
 *                                          user prefs, device token, pg_net result.
 *
 * Tier 2 is where the money is. `fanout_community_notification()` bails only on
 * `v_endpoint IS NULL`, but the migrations SEED both vault secrets with the literal
 * string '__set_via_supabase_studio__'. So if nobody ever set them in Studio the
 * NULL guard never trips — pg_net cheerfully POSTs to a non-URL and every community
 * push dies silently while the in-app row still lands. That failure mode looks
 * exactly like the bug as reported. Tier 2 check 1 is the first thing to read.
 *
 * Usage:
 *   TEST_EMAIL=a@x TEST_PASSWORD=p \
 *   TEST_EMAIL_2=b@x TEST_PASSWORD_2=p \
 *   [SUPABASE_SERVICE_ROLE_KEY=...] \
 *   bun run tests/smoke-like-notification.ts
 *
 * Two accounts are REQUIRED: the trigger deliberately skips self-likes
 * (`WHERE p.user_id != NEW.user_id`), so one account can never produce the row.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbrqdlkjoxvglcdlixbi.supabase.co';
const ANON_KEY = 'sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM';

const TEST_EMAIL = process.env.TEST_EMAIL ?? '';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';
const TEST_EMAIL_2 = process.env.TEST_EMAIL_2 ?? '';
const TEST_PASSWORD_2 = process.env.TEST_PASSWORD_2 ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const VAULT_PLACEHOLDER = '__set_via_supabase_studio__';

let pass = 0;
let fail = 0;
let warn = 0;
const check = (name: string, ok: boolean, note = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${note ? ' — ' + note : ''}`);
  if (ok) pass++; else fail++;
};
const soft = (name: string, ok: boolean, note = '') => {
  console.log(`  ${ok ? '✅' : '⚠️ '} ${name}${note ? ' — ' + note : ''}`);
  if (!ok) warn++;
  else pass++;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function signIn(email: string, password: string, label: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    console.error(`Sign-in failed for ${label} (${email}):`, error?.message);
    process.exit(1);
  }
  return { client, uid: data.user.id };
}

/** Poll for a row rather than assuming the trigger has fired by the time we look. */
async function waitForNotification(
  client: SupabaseClient, recipient: string, postId: string, tries = 10,
) {
  for (let i = 0; i < tries; i++) {
    const { data } = await client
      .from('community_notifications')
      .select('*')
      .eq('user_id', recipient)
      .eq('post_id', postId)
      .eq('type', 'like');
    if (data && data.length > 0) return data;
    await sleep(500);
  }
  return [];
}

async function main() {
  if (!TEST_EMAIL || !TEST_PASSWORD || !TEST_EMAIL_2 || !TEST_PASSWORD_2) {
    console.error(
      'Set TEST_EMAIL + TEST_PASSWORD (post author) and TEST_EMAIL_2 + TEST_PASSWORD_2 (liker).\n' +
      'Two accounts are required — the trigger skips self-likes by design.',
    );
    process.exit(1);
  }

  const author = await signIn(TEST_EMAIL, TEST_PASSWORD, 'author');
  const liker = await signIn(TEST_EMAIL_2, TEST_PASSWORD_2, 'liker');

  if (author.uid === liker.uid) {
    console.error('TEST_EMAIL and TEST_EMAIL_2 resolve to the same user — the self-like guard will suppress every notification.');
    process.exit(1);
  }

  console.log(`\nAuthor: ${TEST_EMAIL} (${author.uid})`);
  console.log(`Liker:  ${TEST_EMAIL_2} (${liker.uid})\n`);

  let postId = '';
  let selfPostId = '';

  try {
    // ── Tier 1 — in-app inbox ────────────────────────────────────────────────
    console.log('Tier 1 — in-app notification (anon key, two accounts)');

    // 1. Author publishes a post.
    const { data: post, error: postErr } = await author.client
      .from('community_posts')
      .insert({
        user_id: author.uid,
        content: 'smoke test — like notification (#112)',
        post_type: 'text',
      })
      .select('id')
      .single();
    check('author can create a post', !postErr && !!post, postErr?.message);
    if (!post) throw new Error('cannot continue without a post');
    postId = post.id;

    // 2. Liker likes it.
    const { error: likeErr } = await liker.client
      .from('community_likes')
      .insert({ user_id: liker.uid, post_id: postId });
    check('liker can like the post', !likeErr, likeErr?.message);

    // 3. The trigger writes the inbox row for the AUTHOR (not the liker).
    const notifs = await waitForNotification(author.client, author.uid, postId);
    check('community_notifications row created for the author', notifs.length === 1,
      notifs.length === 0
        ? 'NO ROW — create_like_notification trigger is not firing (or RLS hides it from the author)'
        : `${notifs.length} rows`);

    if (notifs.length > 0) {
      const n = notifs[0];
      check("notification type is 'like'", n.type === 'like', `got '${n.type}'`);
      check('actor_id is the liker', n.actor_id === liker.uid);
      check('notification starts unread', n.is_read === false,
        n.is_read ? 'is_read=true — the fan-out trigger skips read rows, so this would kill the push' : '');
    }

    // 4. likes_count is maintained by a separate trigger the feed UI depends on.
    const { data: counted } = await author.client
      .from('community_posts').select('likes_count').eq('id', postId).single();
    check('likes_count incremented to 1', counted?.likes_count === 1, `got ${counted?.likes_count}`);

    // 5. Self-like guard — the author liking their own post must NOT notify.
    const { data: selfPost } = await author.client
      .from('community_posts')
      .insert({ user_id: author.uid, content: 'smoke test — self-like guard (#112)', post_type: 'text' })
      .select('id')
      .single();
    if (selfPost) {
      selfPostId = selfPost.id;
      await author.client.from('community_likes').insert({ user_id: author.uid, post_id: selfPostId });
      await sleep(1500);
      const { data: selfNotifs } = await author.client
        .from('community_notifications')
        .select('id').eq('post_id', selfPostId).eq('type', 'like');
      check('self-like does NOT create a notification', (selfNotifs?.length ?? 0) === 0,
        `${selfNotifs?.length ?? 0} rows`);
    }

    // ── Tier 2 — the push half ───────────────────────────────────────────────
    console.log('\nTier 2 — device push path (needs SUPABASE_SERVICE_ROLE_KEY)');

    if (!SERVICE_KEY) {
      console.log('  ⏭  skipped — set SUPABASE_SERVICE_ROLE_KEY to run these.');
      console.log('     These are the checks most likely to find the bug. Run them.');
    } else {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1. THE PRIME SUSPECT — is push configured at all?
      // check_push_config() ships in 20260729120000_fix_push_config_placeholder.sql.
      // It reports MISSING / PLACEHOLDER / INVALID / ok per secret, so we don't have to
      // reach into the vault schema (which PostgREST doesn't expose by default).
      const { data: cfg, error: cfgErr } = await admin.rpc('check_push_config');

      if (cfgErr || !cfg) {
        soft('check_push_config() available', false,
          `could not call it (${cfgErr?.message ?? 'no data'}) — has migration ` +
          '20260729120000_fix_push_config_placeholder.sql been applied? ' +
          'Otherwise check Studio → Vault manually: notify_endpoint_url and ' +
          `notify_service_key must NOT be '${VAULT_PLACEHOLDER}'.`);
      } else {
        const rows = cfg as { secret_name: string; status: string }[];
        for (const row of rows) {
          check(`${row.secret_name} configured`, row.status === 'ok',
            row.status === 'ok' ? '' : row.status);
        }
        if (rows.some(r => r.status !== 'ok')) {
          console.log('     ↳ This is the bug. Set both secrets in Studio → Vault, then re-run.');
        }
      }

      // 2. The author must actually want this push.
      const { data: prefs } = await admin
        .from('notification_preferences')
        .select('push_enabled, community_notifications, social_notifications')
        .eq('user_id', author.uid)
        .maybeSingle();
      soft('author has a notification_preferences row', !!prefs,
        !prefs ? 'no row — notify-user may treat a missing row as opt-out' : '');
      if (prefs) {
        soft('push_enabled is true for the author', prefs.push_enabled === true);
        soft('community_notifications pref is true', prefs.community_notifications === true);
      }

      // 3. No device token = no push, regardless of everything above.
      const { data: tokens } = await admin
        .from('device_push_tokens')
        .select('id, platform')
        .eq('user_id', author.uid);
      soft('author has at least one registered device push token', (tokens?.length ?? 0) > 0,
        (tokens?.length ?? 0) === 0
          ? 'no token — the author has never granted push permission on a real device. Push cannot arrive; test on a physical device with notifications allowed.'
          : `${tokens!.length} token(s): ${tokens!.map(t => t.platform).join(', ')}`);

      // 4. Did pg_net actually fire, and what came back?
      const { data: responses, error: netErr } = await admin
        .schema('net').from('_http_response')
        .select('id, status_code, error_msg, created')
        .order('created', { ascending: false })
        .limit(5);
      if (netErr) {
        soft('net._http_response readable', false,
          'could not read pg_net response log — inspect manually: select * from net._http_response order by created desc limit 20;');
      } else {
        const recent = (responses ?? []) as { status_code: number; error_msg: string | null }[];
        soft('pg_net recorded a recent outbound request', recent.length > 0,
          recent.length === 0 ? 'no rows — the fan-out trigger never issued a POST' : '');
        const ok = recent.find(r => r.status_code >= 200 && r.status_code < 300);
        soft('most recent pg_net POST returned 2xx', !!ok,
          !ok && recent.length > 0
            ? `latest status=${recent[0].status_code} err=${recent[0].error_msg ?? 'none'}`
            : '');
      }
    }
  } finally {
    // ── Cleanup — cascades remove likes + notifications with the post. ───────
    for (const id of [postId, selfPostId].filter(Boolean)) {
      await author.client.from('community_posts').delete().eq('id', id);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed, ${warn} warnings`);
  if (fail > 0) {
    console.log(
      '\nReading the result:\n' +
      '  Tier 1 fails  → the in-app inbox is broken (trigger or RLS). Fix that first.\n' +
      '  Tier 1 passes + Tier 2 fails → the inbox works and the PUSH is broken.\n' +
      "     If notify_endpoint_url is still '" + VAULT_PLACEHOLDER + "', that is the whole bug:\n" +
      '     set both vault secrets in Studio → Vault, then re-run.',
    );
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
