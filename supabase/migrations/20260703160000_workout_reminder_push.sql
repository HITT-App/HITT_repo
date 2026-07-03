-- Workout schedule reminders → notify-user via pg_cron every 5 min.
--
-- The cron scans scheduled_workouts for rows where the combined
-- scheduled_date + scheduled_time (interpreted in the user's timezone)
-- falls 25–35 minutes from now, and fires a push. Three overlapping
-- window fires per workout (at T-35, T-30, T-25 relative to workout
-- start) means we're resilient to a single cron miss without ever
-- double-firing thanks to the reminder_sent_at guard.
--
-- Timezone semantics: profiles.time_zone defaults to 'UTC' but the
-- client writes the device's Intl-resolved IANA tz on every sign-in
-- (see useSessionSideEffects.ts). If the user travels mid-day and
-- their tz updates, pending rows are re-evaluated against the new
-- tz — that can shift a not-yet-sent reminder earlier or later. Known
-- edge case; acceptable for launch.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Schema.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'UTC';

ALTER TABLE public.scheduled_workouts
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Partial index dramatically shrinks the cron scan — only rows that
-- haven't fired their reminder yet are indexed.
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_reminder_pending
  ON public.scheduled_workouts (scheduled_date, scheduled_time)
  WHERE status = 'scheduled' AND reminder_sent_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Reminder-fanout function.
--    One atomic UPDATE...RETURNING selects + stamps in the same
--    statement — MVCC-safe under READ COMMITTED (Supabase default).
--    A concurrent run would find reminder_sent_at IS NOT NULL on the
--    re-check and skip the row.
-- ─────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fire_workout_reminders()
RETURNS void AS $$
DECLARE
  v_endpoint TEXT;
  v_service_key TEXT;
  v_row RECORD;
  v_workout_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_url TEXT;
BEGIN
  SELECT decrypted_secret INTO v_endpoint
  FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url';

  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets WHERE name = 'notify_service_key';

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN
    RETURN;   -- Secrets not populated in Vault yet — silent no-op.
  END IF;

  -- Atomic claim: mark rows as sent while returning their ids. Any
  -- concurrent run of the same query is serialized by row lock.
  FOR v_row IN
    UPDATE public.scheduled_workouts sw
       SET reminder_sent_at = now()
      FROM public.profiles p
     WHERE sw.user_id = p.user_id
       AND sw.status = 'scheduled'
       AND sw.reminder_sent_at IS NULL
       AND sw.scheduled_time IS NOT NULL
       AND (sw.scheduled_date + sw.scheduled_time)
             AT TIME ZONE COALESCE(p.time_zone, 'UTC')
           BETWEEN now() + INTERVAL '25 min'
               AND now() + INTERVAL '35 min'
    RETURNING sw.id, sw.user_id, sw.workout_id, sw.scheduled_time
  LOOP
    SELECT COALESCE(name, 'Your workout') INTO v_workout_name
    FROM public.workouts WHERE id = v_row.workout_id;

    v_title := 'Time to warm up';
    v_body  := v_workout_name || ' starts in 30 minutes.';
    v_url   := '/workout-schedule';

    PERFORM net.http_post(
      url := v_endpoint,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'user_id',  v_row.user_id::text,
        'category', 'workout',
        'title',    v_title,
        'body',     v_body,
        'url',      v_url
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Cron schedule + Vault placeholders.
-- ─────────────────────────────────────────────────────────────────────────

-- Drop any prior schedule with the same name so this migration is
-- idempotent on re-run.
SELECT cron.unschedule('fire_workout_reminders_5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fire_workout_reminders_5min');

SELECT cron.schedule(
  'fire_workout_reminders_5min',
  '*/5 * * * *',
  $cron$ SELECT public.fire_workout_reminders(); $cron$
);

DO $$
BEGIN
  -- The community_event_push migration already creates these placeholders,
  -- but we re-check in case that migration is rolled back or reordered.
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_endpoint_url') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'notify_endpoint_url',
      'Fully-qualified https URL of the notify-user edge function');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'notify_service_key') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'notify_service_key',
      'Supabase service_role JWT — notify-user honours this bearer for cross-user pushes');
  END IF;
END $$;
