-- Lightweight error log for frontend + edge function crashes.
--
-- This is a placeholder for Sentry: the same row shape lets us swap the
-- log-error edge function to forward to Sentry later without touching the
-- client. For MVP, writing to Postgres is fine — the volume is low and we
-- get queryable history in the dashboard.
--
-- No RLS SELECT for regular users (this is operator-only data). Inserts
-- come from the log-error edge function using the service role; clients
-- POST to that function rather than writing directly.

CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_error_logs_created ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_source_created ON public.error_logs (source, created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Admins only. No SELECT policy for plain users.
CREATE POLICY "Admins can view error logs"
  ON public.error_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
