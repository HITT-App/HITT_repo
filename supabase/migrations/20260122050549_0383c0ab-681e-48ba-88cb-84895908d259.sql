-- Fix coaching_sessions - restrict to own sessions only
CREATE POLICY "Users can view own coaching sessions"
  ON public.coaching_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can cancel their own sessions
CREATE POLICY "Users can delete their own coaching sessions"
  ON public.coaching_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing UPDATE/DELETE policies for workout_progress
CREATE POLICY "Users can update their own workout progress"
  ON public.workout_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout progress"
  ON public.workout_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing UPDATE/DELETE policies for coach_reviews
CREATE POLICY "Users can update their own reviews"
  ON public.coach_reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.coach_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing UPDATE/DELETE policies for messages (AI coach)
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Admin can delete user_badges (for corrections)
CREATE POLICY "Admins can manage user badges"
  ON public.user_badges
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

-- Add DELETE policies for profile tables
CREATE POLICY "Users can delete their own community profile"
  ON public.community_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition profile"
  ON public.nutrition_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admin can manage leaderboard scores
CREATE POLICY "Admins can manage leaderboard scores"
  ON public.leaderboard_scores
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );