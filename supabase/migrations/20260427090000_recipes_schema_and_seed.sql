-- ============================================================
-- FUELFORM RECIPES — SUPABASE SCHEMA + SEED DATA
-- Source: recipes_supabase_schema_and_seed_sql.pdf (owner-supplied)
-- Note: PDF was cut off mid-document. Only MUSCLE category recipes
--       visible (4 recipes). Fat + Lean categories to be added when
--       owner supplies the remainder of the seed data.
-- ============================================================

-- ------------------------------------------------------------
-- TABLES
-- ------------------------------------------------------------

CREATE TABLE public.recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  emoji       TEXT,
  category    TEXT NOT NULL CHECK (category IN ('muscle', 'fat', 'lean')),
  meal_type   TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  description TEXT,
  calories    INT,
  protein_g   INT,
  carbs_g     INT,
  fat_g       INT,
  veg_swap    TEXT,
  vegan_swap  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  item        TEXT NOT NULL,
  sort_order  INT
);

CREATE TABLE public.steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  instruction TEXT NOT NULL
);

-- RLS: readable by all authenticated users, writable by admins only
ALTER TABLE public.recipes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_read"      ON public.recipes    FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_read"  ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "steps_read"        ON public.steps      FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------
-- SEED: MUSCLE CATEGORY
-- ------------------------------------------------------------

-- Steak & Sweet Potato Power Bowl
WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Steak & Sweet Potato Power Bowl',
    '🥩',
    'muscle',
    'dinner',
    'High-protein iron-rich steak over caramelised sweet potato with spinach and chimichurri.',
    720, 58, 65, 22,
    'Replace steak with 200g halloumi or 2 large portobello mushrooms, grilled.',
    'Use 200g smoky marinated tempeh or black bean patty. Add hemp seeds for extra protein.'
  )
  RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g sirloin steak',
  '1 large sweet potato',
  '2 cups baby spinach',
  '½ avocado',
  'chimichurri sauce',
  'olive oil',
  'garlic',
  'sea salt'
]), generate_series(1,8) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Steak & Sweet Potato Power Bowl')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r,
(VALUES
  (1, 'Cube and roast sweet potato at 200°C for 25 min.'),
  (2, 'Season steak, sear 3 min each side. Rest 5 min.'),
  (3, 'Layer spinach, sweet potato, sliced steak and avocado.'),
  (4, 'Drizzle chimichurri and serve.')
) AS s(n,txt);

-- Greek Yoghurt Protein Pancakes
WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Greek Yoghurt Protein Pancakes',
    '🥞',
    'muscle',
    'breakfast',
    'Fluffy high-protein pancakes made with oats, eggs and Greek yoghurt — 40g protein per serving.',
    510, 40, 55, 12,
    'Already vegetarian! Use plant-based yoghurt and swap honey for maple syrup.',
    'Use flax eggs (1 tbsp flaxseed + 3 tbsp water each), oat-based yoghurt, and maple syrup.'
  )
  RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '1 cup oats (blended)',
  '200g Greek yoghurt',
  '3 eggs',
  '1 tsp baking powder',
  '1 tbsp honey',
  '1 tsp vanilla',
  'berries to top'
]), generate_series(1,7) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Greek Yoghurt Protein Pancakes')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r,
(VALUES
  (1, 'Blend oats to flour. Mix all ingredients into batter.'),
  (2, 'Heat non-stick pan, pour ¼ cup portions.'),
  (3, 'Cook 2 min per side until golden.'),
  (4, 'Top with berries and extra yoghurt.')
) AS s(n,txt);

-- Salmon & Quinoa Muscle Plate
WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Salmon & Quinoa Muscle Plate',
    '🐟',
    'muscle',
    'lunch',
    'Omega-3 loaded salmon with protein-dense quinoa, edamame and sesame miso dressing.',
    680, 52, 58, 20,
    'Replace salmon with 200g pan-fried tofu or 2 fried eggs for similar omega fats.',
    'Seared tofu or nori-wrapped avocado for sea-like flavour. Add algae oil for omega-3.'
  )
  RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '180g salmon fillet',
  '¾ cup quinoa',
  '½ cup edamame',
  'cucumber',
  'radish',
  'miso paste',
  'sesame oil',
  'rice vinegar',
  'ginger'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Salmon & Quinoa Muscle Plate')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r,
(VALUES
  (1, 'Cook quinoa per packet. Cool slightly.'),
  (2, 'Pan-sear salmon skin-side down 4 min, flip 2 min.'),
  (3, 'Whisk miso, sesame oil, vinegar, ginger for dressing.'),
  (4, 'Assemble bowl and drizzle dressing.')
) AS s(n,txt);

-- Chicken Burrito Bowl
-- NOTE: step 3 instruction was cut off in source PDF — marked TODO
WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Chicken Burrito Bowl',
    '🌯',
    'muscle',
    'lunch',
    'Lean chicken thigh, black beans, brown rice, charred corn and smoky chipotle crema.',
    750, 55, 80, 16,
    'Swap chicken for grilled halloumi strips or a double portion of black beans.',
    'Use seasoned jackfruit or double black beans. Replace sour cream crema with cashew cream.'
  )
  RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '220g chicken thighs',
  '1 cup brown rice',
  '½ cup black beans',
  'corn',
  'red onion',
  'chipotle in adobo',
  'sour cream',
  'lime',
  'coriander'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Chicken Burrito Bowl')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r,
(VALUES
  (1, 'Cook brown rice. Season and grill chicken.'),
  (2, 'Char corn in dry pan until slightly blackened.'),
  (3, 'TODO: step cut off in source PDF — owner to supply.')
) AS s(n,txt);

-- ============================================================
-- TODO: Fat + Lean category recipes missing from source PDF.
--       Owner to supply remainder and we will add in a follow-up migration.
-- ============================================================
