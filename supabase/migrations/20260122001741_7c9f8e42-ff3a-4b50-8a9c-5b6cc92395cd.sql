-- Create leaderboard_scores table for tracking user points
CREATE TABLE public.leaderboard_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  weekly_points INTEGER NOT NULL DEFAULT 0,
  monthly_points INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'worldwide', -- 'gym', 'worldwide', 'friends'
  rank_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Create achievement_progress table for tracking progress toward badges
CREATE TABLE public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Create friend relationships for "Friends" leaderboard
CREATE TABLE public.user_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Enable RLS
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

-- Leaderboard policies (anyone can read for leaderboard display, users manage own)
CREATE POLICY "Anyone can view leaderboard scores"
  ON public.leaderboard_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own leaderboard scores"
  ON public.leaderboard_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard scores"
  ON public.leaderboard_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Achievement progress policies (users can only see/manage their own)
CREATE POLICY "Users can view own achievement progress"
  ON public.achievement_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievement progress"
  ON public.achievement_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievement progress"
  ON public.achievement_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Friends policies
CREATE POLICY "Users can view own friendships"
  ON public.user_friends FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can add friends"
  ON public.user_friends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friend requests"
  ON public.user_friends FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can remove own friendships"
  ON public.user_friends FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_scores;

-- Function to update leaderboard rankings
CREATE OR REPLACE FUNCTION public.update_leaderboard_rankings()
RETURNS TRIGGER AS $$
BEGIN
  -- Update rank positions for the category
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY category 
      ORDER BY total_points DESC
    ) as new_rank
    FROM public.leaderboard_scores
    WHERE category = NEW.category
  )
  UPDATE public.leaderboard_scores ls
  SET rank_position = ranked.new_rank
  FROM ranked
  WHERE ls.id = ranked.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update rankings
CREATE TRIGGER update_rankings_trigger
  AFTER INSERT OR UPDATE OF total_points ON public.leaderboard_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_leaderboard_rankings();

-- Function to award points and update leaderboard
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_category TEXT DEFAULT 'worldwide'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.leaderboard_scores (user_id, total_points, weekly_points, monthly_points, category)
  VALUES (p_user_id, p_points, p_points, p_points, p_category)
  ON CONFLICT (user_id, category)
  DO UPDATE SET
    total_points = leaderboard_scores.total_points + p_points,
    weekly_points = leaderboard_scores.weekly_points + p_points,
    monthly_points = leaderboard_scores.monthly_points + p_points,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badge(
  p_user_id UUID,
  p_badge_id UUID,
  p_current_value INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_requirement_value INTEGER;
  v_already_earned BOOLEAN;
BEGIN
  -- Check if already earned
  SELECT EXISTS(
    SELECT 1 FROM public.user_badges 
    WHERE user_id = p_user_id AND badge_id = p_badge_id
  ) INTO v_already_earned;
  
  IF v_already_earned THEN
    RETURN FALSE;
  END IF;
  
  -- Get requirement value
  SELECT requirement_value INTO v_requirement_value
  FROM public.badges WHERE id = p_badge_id;
  
  -- Update progress
  INSERT INTO public.achievement_progress (user_id, badge_id, current_value, target_value, is_completed, completed_at)
  VALUES (p_user_id, p_badge_id, p_current_value, v_requirement_value, 
          p_current_value >= v_requirement_value,
          CASE WHEN p_current_value >= v_requirement_value THEN now() ELSE NULL END)
  ON CONFLICT (user_id, badge_id)
  DO UPDATE SET
    current_value = p_current_value,
    is_completed = p_current_value >= v_requirement_value,
    completed_at = CASE WHEN p_current_value >= v_requirement_value AND achievement_progress.completed_at IS NULL THEN now() ELSE achievement_progress.completed_at END,
    updated_at = now();
  
  -- Award badge if completed
  IF p_current_value >= v_requirement_value AND NOT v_already_earned THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (p_user_id, p_badge_id)
    ON CONFLICT DO NOTHING;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Updated timestamp trigger for new tables
CREATE TRIGGER update_leaderboard_scores_updated_at
  BEFORE UPDATE ON public.leaderboard_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_achievement_progress_updated_at
  BEFORE UPDATE ON public.achievement_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();