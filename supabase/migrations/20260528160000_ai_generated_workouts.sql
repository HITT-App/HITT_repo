-- =============================================
-- Migration: AI-generated workout support
-- Adds inline workout content to scheduled_workouts,
-- workout_progress, and user_workout_plan_items so
-- workouts no longer must reference the catalogue.
-- Mirrors the existing meal-side ad-hoc pattern.
-- =============================================

BEGIN;

-- ---------- scheduled_workouts ----------

ALTER TABLE scheduled_workouts
  ADD COLUMN workout_source text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN workout_title text,
  ADD COLUMN workout_description text,
  ADD COLUMN exercises_snapshot jsonb,
  ADD COLUMN estimated_duration_minutes integer,
  ADD COLUMN estimated_calories integer;

ALTER TABLE scheduled_workouts
  DROP CONSTRAINT scheduled_workouts_workout_id_fkey,
  ADD CONSTRAINT scheduled_workouts_workout_id_fkey
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

ALTER TABLE scheduled_workouts
  ALTER COLUMN workout_id DROP NOT NULL;

ALTER TABLE scheduled_workouts
  ADD CONSTRAINT scheduled_workouts_source_check
    CHECK (
      (workout_source = 'catalogue' AND workout_id IS NOT NULL)
      OR
      (workout_source = 'ai_generated' AND workout_title IS NOT NULL AND exercises_snapshot IS NOT NULL)
    );

-- ---------- workout_progress ----------

ALTER TABLE workout_progress
  ADD COLUMN workout_source text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN workout_title text,
  ADD COLUMN workout_description text,
  ADD COLUMN exercises_snapshot jsonb,
  ADD COLUMN estimated_duration_minutes integer,
  ADD COLUMN estimated_calories integer;

ALTER TABLE workout_progress
  DROP CONSTRAINT workout_progress_workout_id_fkey,
  ADD CONSTRAINT workout_progress_workout_id_fkey
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

ALTER TABLE workout_progress
  ALTER COLUMN workout_id DROP NOT NULL;

ALTER TABLE workout_progress
  ADD CONSTRAINT workout_progress_source_check
    CHECK (
      (workout_source = 'catalogue' AND workout_id IS NOT NULL)
      OR
      (workout_source = 'ai_generated' AND workout_title IS NOT NULL AND exercises_snapshot IS NOT NULL)
    );

-- ---------- user_workout_plan_items ----------

ALTER TABLE user_workout_plan_items
  ADD COLUMN workout_source text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN workout_title text,
  ADD COLUMN workout_description text,
  ADD COLUMN exercises_snapshot jsonb,
  ADD COLUMN estimated_duration_minutes integer,
  ADD COLUMN estimated_calories integer;

ALTER TABLE user_workout_plan_items
  DROP CONSTRAINT user_workout_plan_items_workout_id_fkey,
  ADD CONSTRAINT user_workout_plan_items_workout_id_fkey
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

ALTER TABLE user_workout_plan_items
  ALTER COLUMN workout_id DROP NOT NULL;

ALTER TABLE user_workout_plan_items
  ADD CONSTRAINT user_workout_plan_items_source_check
    CHECK (
      (workout_source = 'catalogue' AND workout_id IS NOT NULL)
      OR
      (workout_source = 'ai_generated' AND workout_title IS NOT NULL AND exercises_snapshot IS NOT NULL)
    );

-- ---------- Option A backfill ----------
-- Populate exercises_snapshot for existing catalogue rows.
-- Uses actual workout_exercises column names: title (not name),
-- order_index (not exercise_order), no rest_seconds.
-- scheduled_workouts: 0 rows. workout_progress: 1 row.
-- user_workout_plan_items: 0 rows. Backfill is trivial.

UPDATE scheduled_workouts sw
SET exercises_snapshot = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'title',              we.title,
      'description',        we.description,
      'duration_seconds',   we.duration_seconds,
      'sets',               we.sets,
      'reps',               we.reps,
      'order_index',        we.order_index,
      'body_area',          we.body_area,
      'thumbnail_url',      we.thumbnail_url,
      'video_url',          we.video_url
    ) ORDER BY we.order_index
  )
  FROM workout_exercises we
  WHERE we.workout_id = sw.workout_id
)
WHERE sw.workout_source = 'catalogue'
  AND sw.workout_id IS NOT NULL;

UPDATE workout_progress wp
SET exercises_snapshot = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'title',              we.title,
      'description',        we.description,
      'duration_seconds',   we.duration_seconds,
      'sets',               we.sets,
      'reps',               we.reps,
      'order_index',        we.order_index,
      'body_area',          we.body_area,
      'thumbnail_url',      we.thumbnail_url,
      'video_url',          we.video_url
    ) ORDER BY we.order_index
  )
  FROM workout_exercises we
  WHERE we.workout_id = wp.workout_id
)
WHERE wp.workout_source = 'catalogue'
  AND wp.workout_id IS NOT NULL;

UPDATE user_workout_plan_items upwi
SET exercises_snapshot = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'title',              we.title,
      'description',        we.description,
      'duration_seconds',   we.duration_seconds,
      'sets',               we.sets,
      'reps',               we.reps,
      'order_index',        we.order_index,
      'body_area',          we.body_area,
      'thumbnail_url',      we.thumbnail_url,
      'video_url',          we.video_url
    ) ORDER BY we.order_index
  )
  FROM workout_exercises we
  WHERE we.workout_id = upwi.workout_id
)
WHERE upwi.workout_source = 'catalogue'
  AND upwi.workout_id IS NOT NULL;

COMMIT;
