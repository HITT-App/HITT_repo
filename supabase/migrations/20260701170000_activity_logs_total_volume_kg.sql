-- Persist total training volume (Σ weight × reps across all sets) on gym
-- workouts so the Strength share card can render "Volume · X,XXX kg" from
-- activity_logs directly. Nullable — legacy rows and non-strength activities
-- both stay NULL.

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS total_volume_kg NUMERIC(8,1);
