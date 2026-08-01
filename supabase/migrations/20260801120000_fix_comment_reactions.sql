-- Reacting to a COMMENT: the count never showed, and the notification 404'd.
--
-- Two independent bugs, both specific to comment likes. Post likes were fine, which is
-- why this went unnoticed — everything that handles likes was written for posts and the
-- comment case was half-wired.
--
-- BUG 1 — the reaction never appears on screen.
--   `update_post_likes_count()` (migration 20260121235330) fires on every
--   community_likes insert/delete but only ever updates community_posts. Nothing
--   maintains community_comments.likes_count, so it sits at 0 forever while
--   PostComments.tsx faithfully renders that 0. Confirmed in production: comments with
--   one real like each, all storing likes_count = 0.
--
-- BUG 2 — tapping the notification 404s.
--   `create_like_notification()` inserts comment_like rows with ONLY comment_id, leaving
--   post_id NULL. `fanout_community_notification()` then builds
--       '/community/post/' || COALESCE(NEW.post_id::text,'') || '/comments'
--   which with a NULL post_id produces '/community/post//comments' — a double slash that
--   matches no route. Confirmed against live rows: all 3 comment_like notifications
--   resolve to exactly that URL.
--
-- Fixes both, backfills the damage, and makes the URL builder refuse to emit a broken
-- path rather than silently shipping one.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Maintain community_comments.likes_count.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.comment_id IS NOT NULL THEN
    UPDATE public.community_comments
       SET likes_count = likes_count + 1
     WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' AND OLD.comment_id IS NOT NULL THEN
    -- GREATEST guards against going negative if a row is ever double-deleted.
    UPDATE public.community_comments
       SET likes_count = GREATEST(likes_count - 1, 0)
     WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;  -- AFTER trigger; return value is ignored
END;
$$;

DROP TRIGGER IF EXISTS update_comment_likes_insert ON public.community_likes;
CREATE TRIGGER update_comment_likes_insert
AFTER INSERT ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

DROP TRIGGER IF EXISTS update_comment_likes_delete ON public.community_likes;
CREATE TRIGGER update_comment_likes_delete
AFTER DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.update_comment_likes_count();

-- Backfill: every existing comment gets its true count.
UPDATE public.community_comments c
   SET likes_count = sub.n
  FROM (
    SELECT comment_id, COUNT(*) AS n
      FROM public.community_likes
     WHERE comment_id IS NOT NULL
     GROUP BY comment_id
  ) sub
 WHERE c.id = sub.comment_id
   AND c.likes_count IS DISTINCT FROM sub.n;

-- And any comment with no likes at all should read 0, not NULL.
UPDATE public.community_comments
   SET likes_count = 0
 WHERE likes_count IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Give comment_like notifications the post_id their deep link needs.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Post like — unchanged.
  IF NEW.post_id IS NOT NULL THEN
    INSERT INTO public.community_notifications (user_id, actor_id, type, post_id)
    SELECT p.user_id, NEW.user_id, 'like', NEW.post_id
    FROM public.community_posts p
    WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  END IF;

  -- Comment like — now carries post_id as well, taken from the parent comment.
  -- Without it the deep link has nothing to point at.
  IF NEW.comment_id IS NOT NULL THEN
    INSERT INTO public.community_notifications (user_id, actor_id, type, comment_id, post_id)
    SELECT c.user_id, NEW.user_id, 'comment_like', NEW.comment_id, c.post_id
    FROM public.community_comments c
    WHERE c.id = NEW.comment_id AND c.user_id != NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill the existing comment_like rows so old notifications stop 404ing.
UPDATE public.community_notifications n
   SET post_id = c.post_id
  FROM public.community_comments c
 WHERE n.comment_id = c.id
   AND n.post_id IS NULL
   AND n.type IN ('comment_like', 'comment');

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Stop the fan-out emitting a malformed path.
--
--    Body is otherwise identical to 20260729120000; only the two comment-scoped
--    URL branches changed. COALESCE(post_id,'') was the actual defect — it turned
--    "no id" into a valid-looking string and produced '/community/post//comments'.
--    Now a missing post_id falls back to the notifications inbox, which always
--    exists, rather than a route that cannot resolve.
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
      v_url := CASE WHEN NEW.post_id IS NULL THEN '/notifications'
                    ELSE '/community/post/' || NEW.post_id::text || '/comments' END;
    WHEN 'comment_like' THEN
      v_title := 'New reaction';
      v_body := v_actor_name || ' reacted to your comment.';
      v_url := CASE WHEN NEW.post_id IS NULL THEN '/notifications'
                    ELSE '/community/post/' || NEW.post_id::text || '/comments' END;
    WHEN 'like' THEN
      v_title := 'New reaction';
      v_body := v_actor_name || ' reacted to your post.';
      v_url := CASE WHEN NEW.post_id IS NULL THEN '/notifications'
                    ELSE '/community/post/' || NEW.post_id::text || '/comments' END;
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
