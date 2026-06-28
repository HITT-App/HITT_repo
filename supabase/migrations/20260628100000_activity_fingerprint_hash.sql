-- Cross-source workout dedupe.
-- A given workout can arrive via the Watch direct path AND via HealthKit
-- (Garmin/Fitbit/etc.). The (user_id, source_platform, source_platform_id)
-- unique index only catches duplicates within the SAME source. This adds a
-- second safety net keyed on a content fingerprint so the same workout from
-- two different sources still collapses to one row.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;

-- Backfill: 1-minute start-time bucket × 30-second duration bucket × activity_type
-- per user. Matches the TS helper's hash inputs verbatim.
UPDATE public.activity_logs
SET fingerprint_hash = encode(
  digest(
    user_id::text
      || '|' || COALESCE(activity_type, '')
      || '|' || floor(extract(epoch from started_at) / 60)::text
      || '|' || floor(COALESCE(duration_seconds, 0) / 30)::text,
    'sha256'
  ),
  'hex'
)
WHERE fingerprint_hash IS NULL
  AND started_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_fingerprint_unique
  ON public.activity_logs (user_id, fingerprint_hash)
  WHERE fingerprint_hash IS NOT NULL;
