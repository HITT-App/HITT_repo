
-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all meal logs
CREATE POLICY "Admins can view all meal logs"
  ON public.meal_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all workout progress
CREATE POLICY "Admins can view all workout progress"
  ON public.workout_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all user badges
CREATE POLICY "Admins can view all user badges"
  ON public.user_badges FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all coaching sessions
CREATE POLICY "Admins can view all coaching sessions"
  ON public.coaching_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
