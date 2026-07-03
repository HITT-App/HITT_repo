-- Community events → in-app inbox → APNs push. Follow / comment / like
-- triggers already exist and are proven to work; this migration adds:
--   1. community_messages trigger — write a row into community_notifications
--      when a DM is sent (previously silent).
--   2. community_notifications fan-out trigger — call the notify-user edge
--      function via pg_net so a lock-screen push fires alongside the
--      in-app bell.
--   3. Supporting index on community_notifications (user_id, created_at DESC).
--
-- SECURITY DEFINER on every trigger function so they bypass the
-- "actor_id = auth.uid()" INSERT policy on community_notifications —
-- same pattern as the existing follow/comment/like triggers.
-- pg_net + pg_cron already enabled by the purge-cron migration.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Message trigger — recipient is the other participant on the
--    conversation row (participant_1 or participant_2).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_participant_1 UUID;
  v_participant_2 UUID;
  v_recipient UUID;
BEGIN
  SELECT participant_1, participant_2
    INTO v_participant_1, v_participant_2
  FROM public.community_conversations
  WHERE id = NEW.conversation_id;

  IF v_participant_1 IS NULL AND v_participant_2 IS NULL THEN
    RETURN NEW;
  END IF;

  v_recipient := CASE
    WHEN NEW.sender_id = v_participant_1 THEN v_participant_2
    ELSE v_participant_1
  END;

  IF v_recipient IS NOT NULL AND v_recipient <> NEW.sender_id THEN
    INSERT INTO public.community_notifications
      (user_id, actor_id, type, metadata)
    VALUES
      (v_recipient, NEW.sender_id, 'message',
        jsonb_build_object('conversation_id', NEW.conversation_id));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_create_notification ON public.community_messages;
CREATE TRIGGER on_message_create_notification
AFTER INSERT ON public.community_messages
FOR EACH ROW EXECUTE FUNCTION public.create_message_notification();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Fan-out trigger — pg_net POST to notify-user for every fresh
--    community_notifications row.
--    Skips soft-deleted rows and rows that arrive with is_read=true
--    (unlikely, but a safety valve for backfills that shouldn't push).
--    Composes title/body/url per `type`.
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

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN
    -- Secrets not configured yet; silently no-op instead of blowing up
    -- the parent INSERT. The in-app inbox row still lands normally.
    RETURN NEW;
  END IF;

  -- Actor display name — prefer community_profiles.display_name (public
  -- persona), fall back to profiles.display_name (main account).
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
      v_url := '/community-profile/' || NEW.actor_id::text;
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
      v_url := '/community/post/' || COALESCE(NEW.post_id::text, '');
    WHEN 'message' THEN
      v_title := 'New message';
      v_body := v_actor_name || ' sent you a message.';
      v_url := '/community/chat/' || NEW.actor_id::text;
    ELSE
      -- Unknown type — skip fan-out but keep the inbox row.
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

DROP TRIGGER IF EXISTS on_notification_fanout_push ON public.community_notifications;
CREATE TRIGGER on_notification_fanout_push
AFTER INSERT ON public.community_notifications
FOR EACH ROW EXECUTE FUNCTION public.fanout_community_notification();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Vault placeholders + inbox index.
-- ─────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'notify_endpoint_url',
      'Fully-qualified https URL of the notify-user edge function');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_service_key') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'notify_service_key',
      'Supabase service_role JWT — notify-user honours this bearer for cross-user pushes');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_notifications_user_created
  ON public.community_notifications (user_id, created_at DESC)
  WHERE deleted_at IS NULL;
