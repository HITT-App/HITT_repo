-- In-app content reporting for user-generated content (App Store Guideline 1.2).
-- Reporters file reports; admins/moderators review via the admin area. Content is
-- auto-hidden once >= 3 distinct users report the same item, pending human review.

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid(),
  reported_user_id uuid,
  content_type text NOT NULL CHECK (content_type IN ('post','comment','story','dm','chatroom','profile')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','hate','nudity','violence','self_harm','scam','other')),
  details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','actioned','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

-- A user can only report a given item once.
CREATE UNIQUE INDEX IF NOT EXISTS content_reports_unique_reporter_item
  ON public.content_reports (reporter_id, content_type, content_id);
CREATE INDEX IF NOT EXISTS content_reports_status_idx ON public.content_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_item_idx ON public.content_reports (content_type, content_id);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Reporters can file and see their own reports.
CREATE POLICY "report_insert_own" ON public.content_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "report_select_own" ON public.content_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins/moderators can see and action every report.
CREATE POLICY "report_select_staff" ON public.content_reports
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );
CREATE POLICY "report_update_staff" ON public.content_reports
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

-- Moderation flag on each UGC surface. Client list queries exclude hidden rows.
ALTER TABLE public.community_posts    ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_stories  ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.chatroom_messages  ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.community_messages ADD COLUMN IF NOT EXISTS moderation_hidden boolean NOT NULL DEFAULT false;

-- Auto-hide an item once 3 distinct users have reported it (fast takedown pending review).
CREATE OR REPLACE FUNCTION public.auto_hide_reported_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_count integer;
BEGIN
  SELECT count(DISTINCT reporter_id) INTO reporter_count
    FROM public.content_reports
    WHERE content_type = NEW.content_type AND content_id = NEW.content_id;

  IF reporter_count >= 3 THEN
    IF NEW.content_type = 'post' THEN
      UPDATE public.community_posts SET moderation_hidden = true WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'comment' THEN
      UPDATE public.community_comments SET moderation_hidden = true WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'story' THEN
      UPDATE public.community_stories SET moderation_hidden = true WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'chatroom' THEN
      UPDATE public.chatroom_messages SET moderation_hidden = true WHERE id = NEW.content_id;
    ELSIF NEW.content_type = 'dm' THEN
      UPDATE public.community_messages SET moderation_hidden = true WHERE id = NEW.content_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_hide_reported ON public.content_reports;
CREATE TRIGGER trg_auto_hide_reported
  AFTER INSERT ON public.content_reports
  FOR EACH ROW EXECUTE FUNCTION public.auto_hide_reported_content();
