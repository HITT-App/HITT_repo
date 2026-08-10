-- Recipes: meal-type categorisation + the owner pack's richer nutrition fields.
--
-- The owner's direction is to categorise by TYPE OF MEAL rather than by goal, for
-- browse variety. That frees `category` to hold a dish type (salad, curry, overnight_oats,
-- ...) and moves the goal axis into its own `goals` array — ai-coach still selects owner
-- recipes by goal, so the data cannot simply be dropped.

BEGIN;

-- 1. Two new meal slots for the pack's Desserts and Healthy Cheat Meals.
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_meal_type_check;
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_meal_type_check CHECK (meal_type IN (
    'breakfast', 'lunch', 'dinner', 'snack',
    'pre_workout', 'post_workout', 'recovery',
    'dessert', 'cheat_meal'
  ));

-- 2. Stable external key from the owner's drop (BRK-001, DIN-224, ...). Makes the seed
--    re-runnable without touching the 927 pre-existing owner rows, which have none.
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS external_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS recipes_external_id_key
  ON public.recipes (external_id) WHERE external_id IS NOT NULL;

-- 3. Goal axis, now that `category` carries the dish type.
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS goals TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS recipes_goals_idx ON public.recipes USING GIN (goals);

-- 4. Nutrition + serving detail the pack supplies and we currently have nowhere to put.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS fibre_g          NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS sugar_g          NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS salt_g           NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS saturated_fat_g  NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS sodium_mg        INTEGER,
  ADD COLUMN IF NOT EXISTS serving_size     TEXT,
  ADD COLUMN IF NOT EXISTS serving_weight_g INTEGER,
  ADD COLUMN IF NOT EXISTS swap_options     TEXT[] NOT NULL DEFAULT '{}';

COMMIT;
