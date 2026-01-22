-- Protect coaching_sessions - users can only see their own sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.coaching_sessions;
CREATE POLICY "Users can view their own sessions"
  ON public.coaching_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Protect leaderboard_scores - require authentication (it's ok to be public within the app)
DROP POLICY IF EXISTS "Anyone can view leaderboard scores" ON public.leaderboard_scores;
CREATE POLICY "Authenticated users can view leaderboard scores"
  ON public.leaderboard_scores
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Protect coach_reviews - require authentication
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.coach_reviews;
CREATE POLICY "Authenticated users can view reviews"
  ON public.coach_reviews
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Protect coach_availability - require authentication and add write policies
DROP POLICY IF EXISTS "Anyone can view availability" ON public.coach_availability;
CREATE POLICY "Authenticated users can view coach availability"
  ON public.coach_availability
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add admin-only write policies for shared content tables
-- Meals table - admin only for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage meals"
  ON public.meals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Workouts table - admin only for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage workouts"
  ON public.workouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Workout exercises - admin only for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage workout exercises"
  ON public.workout_exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Badges table - admin only for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage badges"
  ON public.badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );