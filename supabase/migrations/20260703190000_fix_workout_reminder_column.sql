-- workouts.name doesn't exist — the correct column is workouts.title.
-- Both cron functions I wrote (fire_workout_reminders in
-- 20260703160000 and fire_missed_workout_notifications in
-- 20260703170000) reference the wrong column, so any real
-- reminder attempt fails silently in the trigger. Fix both here.

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

  IF v_endpoint IS NULL OR v_service_key IS NULL THEN RETURN; END IF;

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
    SELECT COALESCE(title, 'Your workout') INTO v_workout_name
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
    SELECT COALESCE(title, 'Your workout') INTO v_workout_name
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
