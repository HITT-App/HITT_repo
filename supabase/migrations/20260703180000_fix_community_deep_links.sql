-- Fix deep-link URLs baked into the community-notification fan-out
-- trigger. Original migration (20260703150000) used /community-profile/
-- and /community/chat/ paths that don't exist in App.tsx. The audit
-- I built (DEDUPE-11) catches this class of bug in the client but
-- can't see into trigger-composed strings.
--
-- Real route names verified from /Users/vanessa/hitt-app/src/App.tsx:
--   Profile view:  /community/user/{userId}
--   Post comments: /community/post/{postId}/comments   (already correct)
--   1:1 chat:      /community/chat/{userId}            (already correct)

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
