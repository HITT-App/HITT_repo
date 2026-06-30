-- Extend public.recipes to accept the owner-curated meal library (~660 rows
-- across lose_weight / gain_weight / build_muscle / recovery categories with
-- Breakfast/Lunch/Dinner/Snack/Pre-Workout/Post-Workout/Recovery slots).
--
-- Backwards compatible: existing 30 seed rows keep their values, get
-- source = 'legacy'.

-- 1. Drop the restrictive CHECK constraints (auto-named recipes_category_check
--    and recipes_meal_type_check from the original CREATE TABLE).
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_category_check;
ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_meal_type_check;

-- 2. Widen macro columns from INT to NUMERIC(5,1). Owner data is to 1dp
--    (e.g. 20.4g protein); INT silently truncates.
--    Postgres won't ALTER COLUMN TYPE on a column referenced by a view, so
--    drop recipes_full first and recreate it after the ALTER + new column.
DROP VIEW IF EXISTS public.recipes_full;

ALTER TABLE public.recipes
  ALTER COLUMN protein_g TYPE NUMERIC(5,1) USING protein_g::numeric,
  ALTER COLUMN carbs_g   TYPE NUMERIC(5,1) USING carbs_g::numeric,
  ALTER COLUMN fat_g     TYPE NUMERIC(5,1) USING fat_g::numeric;

-- 3. Source column — distinguishes owner-curated recipes from the legacy seed
--    and any future imports. Jarvis ranks 'owner' first.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'legacy';

-- 4. Re-add the meal_type CHECK with the new slot vocabulary. Category stays
--    unconstrained — categories will evolve.
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_meal_type_check CHECK (meal_type IN (
    'breakfast', 'lunch', 'dinner', 'snack',
    'pre_workout', 'post_workout', 'recovery'
  ));

-- 5. Indexes for the query patterns Jarvis uses
CREATE INDEX IF NOT EXISTS recipes_source_idx     ON public.recipes (source);
CREATE INDEX IF NOT EXISTS recipes_category_idx   ON public.recipes (category);
CREATE INDEX IF NOT EXISTS recipes_meal_type_idx  ON public.recipes (meal_type);

-- 6. Recreate recipes_full view (dropped in step 2). Includes the new source
--    column so callers can filter to owner-curated meals.
CREATE OR REPLACE VIEW public.recipes_full AS
SELECT
  r.id,
  r.name,
  r.emoji,
  r.category,
  r.meal_type,
  r.description,
  r.calories,
  r.protein_g,
  r.carbs_g,
  r.fat_g,
  r.veg_swap,
  r.vegan_swap,
  r.source,
  r.allergens,
  r.dietary_tags,
  COALESCE(
    (SELECT json_agg(jsonb_build_object('sort_order', i.sort_order, 'item', i.item) ORDER BY i.sort_order)
     FROM public.ingredients i WHERE i.recipe_id = r.id),
    '[]'
  ) AS ingredients,
  COALESCE(
    (SELECT json_agg(jsonb_build_object('step_number', s.step_number, 'instruction', s.instruction) ORDER BY s.step_number)
     FROM public.steps s WHERE s.recipe_id = r.id),
    '[]'
  ) AS steps
FROM public.recipes r;
