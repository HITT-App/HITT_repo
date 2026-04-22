-- Replace the partial unique indexes from 20260422182050 with proper named
-- UNIQUE constraints so upserts via Supabase's onConflict clause actually
-- work. Partial indexes can't be referenced by ON CONFLICT, so the old hook
-- fell back to delete-then-insert and risked data loss if the insert failed.
--
-- Manually-entered records have source_platform_id = NULL; Postgres treats
-- NULLs as distinct in unique constraints, so they coexist with synced rows.

-- health_metrics -----------------------------------------------------------

DROP INDEX IF EXISTS public.idx_health_metrics_source_platform_id;

ALTER TABLE public.health_metrics
  ADD CONSTRAINT health_metrics_source_unique
  UNIQUE (user_id, source_platform, source_platform_id);

-- sleep_logs ---------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_sleep_logs_source_platform_id;

ALTER TABLE public.sleep_logs
  ADD CONSTRAINT sleep_logs_source_unique
  UNIQUE (user_id, source_platform, source_platform_id);
