-- Cross-source workout dedupe.
-- A given workout can arrive via the Watch direct path AND via HealthKit
-- (Garmin/Fitbit/etc.). The (user_id, source_platform, source_platform_id)
-- unique index only catches duplicates within the SAME source. This adds a
-- second safety net keyed on a content fingerprint so the same workout from
-- two different sources still collapses to one row.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS fingerprint_hash TEXT;

-- Backfill: 1-minute start-time bucket × 30-second duration bucket × activity_type
-- per user. Matches the TS helper's hash inputs verbatim.
-- pgcrypto lives in the `extensions` schema on Supabase, so we fully qualify.
UPDATE public.activity_logs
SET fingerprint_hash = encode(
  extensions.digest(
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

-- Production has historic duplicate rows (same fingerprint, multiple logs).
-- The partial unique index can't be created with duplicates present, so we
-- null out fingerprints on all but the oldest row per group. This preserves
-- the data (no DELETE) and lets the index protect against future duplicates.
-- Going forward, the TS helper will catch attempted duplicates before insert.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY user_id, fingerprint_hash ORDER BY created_at, id) AS rn
  FROM public.activity_logs
  WHERE fingerprint_hash IS NOT NULL
)
UPDATE public.activity_logs a
SET fingerprint_hash = NULL
FROM ranked r
WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS activity_logs_fingerprint_unique
  ON public.activity_logs (user_id, fingerprint_hash)
  WHERE fingerprint_hash IS NOT NULL;
