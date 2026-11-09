-- 20261109120000 added past imported workouts to totals but left last_workout_date alone, so a
-- profile could say "Last workout: Jul 2" with a newer Garmin or Apple Health workout on record.
-- Moves the date forward only; streaks are unchanged.
UPDATE public.user_streaks s
SET last_workout_date = latest.day, updated_at = now()
FROM (
  SELECT user_id, max((started_at AT TIME ZONE 'Europe/London')::date) AS day
  FROM public.activity_logs
  WHERE deleted_at IS NULL AND NOT public.workout_counted_by_app(source_platform)
  GROUP BY user_id
) latest
WHERE s.user_id = latest.user_id
  AND (s.last_workout_date IS NULL OR latest.day > s.last_workout_date);
