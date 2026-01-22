-- Protect coaches table - require authentication for viewing
DROP POLICY IF EXISTS "Anyone can view coaches" ON public.coaches;
CREATE POLICY "Authenticated users can view coaches"
  ON public.coaches
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add admin-only write policy for coaches
CREATE POLICY "Admins can manage coaches"
  ON public.coaches
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

-- Admin-only write for coach_availability
CREATE POLICY "Admins can manage coach availability"
  ON public.coach_availability
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