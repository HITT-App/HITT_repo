-- AI plan generation infrastructure: user-owned plan tables + generation audit log.
--
-- Workout plans and meal plans share the same shape — a parent row with a
-- title, goal, generated_at, and status, plus a child table of day-by-day
-- items. Every plan is tied to the user who owns it (RLS enforced) and,
-- optionally, to a row in ai_generation_log so we can trace any plan back
-- to the prompt and LLM response that produced it.
--
-- The LLM code (provider, prompt, validation) lives in a separate edge
-- function that will be added later. This migration is data-layer only.

-- ai_generation_log --------------------------------------------------------
-- Every AI generation — plan, meal suggestion, coach message, form
-- analysis — gets a row here. Useful for debugging, cost monitoring, and
-- audit trail if a user claims the app suggested something harmful.

CREATE TABLE public.ai_generation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  generation_type TEXT NOT NULL,
  model TEXT,
  prompt JSONB NOT NULL,
  response JSONB,
  error TEXT,
  latency_ms INTEGER,
  input_tokens INTEGER,
  output_tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_generation_log_user_created
  ON public.ai_generation_log (user_id, created_at DESC);

CREATE INDEX idx_ai_generation_log_type_created
  ON public.ai_generation_log (generation_type, created_at DESC);

ALTER TABLE public.ai_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own generation log"
  ON public.ai_generation_log FOR SELECT
  USING (auth.uid() = user_id);

-- Writes come from edge functions via service role; no client INSERT policy.

-- user_workout_plans -------------------------------------------------------

CREATE TABLE public.user_workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sessions_per_week INTEGER,
  target_duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  generation_log_id UUID REFERENCES public.ai_generation_log(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_workout_plans_status_check CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX idx_user_workout_plans_user_status
  ON public.user_workout_plans (user_id, status, start_date DESC);

ALTER TABLE public.user_workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own workout plans"
  ON public.user_workout_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans"
  ON public.user_workout_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans"
  ON public.user_workout_plans FOR DELETE
  USING (auth.uid() = user_id);

-- user_workout_plan_items --------------------------------------------------
-- One row per scheduled workout within a plan. References a row in the
-- workouts catalogue — the LLM picks from what actually exists.

CREATE TABLE public.user_workout_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.user_workout_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE RESTRICT,
  scheduled_date DATE NOT NULL,
  day_index INTEGER NOT NULL,
  sequence_in_day INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled',
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  CONSTRAINT user_workout_plan_items_status_check CHECK (status IN ('scheduled', 'completed', 'skipped'))
);

CREATE INDEX idx_user_workout_plan_items_plan
  ON public.user_workout_plan_items (plan_id, scheduled_date, sequence_in_day);

CREATE INDEX idx_user_workout_plan_items_user_date
  ON public.user_workout_plan_items (user_id, scheduled_date);

ALTER TABLE public.user_workout_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan items"
  ON public.user_workout_plan_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plan items"
  ON public.user_workout_plan_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plan items"
  ON public.user_workout_plan_items FOR DELETE
  USING (auth.uid() = user_id);

-- user_meal_plans ----------------------------------------------------------

CREATE TABLE public.user_meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  goal TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_daily_calories INTEGER,
  target_daily_protein_grams INTEGER,
  dietary_restrictions TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  generation_log_id UUID REFERENCES public.ai_generation_log(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_meal_plans_status_check CHECK (status IN ('active', 'completed', 'abandoned'))
);

CREATE INDEX idx_user_meal_plans_user_status
  ON public.user_meal_plans (user_id, status, start_date DESC);

ALTER TABLE public.user_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal plans"
  ON public.user_meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans"
  ON public.user_meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans"
  ON public.user_meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- user_meal_plan_items -----------------------------------------------------
-- One row per meal in a plan. meal_id is nullable because meal plans can
-- reference ad-hoc suggestions (name + macros) in addition to rows in the
-- meals catalogue — especially early on when the catalogue is sparse.

CREATE TABLE public.user_meal_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.user_meal_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  meal_id UUID,
  scheduled_date DATE NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  protein_grams NUMERIC(6,1),
  fat_grams NUMERIC(6,1),
  carbs_grams NUMERIC(6,1),
  status TEXT NOT NULL DEFAULT 'scheduled',
  logged_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT user_meal_plan_items_status_check CHECK (status IN ('scheduled', 'logged', 'skipped')),
  CONSTRAINT user_meal_plan_items_category_check CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack'))
);

CREATE INDEX idx_user_meal_plan_items_plan_date
  ON public.user_meal_plan_items (plan_id, scheduled_date, category);

CREATE INDEX idx_user_meal_plan_items_user_date
  ON public.user_meal_plan_items (user_id, scheduled_date);

ALTER TABLE public.user_meal_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal plan items"
  ON public.user_meal_plan_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plan items"
  ON public.user_meal_plan_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plan items"
  ON public.user_meal_plan_items FOR DELETE
  USING (auth.uid() = user_id);
