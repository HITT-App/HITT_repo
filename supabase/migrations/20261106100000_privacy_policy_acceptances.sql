-- One row per user and policy version: the record of who agreed to what, and when.
CREATE TABLE public.privacy_policy_acceptances (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  platform text,
  PRIMARY KEY (user_id, policy_version)
);
ALTER TABLE public.privacy_policy_acceptances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own policy acceptances"
  ON public.privacy_policy_acceptances FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users record their own policy acceptance"
  ON public.privacy_policy_acceptances FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
