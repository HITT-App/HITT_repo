-- Add source tracking to health_metrics and sleep_logs for HealthKit /
-- Health Connect sync. Each sample imported from the native health store
-- carries its platform-specific ID so re-syncing the same window is a
-- no-op (unique partial index enforces it). source_platform is a human
-- label ('healthkit' or 'healthconnect') for auditing.
--
-- Nullable because manually-entered data has no source.

ALTER TABLE public.health_metrics
  ADD COLUMN source_platform TEXT,
  ADD COLUMN source_platform_id TEXT;

CREATE UNIQUE INDEX idx_health_metrics_source_platform_id
  ON public.health_metrics (source_platform, source_platform_id)
  WHERE source_platform_id IS NOT NULL;

ALTER TABLE public.sleep_logs
  ADD COLUMN source_platform TEXT,
  ADD COLUMN source_platform_id TEXT;

CREATE UNIQUE INDEX idx_sleep_logs_source_platform_id
  ON public.sleep_logs (source_platform, source_platform_id)
  WHERE source_platform_id IS NOT NULL;
