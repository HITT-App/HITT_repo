ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS source_platform_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_platform_unique
  ON public.activity_logs (user_id, source_platform, source_platform_id)
  WHERE source_platform_id IS NOT NULL;
