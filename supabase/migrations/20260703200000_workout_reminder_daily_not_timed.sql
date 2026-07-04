-- Reads notify_endpoint_url + notify_service_key from Vault
-- (placeholders created in 20260703160000_workout_reminder_push.sql).
--
-- Rewrite the workout reminder crons.
--
-- Prior model (20260703160000, 20260703170000, 20260703190000):
-- fired 25-35 min before scheduled_time. Wrong — workouts aren't
-- timed in this app, they're scheduled to a date. If a user has
-- a workout for today, we want to nudge them in the MORNING and,
-- if they haven't logged it, again in the EVENING.
--
-- New model:
--   fire_workout_reminder_morning — hourly cron. When it's 08:00
--   local (per profiles.time_zone), send "You have {title} today."
--   Guarded by morning_reminder_sent_at (dedupe within the day).
--
--   fire_workout_reminder_evening — hourly cron. When it's 19:00
--   local, send "Don't forget your {title} — log it or reschedule."
--   Guarded by evening_reminder_sent_at AND skipped when the
--   workout is already completed (status='completed' OR any
--   workout_progress row for that user_id on that local day).
--
-- Old columns (reminder_sent_at, missed_notified_at) are left in
-- place for old rows and future roll-forward safety — the new
-- functions ignore them.
--
-- Old crons and functions removed.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Retire the old crons and functions.
-- ─────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('fire_workout_reminders_5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fire_workout_reminders_5min');

SELECT cron.unschedule('fire_missed_workout_notifications_15min')
WHERE EXISTS (SELECT 1 FROM cron.job
              WHERE jobname = 'fire_missed_workout_notifications_15min');

DROP FUNCTION IF EXISTS public.fire_workout_reminders();
DROP FUNCTION IF EXISTS public.fire_missed_workout_notifications();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Dedupe columns for the new cron pair.
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.scheduled_workouts
  ADD COLUMN IF NOT EXISTS morning_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE public.scheduled_workouts
  ADD COLUMN IF NOT EXISTS evening_reminder_sent_at TIMESTAMPTZ;

-- Partial indexes — the crons scan by date and status, and each
-- filters for the corresponding *_sent_at IS NULL. Keeps the scan
-- surface tiny.
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_morning_pending
  ON public.scheduled_workouts (scheduled_date)
  WHERE status = 'scheduled' AND morning_reminder_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_evening_pending
  ON public.scheduled_workouts (scheduled_date)
  WHERE status = 'scheduled' AND evening_reminder_sent_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Morning reminder — 08:00–08:59 local time.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fire_workout_reminder_morning()
RETURNS void AS $$
DECLARE
  v_endpoint TEXT;
  v_service_key TEXT;
  v_row RECORD;
  v_workout_title TEXT;
BEGIN
  SELECT decrypted_secret INTO v_endpoint
  FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'notify_service_key';

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN RETURN; END IF;

  FOR v_row IN
    UPDATE public.scheduled_workouts sw
       SET morning_reminder_sent_at = now()
      FROM public.profiles p
     WHERE sw.user_id = p.user_id
       AND sw.status = 'scheduled'
       AND sw.morning_reminder_sent_at IS NULL
       AND sw.scheduled_date
           = (now() AT TIME ZONE COALESCE(p.time_zone, 'UTC'))::date
       AND EXTRACT(HOUR FROM now() AT TIME ZONE COALESCE(p.time_zone, 'UTC')) = 8
    RETURNING sw.id, sw.user_id, sw.workout_id
  LOOP
    SELECT COALESCE(title, 'Your workout') INTO v_workout_title
    FROM public.workouts WHERE id = v_row.workout_id;

    PERFORM net.http_post(
      url := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'user_id',  v_row.user_id::text,
        'category', 'workout',
        'title',    'Today''s workout',
        'body',     'You have ' || v_workout_title || ' today.',
        'url',      '/workout-schedule'
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Evening reminder — 19:00–19:59 local time, only if not logged.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fire_workout_reminder_evening()
RETURNS void AS $$
DECLARE
  v_endpoint TEXT;
  v_service_key TEXT;
  v_row RECORD;
  v_workout_title TEXT;
BEGIN
  SELECT decrypted_secret INTO v_endpoint
  FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'notify_service_key';

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN RETURN; END IF;

  FOR v_row IN
    UPDATE public.scheduled_workouts sw
       SET evening_reminder_sent_at = now()
      FROM public.profiles p
     WHERE sw.user_id = p.user_id
       AND sw.status = 'scheduled'
       AND sw.evening_reminder_sent_at IS NULL
       AND sw.scheduled_date
           = (now() AT TIME ZONE COALESCE(p.time_zone, 'UTC'))::date
       AND EXTRACT(HOUR FROM now() AT TIME ZONE COALESCE(p.time_zone, 'UTC')) = 19
       -- Evening reminder skips if there's any workout_progress
       -- row for this user in their local "today". Uses the same
       -- tz as scheduled_date for a consistent day boundary.
       AND NOT EXISTS (
         SELECT 1 FROM public.workout_progress wp
          WHERE wp.user_id = sw.user_id
            AND (wp.completed_at AT TIME ZONE COALESCE(p.time_zone, 'UTC'))::date
                = sw.scheduled_date
       )
    RETURNING sw.id, sw.user_id, sw.workout_id
  LOOP
    SELECT COALESCE(title, 'Your workout') INTO v_workout_title
    FROM public.workouts WHERE id = v_row.workout_id;

    PERFORM net.http_post(
      url := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'user_id',  v_row.user_id::text,
        'category', 'workout',
        'title',    'Don''t forget',
        'body',     v_workout_title || ' — log it or reschedule.',
        'url',      '/workout-schedule'
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Cron schedules — hourly, tz-aware inside the function.
-- ─────────────────────────────────────────────────────────────────────────
SELECT cron.unschedule('fire_workout_reminder_morning_hourly')
WHERE EXISTS (SELECT 1 FROM cron.job
              WHERE jobname = 'fire_workout_reminder_morning_hourly');

SELECT cron.schedule(
  'fire_workout_reminder_morning_hourly', '0 * * * *',
  $cron$ SELECT public.fire_workout_reminder_morning(); $cron$
);

SELECT cron.unschedule('fire_workout_reminder_evening_hourly')
WHERE EXISTS (SELECT 1 FROM cron.job
              WHERE jobname = 'fire_workout_reminder_evening_hourly');

SELECT cron.schedule(
  'fire_workout_reminder_evening_hourly', '0 * * * *',
  $cron$ SELECT public.fire_workout_reminder_evening(); $cron$
);
