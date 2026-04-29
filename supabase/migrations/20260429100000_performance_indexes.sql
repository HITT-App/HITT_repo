-- Performance indexes for community, HIIT Score, and AI quota queries.
-- Must land before real user data accumulates.

-- Community feed
CREATE INDEX IF NOT EXISTS idx_community_posts_created
  ON public.community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_user_id
  ON public.community_posts (user_id);

-- Likes lookups
CREATE INDEX IF NOT EXISTS idx_community_likes_user_post
  ON public.community_likes (user_id, post_id)
  WHERE post_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_likes_user_comment
  ON public.community_likes (user_id, comment_id)
  WHERE comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_likes_post_id
  ON public.community_likes (post_id)
  WHERE post_id IS NOT NULL;

-- Comments
CREATE INDEX IF NOT EXISTS idx_community_comments_post_created
  ON public.community_comments (post_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_community_comments_user
  ON public.community_comments (user_id);

-- Follow graph
CREATE INDEX IF NOT EXISTS idx_community_follows_follower
  ON public.community_follows (follower_id);

CREATE INDEX IF NOT EXISTS idx_community_follows_following
  ON public.community_follows (following_id);

-- HIIT Score computation queries (run on every score recompute per user)
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_user_status_completed
  ON public.scheduled_workouts (user_id, status, completed_at DESC)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_logged
  ON public.meal_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date
  ON public.sleep_logs (user_id, sleep_date DESC);

-- AI quota check (runs on every AI call — needs composite to avoid scan)
CREATE INDEX IF NOT EXISTS idx_ai_generation_log_user_type_created
  ON public.ai_generation_log (user_id, generation_type, created_at DESC);
