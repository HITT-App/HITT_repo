CREATE POLICY "Authenticated users can view all profiles for display"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);