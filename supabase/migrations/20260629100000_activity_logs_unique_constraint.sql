-- Replace the partial unique index from 20260609110000 with a proper named
-- UNIQUE constraint so PostgREST upserts via `onConflict` actually work.
-- Same fix that was applied to health_metrics + sleep_logs in
-- 20260422202809, for the same reason.
--
-- NULL source_platform_id values (manually-entered activities) coexist fine
-- because Postgres treats NULLs as distinct in unique constraints.

DROP INDEX IF EXISTS public.activity_logs_platform_unique;

-- Belt-and-braces: drop any duplicates that may exist with non-NULL ids
-- before we add the constraint, so it can be created.
DELETE FROM public.activity_logs a
USING public.activity_logs b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.source_platform IS NOT NULL
  AND a.source_platform = b.source_platform
  AND a.source_platform_id IS NOT NULL
  AND a.source_platform_id = b.source_platform_id;

ALTER TABLE public.activity_logs
  ADD CONSTRAINT activity_logs_source_unique
  UNIQUE (user_id, source_platform, source_platform_id);
