-- Task #115 — state what the nutrition figures are FOR.
--
-- `recipes` has carried calories/protein/carbs/fat since 20260427090000 with no
-- servings column, and Browse Meals showed no portion label. So a user comparing an
-- ingredient list against "412 kcal" had no way to know whether that figure covered
-- the whole dish or one plate. That ambiguity is half of the reported
-- "ingredients don't match the nutrition values" problem; the other half (macros never
-- derived from the ingredients) is fixed in 20260729140000.
--
-- Every seeded recipe is single-serving: ingredient amounts are per person
-- ("200g chicken breast", "150g rice"), and the macros are per person. So the
-- backfill is 1, and the column is NOT NULL with a default of 1 so future rows
-- have to be explicit about it.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS servings INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.recipes.servings IS
  'Number of servings the ingredient list makes. calories/protein_g/carbs_g/fat_g are '
  'PER SERVING, not for the whole dish.';

-- Guard against a 0 or negative slipping in and making per-serving maths divide by zero.
ALTER TABLE public.recipes
  DROP CONSTRAINT IF EXISTS recipes_servings_positive;
ALTER TABLE public.recipes
  ADD CONSTRAINT recipes_servings_positive CHECK (servings > 0);
