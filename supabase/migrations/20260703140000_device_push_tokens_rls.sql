-- device_push_tokens stores per-user APNs tokens. Without RLS, any
-- request holding the anon key could read every user's push token —
-- a straight abuse vector (send arbitrary notifications, target-
-- profile individual users). Locking it down now.

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'ios',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token)
);

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Postgres doesn't accept `CREATE POLICY IF NOT EXISTS` — use the
-- DROP-then-CREATE idiom for idempotence.

DROP POLICY IF EXISTS "Users read own push tokens" ON public.device_push_tokens;
CREATE POLICY "Users read own push tokens"
  ON public.device_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users write own push tokens" ON public.device_push_tokens;
CREATE POLICY "Users write own push tokens"
  ON public.device_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own push tokens" ON public.device_push_tokens;
CREATE POLICY "Users update own push tokens"
  ON public.device_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own push tokens" ON public.device_push_tokens;
CREATE POLICY "Users delete own push tokens"
  ON public.device_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);
