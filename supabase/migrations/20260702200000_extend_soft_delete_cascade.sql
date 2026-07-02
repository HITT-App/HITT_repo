-- Extend the 30-day soft-delete cascade to cover every primary-data
-- user-owned table the original migration missed (Apple Guideline
-- 5.1.1(v) + Garmin partner commitment). Preferences / config tables
-- are HARD-deleted directly in the delete-account edge function since
-- they're trivially regenerable on restore, so we only need deleted_at
-- on tables that hold user-authored primary data.

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.body_scans
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.hiit_score_history
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.community_reactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.community_saved_posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.community_stories
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.community_notifications
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.community_poll_votes
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial indexes on the high-volume tables so purge queries and
-- active-user filters both stay cheap.
CREATE INDEX IF NOT EXISTS idx_activity_logs_deleted_at
  ON public.activity_logs (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_deleted_at
  ON public.messages (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_reactions_deleted_at
  ON public.community_reactions (deleted_at)
  WHERE deleted_at IS NOT NULL;
