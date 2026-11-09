-- Workouts that arrive from outside the app's own trackers (Apple Health, Garmin, the watch apps)
-- now count towards total workouts, the streak and the last workout date. Workouts recorded by
-- the in-app GPS tracker and gym timer (hitt_phone, and older rows with no source) are already
-- counted by the app when they finish, so they're left alone here.

CREATE OR REPLACE FUNCTION public.workout_counted_by_app(src text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$ SELECT src IS NULL OR src = 'hitt_phone' $$;

CREATE OR REPLACE FUNCTION public.count_imported_workout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta integer := 0;
  row_user uuid;
  -- HIIT's users are in the UK, and the app's own streak uses the phone's local date.
  day date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT workout_counted_by_app(NEW.source_platform) AND NEW.deleted_at IS NULL THEN delta := 1; END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT workout_counted_by_app(OLD.source_platform) AND OLD.deleted_at IS NULL THEN delta := -1; END IF;
  ELSE
    IF NOT workout_counted_by_app(NEW.source_platform) THEN
      IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN delta := -1;
      ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN delta := 1;
      END IF;
    END IF;
  END IF;

  IF delta = 0 THEN RETURN NULL; END IF;

  IF delta < 0 THEN
    UPDATE user_streaks SET total_workouts = greatest(total_workouts - 1, 0), updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN NULL;
  END IF;

  row_user := NEW.user_id;
  day := (NEW.started_at AT TIME ZONE 'Europe/London')::date;

  INSERT INTO user_streaks (user_id, total_workouts, current_streak, longest_streak, last_workout_date)
  VALUES (row_user, 1, 1, 1, day)
  ON CONFLICT (user_id) DO UPDATE SET
    total_workouts = user_streaks.total_workouts + 1,
    current_streak = CASE
      WHEN user_streaks.last_workout_date IS NULL THEN 1
      WHEN day = user_streaks.last_workout_date + 1 THEN user_streaks.current_streak + 1
      WHEN day > user_streaks.last_workout_date + 1 THEN 1
      ELSE user_streaks.current_streak
    END,
    longest_streak = greatest(user_streaks.longest_streak, CASE
      WHEN user_streaks.last_workout_date IS NULL THEN 1
      WHEN day = user_streaks.last_workout_date + 1 THEN user_streaks.current_streak + 1
      WHEN day > user_streaks.last_workout_date + 1 THEN 1
      ELSE user_streaks.current_streak
    END),
    last_workout_date = greatest(user_streaks.last_workout_date, day),
    updated_at = now();
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.count_imported_workout() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER count_imported_workout
AFTER INSERT OR DELETE OR UPDATE OF deleted_at ON public.activity_logs
FOR EACH ROW EXECUTE FUNCTION public.count_imported_workout();

-- One-off: past imported workouts join each user's total. Streaks aren't rebuilt from history.
INSERT INTO public.user_streaks (user_id, total_workouts)
SELECT user_id, count(*)
FROM public.activity_logs
WHERE deleted_at IS NULL AND NOT public.workout_counted_by_app(source_platform)
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_workouts = user_streaks.total_workouts + EXCLUDED.total_workouts,
  updated_at = now();
