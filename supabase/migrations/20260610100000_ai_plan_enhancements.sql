-- AI plan enhancements: why_text, intensity, plan_item back-link, plan_type/event_date

BEGIN;

-- Per-session "why this was chosen" explanation and intensity level
ALTER TABLE public.user_workout_plan_items
  ADD COLUMN IF NOT EXISTS why_text TEXT,
  ADD COLUMN IF NOT EXISTS intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high')),
  ADD COLUMN IF NOT EXISTS regenerated_at TIMESTAMPTZ;

-- Variable plan types (fixed duration, event countdown, rolling)
ALTER TABLE public.user_workout_plans
  ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (plan_type IN ('fixed', 'event', 'ongoing')),
  ADD COLUMN IF NOT EXISTS event_date DATE;

-- Back-link on scheduled_workouts so day-regeneration can find + update the right row
ALTER TABLE public.scheduled_workouts
  ADD COLUMN IF NOT EXISTS plan_item_id UUID
    REFERENCES public.user_workout_plan_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS why_text TEXT,
  ADD COLUMN IF NOT EXISTS intensity TEXT CHECK (intensity IN ('low', 'moderate', 'high'));

CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_plan_item
  ON public.scheduled_workouts (plan_item_id)
  WHERE plan_item_id IS NOT NULL;

COMMIT;
