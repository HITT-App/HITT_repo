-- Adds the "declared_wearable_vendor" columns used by the coaching flow.
--
--   declared_wearable_vendor      — one of the SOURCE_PRIORITY vendors or
--                                   'apple_watch' / 'phone_only'. Set on
--                                   app launch by the auto-detect plugin
--                                   (URL-scheme probe) OR explicitly by
--                                   the user from Settings → Wearables.
--   declared_wearable_detected_at — when we set this (so we can re-detect
--                                   after 90 days per the adjudication
--                                   rule in activity-upsert docs).
--   declared_wearable_source      — 'auto_url_scheme' | 'user_declared' |
--                                   'activity_log_inference'. Used to
--                                   decide whether a fresh URL-scheme
--                                   result should override an existing
--                                   declaration.
--   garmin_setup_reminder_state   — dismissal ledger for the 3/7/14 day
--                                   in-app banner tiers. Client-managed
--                                   JSON so we don't need a cron.
--                                   Shape:
--                                     { dismissed_3d?: iso,
--                                       dismissed_7d?: iso,
--                                       dismissed_14d?: iso,
--                                       last_seen_at?: iso }

ALTER TABLE public.workout_preferences
  ADD COLUMN IF NOT EXISTS declared_wearable_vendor      text,
  ADD COLUMN IF NOT EXISTS declared_wearable_detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS declared_wearable_source      text,
  ADD COLUMN IF NOT EXISTS garmin_setup_reminder_state   jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Keep the vendor value constrained to known values so a typo can't split
-- the analytics groups later. Nullable so unseeded users don't fail insert.
ALTER TABLE public.workout_preferences
  DROP CONSTRAINT IF EXISTS workout_preferences_declared_wearable_vendor_check;
ALTER TABLE public.workout_preferences
  ADD  CONSTRAINT workout_preferences_declared_wearable_vendor_check
       CHECK (declared_wearable_vendor IS NULL OR declared_wearable_vendor IN (
         'apple_watch', 'garmin', 'fitbit', 'whoop', 'oura',
         'polar', 'suunto', 'coros', 'wahoo',
         'strava', 'phone_only'
       ));

ALTER TABLE public.workout_preferences
  DROP CONSTRAINT IF EXISTS workout_preferences_declared_wearable_source_check;
ALTER TABLE public.workout_preferences
  ADD  CONSTRAINT workout_preferences_declared_wearable_source_check
       CHECK (declared_wearable_source IS NULL OR declared_wearable_source IN (
         'auto_url_scheme', 'user_declared', 'activity_log_inference'
       ));

COMMENT ON COLUMN public.workout_preferences.declared_wearable_vendor      IS
  'Vendor the user is expected to sync data from. Coaching flow reads this.';
COMMENT ON COLUMN public.workout_preferences.declared_wearable_detected_at IS
  'When declared_wearable_vendor was set. Adjudication re-runs after 90 days.';
COMMENT ON COLUMN public.workout_preferences.declared_wearable_source      IS
  'How the vendor was declared — governs precedence during re-detection.';
COMMENT ON COLUMN public.workout_preferences.garmin_setup_reminder_state   IS
  'Client-managed dismissal ledger for 3/7/14 day banner tiers. Shape: { dismissed_3d?, dismissed_7d?, dismissed_14d?, last_seen_at? }';
