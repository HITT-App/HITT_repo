-- Fix: Community profiles - respect is_private field
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.community_profiles;
CREATE POLICY "Authenticated users can view public profiles"
  ON public.community_profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND (
      is_private = false 
      OR user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.community_follows 
        WHERE follower_id = auth.uid() 
        AND following_id = community_profiles.user_id
      )
    )
  );

-- Fix: Community posts - require authentication (posts are public within the platform)
DROP POLICY IF EXISTS "Anyone can view public posts" ON public.community_posts;
CREATE POLICY "Authenticated users can view posts"
  ON public.community_posts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix: Community comments - require authentication
DROP POLICY IF EXISTS "Anyone can view comments" ON public.community_comments;
CREATE POLICY "Authenticated users can view comments"
  ON public.community_comments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix: Community likes - require authentication
DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_likes;
CREATE POLICY "Authenticated users can view likes"
  ON public.community_likes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix: Community follows - require authentication
DROP POLICY IF EXISTS "Anyone can view follows" ON public.community_follows;
CREATE POLICY "Authenticated users can view follows"
  ON public.community_follows
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix: Community poll votes - require authentication
DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.community_poll_votes;
CREATE POLICY "Authenticated users can view poll votes"
  ON public.community_poll_votes
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix: Push notifications - restrict to admins only
DROP POLICY IF EXISTS "Anyone can view push notifications" ON public.push_notifications;
CREATE POLICY "Admins can view push notifications"
  ON public.push_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Fix: Feature flags - restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view feature flags" ON public.feature_flags;
CREATE POLICY "Authenticated users can view feature flags"
  ON public.feature_flags
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix: Coach reviews - only allow reviews from users with completed sessions
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.coach_reviews;
CREATE POLICY "Users can create reviews for their sessions"
  ON public.coach_reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND (
      session_id IS NULL 
      OR EXISTS (
        SELECT 1 FROM public.coaching_sessions 
        WHERE id = session_id 
        AND user_id = auth.uid()
        AND status = 'completed'
      )
    )
  );