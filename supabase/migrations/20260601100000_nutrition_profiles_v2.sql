ALTER TABLE public.nutrition_profiles
  ADD COLUMN IF NOT EXISTS calorie_method TEXT CHECK (calorie_method IN ('manual', 'calculated')),
  ADD COLUMN IF NOT EXISTS weight_goal TEXT CHECK (weight_goal IN ('lose', 'maintain', 'gain')),
  ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
  ADD COLUMN IF NOT EXISTS onboarding_skipped BOOLEAN DEFAULT FALSE;
