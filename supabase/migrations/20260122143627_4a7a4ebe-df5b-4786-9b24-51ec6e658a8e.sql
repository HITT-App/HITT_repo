-- Fix remaining policies that weren't created yet
-- Using DROP IF EXISTS + CREATE pattern

-- community_comments: Already has authenticated policy, skip
-- community_likes: 
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.community_likes;
DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_likes;
CREATE POLICY "Authenticated users can view likes" 
ON public.community_likes FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- community_follows:
DROP POLICY IF EXISTS "Authenticated users can view follows" ON public.community_follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON public.community_follows;
CREATE POLICY "Authenticated users can view follows" 
ON public.community_follows FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- community_profiles:
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.community_profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.community_profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.community_profiles FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND (
    is_private = false 
    OR user_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.community_follows 
      WHERE follower_id = auth.uid() 
      AND following_id = community_profiles.user_id
    )
  )
);

-- community_poll_votes:
DROP POLICY IF EXISTS "Authenticated users can view poll votes" ON public.community_poll_votes;
DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.community_poll_votes;
CREATE POLICY "Authenticated users can view poll votes" 
ON public.community_poll_votes FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- leaderboard_scores:
DROP POLICY IF EXISTS "Authenticated users can view leaderboard scores" ON public.leaderboard_scores;
DROP POLICY IF EXISTS "Anyone can view leaderboard scores" ON public.leaderboard_scores;
CREATE POLICY "Authenticated users can view leaderboard scores" 
ON public.leaderboard_scores FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Fix Issue #3: coaching_sessions - ensure owner/coach access only
DROP POLICY IF EXISTS "Users can view their sessions or sessions where they are coach" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.coaching_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.coaching_sessions;
CREATE POLICY "Users can view their sessions or sessions where they are coach" 
ON public.coaching_sessions FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = coach_id);