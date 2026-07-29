-- Task #112 — "someone liked your post" never reaches the device.
--
-- Root cause: the push fan-out reads notify_endpoint_url / notify_service_key from
-- Vault and bails only when they are NULL:
--
--     IF v_endpoint IS NULL OR v_service_key IS NULL THEN RETURN NEW; END IF;
--
-- But 20260703150000_community_event_push.sql and 20260703160000_workout_reminder_push.sql
-- both SEED those secrets with the literal string '__set_via_supabase_studio__'. They are
-- therefore never NULL, the guard never trips, and net.http_post() POSTs to a value that
-- isn't a URL. The request fails inside pg_net, the in-app notification row still lands,
-- and nothing anywhere reports a problem.
--
-- Three functions share the bug: fanout_community_notification (all community pushes),
-- fire_workout_reminder_morning and fire_workout_reminder_evening (workout reminders).
--
-- Fix, in two parts:
--   1. Delete the placeholder rows. The existing IS NULL guards then behave as intended
--      in ALL THREE functions without having to redefine the two reminder functions.
--   2. Redefine fanout_community_notification to RAISE WARNING when unconfigured, so the
--      next person gets a log line instead of silence.
--
-- Plus a check_push_config() helper so the state is inspectable from SQL and from
-- tests/smoke-like-notification.ts.
--
-- NOTE: this migration does NOT configure push. It makes the unconfigured state visible
-- and honest. Someone must still set both secrets to real values in
-- Studio → Project Settings → Vault. Until they do, community pushes and workout
-- reminders stay off — which is what has been happening silently all along.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Drop the placeholders so IS NULL guards work as written.
-- ─────────────────────────────────────────────────────────────────────────

DELETE FROM vault.secrets
WHERE name IN ('notify_endpoint_url', 'notify_service_key')
  AND EXISTS (
    SELECT 1 FROM vault.decrypted_secrets d
    WHERE d.name = vault.secrets.name
      AND d.decrypted_secret = '__set_via_supabase_studio__'
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Diagnostic — is push actually configured?
--    select * from public.check_push_config();
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_push_config()
RETURNS TABLE (secret_name TEXT, status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_value TEXT;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['notify_endpoint_url', 'notify_service_key'] LOOP
    SELECT decrypted_secret INTO v_value
    FROM vault.decrypted_secrets WHERE name = v_name;

    secret_name := v_name;
    status := CASE
      WHEN v_value IS NULL THEN 'MISSING — push is disabled; set this in Studio → Vault'
      WHEN v_value = '__set_via_supabase_studio__' THEN 'PLACEHOLDER — push silently fails; set a real value'
      WHEN v_name = 'notify_endpoint_url' AND v_value NOT LIKE 'https://%' THEN 'INVALID — must be a fully-qualified https URL'
      ELSE 'ok'
    END;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.check_push_config() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.check_push_config() IS
  'Task #112 diagnostic. Reports whether the Vault secrets backing every push '
  '(community fan-out + workout reminders) are actually configured. Service role only.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Fan-out trigger — fail loudly, and treat the placeholder as unconfigured
--    even if someone re-seeds it later.
--
--    Body is otherwise identical to 20260703180000_fix_community_deep_links.sql;
--    only the config guard changed. Deep-link routes preserved exactly.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fanout_community_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_endpoint TEXT;
  v_service_key TEXT;
  v_actor_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.is_read = true THEN RETURN NEW; END IF;

  SELECT decrypted_secret INTO v_endpoint
  FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'notify_service_key';

  -- Treat missing, placeholder and non-URL values alike: all mean "not configured".
  -- WARNING rather than EXCEPTION — a broken push must never roll back the user's
  -- like/comment/follow, but it must not be invisible either.
  IF v_endpoint IS NULL OR v_service_key IS NULL
     OR v_endpoint = '__set_via_supabase_studio__'
     OR v_service_key = '__set_via_supabase_studio__'
     OR v_endpoint NOT LIKE 'https://%'
  THEN
    RAISE WARNING
      'fanout_community_notification: push not configured (notify_endpoint_url/notify_service_key missing or placeholder) — in-app notification % kept, device push skipped. See public.check_push_config().',
      NEW.id;
    RETURN NEW;
  END IF;

  SELECT COALESCE(cp.display_name, cp.username, p.display_name, 'Someone')
    INTO v_actor_name
  FROM public.community_profiles cp
    FULL OUTER JOIN public.profiles p ON p.user_id = cp.user_id
  WHERE cp.user_id = NEW.actor_id OR p.user_id = NEW.actor_id
  LIMIT 1;

  IF v_actor_name IS NULL THEN v_actor_name := 'Someone'; END IF;

  CASE NEW.type
    WHEN 'follow' THEN
      v_title := 'New follower';
      v_body := v_actor_name || ' started following you.';
      v_url := '/community/user/' || NEW.actor_id::text;
    WHEN 'comment' THEN
      v_title := 'New comment';
      v_body := v_actor_name || ' commented on your post.';
      v_url := '/community/post/' || COALESCE(NEW.post_id::text, '')
        || '/comments';
    WHEN 'comment_like' THEN
      v_title := 'New reaction';
      v_body := v_actor_name || ' reacted to your comment.';
      v_url := '/community/post/' || COALESCE(NEW.post_id::text, '')
        || '/comments';
    WHEN 'like' THEN
      v_title := 'New reaction';
      v_body := v_actor_name || ' reacted to your post.';
      v_url := '/community/post/' || COALESCE(NEW.post_id::text, '') || '/comments';
    WHEN 'message' THEN
      v_title := 'New message';
      v_body := v_actor_name || ' sent you a message.';
      v_url := '/community/chat/' || NEW.actor_id::text;
    ELSE
      RETURN NEW;
  END CASE;

  PERFORM net.http_post(
    url := v_endpoint,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'user_id',  NEW.user_id::text,
      'category', 'community',
      'title',    v_title,
      'body',     v_body,
      'url',      v_url
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
