
-- Stories table
CREATE TABLE public.community_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_type text NOT NULL DEFAULT 'photo',
  media_url text,
  text_content text,
  background_color text DEFAULT '#1a1a2e',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.community_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view non-expired stories"
ON public.community_stories FOR SELECT TO authenticated
USING (expires_at > now());

CREATE POLICY "Users can insert their own stories"
ON public.community_stories FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
ON public.community_stories FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Story views tracking
CREATE TABLE public.community_story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.community_stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.community_story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view story views"
ON public.community_story_views FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own views"
ON public.community_story_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Index for fast story queries
CREATE INDEX idx_community_stories_expires ON public.community_stories(expires_at DESC);
CREATE INDEX idx_community_stories_user ON public.community_stories(user_id);
CREATE INDEX idx_community_story_views_user ON public.community_story_views(user_id, story_id);
