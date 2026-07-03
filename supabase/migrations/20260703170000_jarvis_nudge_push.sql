-- Jarvis-nudge server-side pushes: three pg_cron jobs replacing the
-- one client-side LocalNotifications call (schedulePBShareReminder)
-- and adding two brand-new nudges (missed-workout, weekly-recap).
-- Same pattern as 20260703150000 (community events) + 20260703160000
-- (workout reminders): SECURITY DEFINER functions, atomic UPDATE
-- RETURNING dedupe, per-row pg_net.http_post to notify-user.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Schema.
-- ─────────────────────────────────────────────────────────────────────────

-- Notification-preferences column so notify-user's user-preference gate
-- respects a "Jarvis nudges" toggle. Default true — users have to opt
-- out. NOTIFY-01 audit already checks this mapping is consistent.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS jarvis_nudges BOOLEAN NOT NULL DEFAULT true;

-- Weekly-recap dedupe on the profile itself. Sunday 18:00 local, once
-- per user per ISO week.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_weekly_recap_at TIMESTAMPTZ;

-- Missed-workout dedupe. Separate from reminder_sent_at (the pre-workout
-- push) because they're orthogonal signals and one shouldn't cancel the
-- other's retry logic.
ALTER TABLE public.scheduled_workouts
  ADD COLUMN IF NOT EXISTS missed_notified_at TIMESTAMPTZ;

-- PB-share reminder columns on workout_progress (the write path
-- WorkoutPlayer uses for structured workouts, where PBs are
-- detected today via detectPBs). When the client detects a PB on
-- completion, it stamps pb_share_reminder_at with now() + 30 min.
-- The cron scans for pb_share_reminder_at <= now() AND
-- pb_share_notified_at IS NULL, fires the push, and stamps the
-- notified column.
--
-- If a future feature adds PB detection to GPS runs, cycles, or
-- wearable-arrived workouts, we can duplicate this pair onto
-- activity_logs and extend the cron. Not needed for launch.
ALTER TABLE public.workout_progress
  ADD COLUMN IF NOT EXISTS pb_share_reminder_at TIMESTAMPTZ;

ALTER TABLE public.workout_progress
  ADD COLUMN IF NOT EXISTS pb_share_notified_at TIMESTAMPTZ;

-- Partial indexes — shrink each cron's scan surface to just-pending rows.
CREATE INDEX IF NOT EXISTS idx_workout_progress_pb_pending
  ON public.workout_progress (pb_share_reminder_at)
  WHERE pb_share_reminder_at IS NOT NULL AND pb_share_notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_missed_pending
  ON public.scheduled_workouts (scheduled_date, scheduled_time)
  WHERE status = 'scheduled' AND missed_notified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_recap_pending
  ON public.profiles (last_weekly_recap_at NULLS FIRST);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. PB-share reminder cron — fires 30 min post-workout for PBs.
--    Runs every 5 min. Atomic UPDATE...RETURNING for MVCC safety.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fire_pb_share_reminders()
RETURNS void AS $$
DECLARE
  v_endpoint TEXT;
  v_service_key TEXT;
  v_row RECORD;
BEGIN
  SELECT decrypted_secret INTO v_endpoint
  FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'notify_service_key';

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN RETURN; END IF;

  FOR v_row IN
    UPDATE public.workout_progress
       SET pb_share_notified_at = now()
     WHERE pb_share_reminder_at IS NOT NULL
       AND pb_share_reminder_at <= now()
       AND pb_share_notified_at IS NULL
    RETURNING id, user_id, workout_title
  LOOP
    PERFORM net.http_post(
      url := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'user_id',  v_row.user_id::text,
        'category', 'jarvis',
        'title',    '🏆 New PB!',
        'body',     'Your ' || COALESCE(v_row.workout_title, 'workout') ||
                    ' was a personal best. Share it with the community?',
        'url',      '/'
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Missed-workout cron — fires 2h past a skipped scheduled workout.
--    Runs every 15 min. Uses the profile.time_zone we already have.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fire_missed_workout_notifications()
RETURNS void AS $$
DECLARE
  v_endpoint TEXT;
  v_service_key TEXT;
  v_row RECORD;
  v_workout_name TEXT;
BEGIN
  SELECT decrypted_secret INTO v_endpoint
  FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'notify_service_key';

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN RETURN; END IF;

  FOR v_row IN
    UPDATE public.scheduled_workouts sw
       SET missed_notified_at = now()
      FROM public.profiles p
     WHERE sw.user_id = p.user_id
       AND sw.status = 'scheduled'
       AND sw.missed_notified_at IS NULL
       AND sw.scheduled_time IS NOT NULL
       AND (sw.scheduled_date + sw.scheduled_time)
             AT TIME ZONE COALESCE(p.time_zone, 'UTC')
           BETWEEN now() - INTERVAL '4 hours'
               AND now() - INTERVAL '2 hours'
    RETURNING sw.id, sw.user_id, sw.workout_id
  LOOP
    SELECT COALESCE(name, 'Your workout') INTO v_workout_name
    FROM public.workouts WHERE id = v_row.workout_id;

    PERFORM net.http_post(
      url := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'user_id',  v_row.user_id::text,
        'category', 'jarvis',
        'title',    'Missed your ' || v_workout_name || '?',
        'body',     'Tap to reschedule or start it now.',
        'url',      '/workout-schedule'
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Weekly-recap cron — Sunday 18:00 in the user's local tz.
--    Runs hourly; a user is eligible when their local wall-clock is
--    Sunday 17:00–18:00 AND last_weekly_recap_at is NULL or > 6 days
--    ago (so users can't accidentally skip if the cron blips).
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fire_weekly_recaps()
RETURNS void AS $$
DECLARE
  v_endpoint TEXT;
  v_service_key TEXT;
  v_row RECORD;
  v_workout_count INT;
  v_total_kcal INT;
BEGIN
  SELECT decrypted_secret INTO v_endpoint
  FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'notify_service_key';

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN RETURN; END IF;

  FOR v_row IN
    UPDATE public.profiles p
       SET last_weekly_recap_at = now()
     WHERE (p.last_weekly_recap_at IS NULL
            OR p.last_weekly_recap_at < now() - INTERVAL '6 days')
       AND EXTRACT(DOW FROM now() AT TIME ZONE COALESCE(p.time_zone, 'UTC')) = 0
       AND EXTRACT(HOUR FROM now() AT TIME ZONE COALESCE(p.time_zone, 'UTC')) = 18
    RETURNING p.user_id
  LOOP
    SELECT COUNT(*), COALESCE(SUM(calories_burned), 0)
      INTO v_workout_count, v_total_kcal
    FROM public.activity_logs
    WHERE user_id = v_row.user_id
      AND started_at >= now() - INTERVAL '7 days';

    IF v_workout_count = 0 THEN
      -- Skip silent weeks. If we didn't log anything, no recap.
      CONTINUE;
    END IF;

    PERFORM net.http_post(
      url := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'user_id',  v_row.user_id::text,
        'category', 'jarvis',
        'title',    'Your week in HIIT',
        'body',     v_workout_count || ' workout' ||
                    CASE WHEN v_workout_count = 1 THEN '' ELSE 's' END ||
                    ' · ' || v_total_kcal || ' kcal. Tap to see the breakdown.',
        'url',      '/activity-dashboard'
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Cron schedules.
-- ─────────────────────────────────────────────────────────────────────────

SELECT cron.unschedule('fire_pb_share_reminders_5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fire_pb_share_reminders_5min');
SELECT cron.schedule(
  'fire_pb_share_reminders_5min', '*/5 * * * *',
  $cron$ SELECT public.fire_pb_share_reminders(); $cron$
);

SELECT cron.unschedule('fire_missed_workout_notifications_15min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fire_missed_workout_notifications_15min');
SELECT cron.schedule(
  'fire_missed_workout_notifications_15min', '*/15 * * * *',
  $cron$ SELECT public.fire_missed_workout_notifications(); $cron$
);

SELECT cron.unschedule('fire_weekly_recaps_hourly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fire_weekly_recaps_hourly');
SELECT cron.schedule(
  'fire_weekly_recaps_hourly', '0 * * * *',
  $cron$ SELECT public.fire_weekly_recaps(); $cron$
);

-- Vault placeholders (already created by the community_event_push and
-- workout_reminder_push migrations; kept for idempotence).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'notify_endpoint_url',
      'Fully-qualified https URL of the notify-user edge function');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_service_key') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'notify_service_key',
      'Supabase service_role JWT — notify-user honours this bearer for cross-user pushes');
  END IF;
END $$;
