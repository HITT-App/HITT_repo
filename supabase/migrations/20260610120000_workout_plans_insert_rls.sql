-- Add missing INSERT policies for user_workout_plans and user_workout_plan_items
-- Original migration only created SELECT/UPDATE/DELETE policies

BEGIN;

CREATE POLICY "Users can insert their own workout plans"
  ON public.user_workout_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan items"
  ON public.user_workout_plan_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMIT;
