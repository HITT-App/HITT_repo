-- Restore the keto meal library that was wiped by the owner-meals seed.
--
-- Background: 20260701120000 seeds 165 general keto recipes and 20260701130000
-- adds 30 vegetarian/dairy-free keto recipes (195 total). The later
-- 20260702000001_seed_owner_meals.sql originally ran an unscoped
-- `DELETE FROM public.recipes WHERE source = 'owner'`, which deleted every keto
-- row on any database where migrations applied in timestamp order. That seed's
-- DELETE is now category-scoped, so fresh databases keep their keto rows — but
-- databases that already applied the destructive version (e.g. production)
-- need them put back.
--
-- Insert-only, no destructive DELETE. The whole thing is guarded: it inserts
-- only when the database currently has zero keto recipes, so it is a no-op on
-- fresh databases (where the keto seeds already ran) and a one-time repair on
-- databases that lost them. Safe to re-run.

BEGIN;

DO $reseed$
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipes WHERE category = 'keto') THEN
    RAISE NOTICE 'Keto recipes already present — skipping keto reseed.';
    RETURN;
  END IF;

-- ── From 20260701120000_seed_owner_keto_meals.sql (165 general keto) ─────────

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Egg Whites with Cauliflower Rice & Cucumber',
    'keto',
    'breakfast',
    218,
    19,
    10.4,
    10.5,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'sesame', 'soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '20g almonds', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the egg whites and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Bacon (Smoked Back) with Cabbage (Shredded) & Kale',
    'keto',
    'breakfast',
    545,
    36,
    6.3,
    40.3,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '20g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the bacon (smoked back) and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Bacon (Smoked Back) with Cauliflower Rice & Asparagus Tips',
    'keto',
    'breakfast',
    586,
    35.6,
    9.4,
    44.6,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '20g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the bacon (smoked back) and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Salmon Fillet with Cauliflower Rice & Celery',
    'keto',
    'breakfast',
    322,
    32,
    7,
    18.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '20g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the salmon fillet and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Egg Whites with Cabbage (Shredded) & Leeks',
    'keto',
    'breakfast',
    224,
    18.2,
    11,
    11.1,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '20g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the egg whites and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Salmon Fillet with Cauliflower Rice & Olives',
    'keto',
    'breakfast',
    468,
    31.6,
    5.2,
    35.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the salmon fillet and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Whole Eggs with Broccoli Florets & Baby Spinach',
    'keto',
    'breakfast',
    319,
    25.4,
    8.9,
    19.3,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g whole eggs', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '20g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the whole eggs and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Firm Tofu with Courgette Noodles (Zoodles) & Mixed Salad Leaves',
    'keto',
    'breakfast',
    322,
    25.6,
    11.3,
    21,
    ARRAY['vegan'],
    ARRAY['soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '20g almonds', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the firm tofu and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Salmon Fillet with Broccoli Florets & Courgette',
    'keto',
    'breakfast',
    377,
    37.2,
    7.9,
    22.5,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '20g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the salmon fillet and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Egg Whites with Cabbage (Shredded) & Kale',
    'keto',
    'breakfast',
    246,
    14.4,
    6.8,
    16.5,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '20g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the egg whites and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Bacon (Smoked Back) with Broccoli Florets & Asparagus Tips',
    'keto',
    'breakfast',
    588,
    36.4,
    12,
    43.9,
    ARRAY['omnivore'],
    ARRAY['sesame', 'soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '20g almonds', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the bacon (smoked back) and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Bacon (Smoked Back) with Courgette Noodles (Zoodles) & Cauliflower',
    'keto',
    'breakfast',
    577,
    34.4,
    8.7,
    44.6,
    ARRAY['omnivore'],
    ARRAY['sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g cauliflower', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cauliflower for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the bacon (smoked back) and cauliflower.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Bacon (Smoked Back) with Cauliflower Rice & Baby Spinach',
    'keto',
    'breakfast',
    586,
    35.6,
    9.4,
    44.6,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '20g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the bacon (smoked back) and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Firm Tofu with Cabbage (Shredded) & Baby Spinach',
    'keto',
    'breakfast',
    334,
    25.4,
    12.6,
    21.7,
    ARRAY['vegan'],
    ARRAY['soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '20g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the firm tofu and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Egg Whites with Broccoli Florets & Olives',
    'keto',
    'breakfast',
    286,
    15.4,
    8.4,
    20.6,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the egg whites and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Salmon Fillet with Cabbage (Shredded) & Celery',
    'keto',
    'breakfast',
    468,
    31,
    6,
    35.7,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the salmon fillet and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Bacon (Smoked Back) with Cauliflower Rice & Red Onion',
    'keto',
    'breakfast',
    545,
    36.6,
    5.5,
    40.4,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '20g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the bacon (smoked back) and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Firm Tofu with Courgette Noodles (Zoodles) & Baby Spinach',
    'keto',
    'breakfast',
    385,
    21.4,
    6.9,
    31,
    ARRAY['vegan', 'gluten-free'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the firm tofu and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Salmon Fillet with Cauliflower Rice & Mixed Salad Leaves',
    'keto',
    'breakfast',
    411,
    35.6,
    9.4,
    26.6,
    ARRAY['pescatarian'],
    ARRAY['fish', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '20g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the salmon fillet and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb Halloumi with Courgette Noodles (Zoodles) & Leeks',
    'keto',
    'breakfast',
    627,
    33.4,
    5.1,
    51.4,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g halloumi', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the halloumi and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Salmon Fillet with Broccoli Florets & Kale',
    'keto',
    'breakfast',
    365,
    33.4,
    8.4,
    22.7,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '20g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the salmon fillet and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Salmon Fillet with Courgette Noodles (Zoodles) & Chestnut Mushrooms',
    'keto',
    'breakfast',
    460,
    31,
    4.5,
    35.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the salmon fillet and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Firm Tofu with Broccoli Florets & Green Beans',
    'keto',
    'breakfast',
    339,
    26,
    14.2,
    21.9,
    ARRAY['vegan'],
    ARRAY['sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the firm tofu and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Egg Whites with Cauliflower Rice & Kale',
    'keto',
    'breakfast',
    281,
    14.8,
    6,
    20.5,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the egg whites and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Bacon (Smoked Back) with Broccoli Florets & Kale',
    'keto',
    'breakfast',
    540,
    33.4,
    8.4,
    40.7,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '20g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the bacon (smoked back) and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Egg Whites with Cauliflower Rice & Cauliflower',
    'keto',
    'breakfast',
    189,
    22.4,
    6,
    6.3,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g cauliflower', 2),
    ((SELECT id FROM new_recipe), '20g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cauliflower for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the egg whites and cauliflower.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Salmon Fillet with Courgette Noodles (Zoodles) & Baby Spinach',
    'keto',
    'breakfast',
    427,
    31.1,
    4.5,
    32,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '20g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the salmon fillet and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Egg Whites with Broccoli Florets & Cauliflower',
    'keto',
    'breakfast',
    196,
    23,
    8.4,
    6.4,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g cauliflower', 2),
    ((SELECT id FROM new_recipe), '20g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cauliflower for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the egg whites and cauliflower.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Egg Whites with Cauliflower Rice & Avocado Slices',
    'keto',
    'breakfast',
    220,
    19.8,
    10,
    10.5,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g avocado slices', 2),
    ((SELECT id FROM new_recipe), '20g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the avocado slices, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the egg whites and avocado slices.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Whole Eggs with Courgette Noodles (Zoodles) & Olives',
    'keto',
    'breakfast',
    339,
    20,
    10,
    24.2,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g whole eggs', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '20g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the whole eggs and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Firm Tofu with Cauliflower Rice & Kale',
    'keto',
    'breakfast',
    245,
    22.4,
    9.4,
    14,
    ARRAY['vegan', 'gluten-free'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '20g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the firm tofu and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Egg Whites with Courgette Noodles (Zoodles) & Celery',
    'keto',
    'breakfast',
    186,
    14.6,
    5.9,
    10.1,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '20ml double cream', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the egg whites and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Bacon (Smoked Back) with Cabbage (Shredded) & Cauliflower',
    'keto',
    'breakfast',
    497,
    31.4,
    7.8,
    36.7,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '80g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g cauliflower', 2),
    ((SELECT id FROM new_recipe), '20g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cauliflower for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the bacon (smoked back) and cauliflower.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Salmon Fillet with Cauliflower Rice & Cherry Tomatoes',
    'keto',
    'breakfast',
    322,
    32,
    7,
    18.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '80g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '20g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the salmon fillet and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Egg Whites with Courgette Noodles (Zoodles) & Celery',
    'keto',
    'breakfast',
    217,
    18.2,
    9.5,
    11.3,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '20g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the egg whites and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 20g mixed nuts and a final crack of black pepper. Serve immediately.'),
    ((SELECT id FROM new_recipe), 7, 'Lunch (45 recipes)');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Mackerel with Broccoli Florets & Courgette',
    'keto',
    'lunch',
    585,
    31.3,
    9,
    46.3,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g mackerel', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the mackerel generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the mackerel poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the mackerel and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Chicken Breast with Cauliflower Rice & Avocado Slices',
    'keto',
    'lunch',
    393,
    54.8,
    6.3,
    14,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g chicken breast', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g avocado slices', 2),
    ((SELECT id FROM new_recipe), '25g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken breast generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken breast poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the avocado slices, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the chicken breast and avocado slices.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Chicken Thigh (Skin-On) with Courgette Noodles (Zoodles) & Olives',
    'keto',
    'lunch',
    535,
    43.5,
    10.1,
    35.3,
    ARRAY['omnivore'],
    ARRAY['peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g chicken thigh (skin-on)', 0),
    ((SELECT id FROM new_recipe), '100g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '25g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken thigh (skin-on) generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken thigh (skin-on) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the chicken thigh (skin-on) and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb King Prawns with Shirataki Noodles & Olives',
    'keto',
    'lunch',
    323,
    41.3,
    10.8,
    13,
    ARRAY['pescatarian'],
    ARRAY['crustaceans', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g king prawns', 0),
    ((SELECT id FROM new_recipe), '100g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '25g almonds', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the king prawns and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Pork Tenderloin with Turnip (Roasted) & Baby Spinach',
    'keto',
    'lunch',
    375,
    40.4,
    9.1,
    17.4,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g pork tenderloin', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '25ml double cream', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork tenderloin generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork tenderloin griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the pork tenderloin and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Haddock Fillet with Cauliflower Rice & Mixed Salad Leaves',
    'keto',
    'lunch',
    373,
    33.7,
    6,
    21.5,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g haddock fillet', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '25g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the haddock fillet generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the haddock fillet grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the haddock fillet and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Haddock Fillet with Courgette Noodles (Zoodles) & Green Beans',
    'keto',
    'lunch',
    409,
    32.7,
    5.1,
    26.2,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g haddock fillet', 0),
    ((SELECT id FROM new_recipe), '100g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the haddock fillet generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the haddock fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the haddock fillet and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Turkey Breast with Celeriac Mash & Tenderstem Broccoli',
    'keto',
    'lunch',
    444,
    45.4,
    11,
    22.8,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g turkey breast', 0),
    ((SELECT id FROM new_recipe), '100g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '25g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the turkey breast generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the turkey breast griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the turkey breast and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Lamb Leg with Swede (Mashed) & Cherry Tomatoes',
    'keto',
    'lunch',
    551,
    38.5,
    9.9,
    38.7,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g lamb leg', 0),
    ((SELECT id FROM new_recipe), '100g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lamb leg generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lamb leg grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the lamb leg and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb Haddock Fillet with Turnip (Roasted) & Mixed Salad Leaves',
    'keto',
    'lunch',
    237,
    32.9,
    10.7,
    4.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g haddock fillet', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '25g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the haddock fillet generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the haddock fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the haddock fillet and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Beef Ribeye Steak with Shirataki Noodles & Mixed Peppers',
    'keto',
    'lunch',
    615,
    40.3,
    10.3,
    46.5,
    ARRAY['omnivore'],
    ARRAY['sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g beef ribeye steak', 0),
    ((SELECT id FROM new_recipe), '100g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the beef ribeye steak generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the beef ribeye steak poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the beef ribeye steak and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Chicken Thigh (Skin-On) with Shirataki Noodles & Mixed Peppers',
    'keto',
    'lunch',
    604,
    36,
    5,
    47.5,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g chicken thigh (skin-on)', 0),
    ((SELECT id FROM new_recipe), '100g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken thigh (skin-on) generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken thigh (skin-on) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the chicken thigh (skin-on) and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Cod Fillet with Broccoli Florets & Kale',
    'keto',
    'lunch',
    359,
    43.6,
    14,
    14,
    ARRAY['pescatarian'],
    ARRAY['fish', 'peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g cod fillet', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '25g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the cod fillet generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the cod fillet poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the cod fillet and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Egg Whites with Turnip (Roasted) & Tenderstem Broccoli',
    'keto',
    'lunch',
    234,
    26.9,
    9.5,
    7.7,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g egg whites', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '25g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the egg whites and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Pork Tenderloin with Cauliflower Rice & Avocado Slices',
    'keto',
    'lunch',
    481,
    41,
    6,
    30.6,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g pork tenderloin', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g avocado slices', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork tenderloin generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork tenderloin poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the avocado slices, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the pork tenderloin and avocado slices.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Lamb Leg with Courgette Noodles (Zoodles) & Green Beans',
    'keto',
    'lunch',
    486,
    38.9,
    5.1,
    34.1,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g lamb leg', 0),
    ((SELECT id FROM new_recipe), '100g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '25g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lamb leg generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lamb leg roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the lamb leg and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Pork Tenderloin with Broccoli Florets & Baby Spinach',
    'keto',
    'lunch',
    416,
    48.1,
    14,
    18.2,
    ARRAY['omnivore'],
    ARRAY['peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g pork tenderloin', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '25g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork tenderloin generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork tenderloin stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the pork tenderloin and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Sardines with Broccoli Florets & Green Beans',
    'keto',
    'lunch',
    515,
    44.6,
    14.3,
    30.4,
    ARRAY['pescatarian'],
    ARRAY['fish', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g sardines', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the sardines generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the sardines roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the sardines and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb Beef Ribeye Steak with Broccoli Florets & Cherry Tomatoes',
    'keto',
    'lunch',
    576,
    40.3,
    10,
    41.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g beef ribeye steak', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the beef ribeye steak generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the beef ribeye steak oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the beef ribeye steak and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Pork Tenderloin with Turnip (Roasted) & Olives',
    'keto',
    'lunch',
    375,
    40.4,
    9.1,
    17.4,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g pork tenderloin', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '25ml double cream', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork tenderloin generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork tenderloin grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the pork tenderloin and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Whole Eggs with Turnip (Roasted) & Mixed Salad Leaves',
    'keto',
    'lunch',
    321,
    20.9,
    12.3,
    20.4,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g whole eggs', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '25g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the whole eggs and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Firm Tofu with Turnip (Roasted) & Red Onion',
    'keto',
    'lunch',
    350,
    27.9,
    12.4,
    22.1,
    ARRAY['vegan', 'gluten-free'],
    ARRAY['dairy', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the firm tofu and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Lamb Leg with Cabbage (Shredded) & Red Onion',
    'keto',
    'lunch',
    460,
    44.1,
    12.5,
    26.1,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g lamb leg', 0),
    ((SELECT id FROM new_recipe), '100g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '25g almonds', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lamb leg generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lamb leg air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the lamb leg and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Mackerel with Cabbage (Shredded) & Tenderstem Broccoli',
    'keto',
    'lunch',
    438,
    31.3,
    8,
    29.5,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g mackerel', 0),
    ((SELECT id FROM new_recipe), '100g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the mackerel generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the mackerel poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the mackerel and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Pork Belly (Slow-Roasted) with Cabbage (Shredded) & Red Onion',
    'keto',
    'lunch',
    723,
    29.8,
    8,
    61.1,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g pork belly (slow-roasted)', 0),
    ((SELECT id FROM new_recipe), '100g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork belly (slow-roasted) generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork belly (slow-roasted) slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the pork belly (slow-roasted) and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Whole Eggs with Broccoli Florets & Mixed Peppers',
    'keto',
    'lunch',
    508,
    22.3,
    10.7,
    41.9,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g whole eggs', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the whole eggs and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb King Prawns with Broccoli Florets & Asparagus Tips',
    'keto',
    'lunch',
    351,
    43.1,
    14.6,
    14.4,
    ARRAY['pescatarian'],
    ARRAY['crustaceans', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g king prawns', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the king prawns and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Halloumi with Broccoli Florets & Chestnut Mushrooms',
    'keto',
    'lunch',
    752,
    43.4,
    9.8,
    59.7,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g halloumi', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '25g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the halloumi and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Salmon Fillet with Swede (Mashed) & Mixed Salad Leaves',
    'keto',
    'lunch',
    593,
    38.5,
    9.9,
    44.7,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '100g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the salmon fillet and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Firm Tofu with Celeriac Mash & Red Onion',
    'keto',
    'lunch',
    390,
    27.8,
    14.7,
    25.8,
    ARRAY['vegan', 'gluten-free'],
    ARRAY['dairy', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '25ml double cream', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the firm tofu and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Bacon (Smoked Back) with Celeriac Mash & Green Beans',
    'keto',
    'lunch',
    740,
    45.6,
    16,
    54.8,
    ARRAY['omnivore'],
    ARRAY['peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '100g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '25g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the bacon (smoked back) and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Firm Tofu with Turnip (Roasted) & Mixed Peppers',
    'keto',
    'lunch',
    350,
    27.9,
    12.4,
    22.1,
    ARRAY['vegan', 'gluten-free'],
    ARRAY['dairy', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the firm tofu and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Firm Tofu with Swede (Mashed) & Cucumber',
    'keto',
    'lunch',
    419,
    31.8,
    18.4,
    26.2,
    ARRAY['vegan'],
    ARRAY['soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '25g almonds', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the firm tofu and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Mackerel with Celeriac Mash & Baby Spinach',
    'keto',
    'lunch',
    521,
    35.3,
    16.3,
    34.7,
    ARRAY['pescatarian'],
    ARRAY['fish', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g mackerel', 0),
    ((SELECT id FROM new_recipe), '100g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '25g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the mackerel generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the mackerel roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the mackerel and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Pork Belly (Slow-Roasted) with Turnip (Roasted) & Cauliflower',
    'keto',
    'lunch',
    753,
    28.4,
    9.1,
    64.6,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g pork belly (slow-roasted)', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g cauliflower', 2),
    ((SELECT id FROM new_recipe), '25ml double cream', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork belly (slow-roasted) generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork belly (slow-roasted) oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cauliflower for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the pork belly (slow-roasted) and cauliflower.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced King Prawns with Swede (Mashed) & Mixed Salad Leaves',
    'keto',
    'lunch',
    386,
    37.2,
    10.2,
    20.9,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['crustaceans', 'dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g king prawns', 0),
    ((SELECT id FROM new_recipe), '100g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '25g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the king prawns and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Firm Tofu with Celeriac Mash & Cucumber',
    'keto',
    'lunch',
    364,
    28.8,
    15,
    22.3,
    ARRAY['vegan', 'gluten-free'],
    ARRAY['dairy', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the firm tofu and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Sardines with Turnip (Roasted) & Celery',
    'keto',
    'lunch',
    446,
    39.9,
    9.4,
    25.1,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g sardines', 0),
    ((SELECT id FROM new_recipe), '100g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the sardines generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the sardines slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the sardines and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Mackerel with Celeriac Mash & Cucumber',
    'keto',
    'lunch',
    482,
    30.8,
    11.7,
    33.2,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g mackerel', 0),
    ((SELECT id FROM new_recipe), '100g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '25ml double cream', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the mackerel generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the mackerel stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the mackerel and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Sardines with Broccoli Florets & Courgette',
    'keto',
    'lunch',
    515,
    44.6,
    14.3,
    30.4,
    ARRAY['pescatarian'],
    ARRAY['fish', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g sardines', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the sardines generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the sardines shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the sardines and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Pork Belly (Slow-Roasted) with Swede (Mashed) & Tenderstem Broccoli',
    'keto',
    'lunch',
    830,
    28.2,
    9.9,
    73,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g pork belly (slow-roasted)', 0),
    ((SELECT id FROM new_recipe), '100g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '25g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork belly (slow-roasted) generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork belly (slow-roasted) slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the pork belly (slow-roasted) and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Whole Eggs with Broccoli Florets & Cherry Tomatoes',
    'keto',
    'lunch',
    394,
    31.8,
    10.7,
    24.2,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g whole eggs', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '25g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the whole eggs and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Chicken Thigh (Skin-On) with Shirataki Noodles & Avocado Slices',
    'keto',
    'lunch',
    467,
    37.5,
    6,
    31,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g chicken thigh (skin-on)', 0),
    ((SELECT id FROM new_recipe), '100g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g avocado slices', 2),
    ((SELECT id FROM new_recipe), '25g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken thigh (skin-on) generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken thigh (skin-on) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the avocado slices, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the chicken thigh (skin-on) and avocado slices.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Haddock Fillet with Broccoli Florets & Courgette',
    'keto',
    'lunch',
    351,
    38.6,
    14.3,
    14.8,
    ARRAY['pescatarian'],
    ARRAY['fish', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g haddock fillet', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '25g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the haddock fillet generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the haddock fillet roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the haddock fillet and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Chicken Thigh (Skin-On) with Cabbage (Shredded) & Courgette',
    'keto',
    'lunch',
    497,
    43.6,
    7.3,
    30.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g chicken thigh (skin-on)', 0),
    ((SELECT id FROM new_recipe), '100g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '25g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken thigh (skin-on) generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken thigh (skin-on) stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the chicken thigh (skin-on) and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 25g grated cheddar and a final crack of black pepper. Serve immediately.'),
    ((SELECT id FROM new_recipe), 7, 'Dinner (55 recipes)');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Sardines with Cauliflower Rice & Mixed Peppers',
    'keto',
    'dinner',
    607,
    53.4,
    13.1,
    36.4,
    ARRAY['pescatarian'],
    ARRAY['fish', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g sardines', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '30g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the sardines generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the sardines shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the sardines and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Chicken Breast with Courgette Noodles (Zoodles) & Green Beans',
    'keto',
    'dinner',
    458,
    64.7,
    6.1,
    16.7,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g chicken breast', 0),
    ((SELECT id FROM new_recipe), '120g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '30g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken breast generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken breast slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the chicken breast and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Tuna Steak with Turnip (Roasted) & Leeks',
    'keto',
    'dinner',
    412,
    60.8,
    10.1,
    12.4,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g tuna steak', 0),
    ((SELECT id FROM new_recipe), '120g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '30g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the tuna steak generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the tuna steak oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the tuna steak and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Halloumi with Swede (Mashed) & Cherry Tomatoes',
    'keto',
    'dinner',
    865,
    57.3,
    18.4,
    62,
    ARRAY['vegetarian'],
    ARRAY['dairy', 'peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g halloumi', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '30g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the halloumi and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Bacon (Smoked Back) with Swede (Mashed) & Courgette',
    'keto',
    'dinner',
    970,
    46.2,
    11.5,
    80.6,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the bacon (smoked back) and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Salmon Fillet with Broccoli Florets & Red Onion',
    'keto',
    'dinner',
    565,
    59.8,
    10.4,
    32.6,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '120g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '30g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the salmon fillet and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb King Prawns with Cabbage (Shredded) & Avocado Slices',
    'keto',
    'dinner',
    496,
    44.8,
    8.4,
    30.7,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['crustaceans'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g king prawns', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g avocado slices', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the avocado slices, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the king prawns and avocado slices.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Egg Whites with Cabbage (Shredded) & Tenderstem Broccoli',
    'keto',
    'dinner',
    326,
    27.4,
    15.6,
    16.7,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g egg whites', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '30g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the egg whites and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Pork Tenderloin with Cauliflower Rice & Kale',
    'keto',
    'dinner',
    410,
    51,
    8,
    16.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g pork tenderloin', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '30g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork tenderloin generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork tenderloin griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the pork tenderloin and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Pork Belly (Slow-Roasted) with Swede (Mashed) & Celery',
    'keto',
    'dinner',
    879,
    35.4,
    12.7,
    73.4,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g pork belly (slow-roasted)', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '30g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork belly (slow-roasted) generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork belly (slow-roasted) oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the pork belly (slow-roasted) and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Pork Belly (Slow-Roasted) with Swede (Mashed) & Leeks',
    'keto',
    'dinner',
    992,
    33.8,
    11.5,
    87.5,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g pork belly (slow-roasted)', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '30g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork belly (slow-roasted) generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork belly (slow-roasted) poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the pork belly (slow-roasted) and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Halloumi with Shirataki Noodles & Red Onion',
    'keto',
    'dinner',
    920,
    48.6,
    6.5,
    76.8,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g halloumi', 0),
    ((SELECT id FROM new_recipe), '120g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the halloumi and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Chicken Breast with Courgette Noodles (Zoodles) & Baby Spinach',
    'keto',
    'dinner',
    472,
    57.9,
    6.5,
    21.2,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g chicken breast', 0),
    ((SELECT id FROM new_recipe), '120g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '30ml double cream', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken breast generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken breast shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the chicken breast and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Egg Whites with Courgette Noodles (Zoodles) & Cucumber',
    'keto',
    'dinner',
    263,
    32.6,
    7,
    9.4,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g egg whites', 0),
    ((SELECT id FROM new_recipe), '120g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '30g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the egg whites and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Salmon Fillet with Swede (Mashed) & Celery',
    'keto',
    'dinner',
    622,
    52.2,
    17.8,
    39.8,
    ARRAY['pescatarian'],
    ARRAY['fish', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '30g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the salmon fillet and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Tuna Steak with Shirataki Noodles & Baby Spinach',
    'keto',
    'dinner',
    404,
    52.8,
    6.4,
    16.7,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g tuna steak', 0),
    ((SELECT id FROM new_recipe), '120g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '30ml double cream', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the tuna steak generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the tuna steak slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the tuna steak and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Lean Beef Mince (5%) with Shirataki Noodles & Green Beans',
    'keto',
    'dinner',
    519,
    54.9,
    12.2,
    27.6,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g lean beef mince (5%)', 0),
    ((SELECT id FROM new_recipe), '120g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '30g almonds', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lean beef mince (5%) generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lean beef mince (5%) griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the lean beef mince (5%) and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb Bacon (Smoked Back) with Cauliflower Rice & Mixed Peppers',
    'keto',
    'dinner',
    790,
    49.2,
    8,
    61,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '30g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the bacon (smoked back) and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Salmon Fillet with Celeriac Mash & Celery',
    'keto',
    'dinner',
    712,
    47.2,
    12.8,
    53.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '120g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the salmon fillet and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Chicken Thigh (Skin-On) with Celeriac Mash & Olives',
    'keto',
    'dinner',
    668,
    52.9,
    18.8,
    42.4,
    ARRAY['omnivore'],
    ARRAY['peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g chicken thigh (skin-on)', 0),
    ((SELECT id FROM new_recipe), '120g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '30g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken thigh (skin-on) generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken thigh (skin-on) oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the chicken thigh (skin-on) and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Egg Whites with Courgette Noodles (Zoodles) & Asparagus Tips',
    'keto',
    'dinner',
    308,
    27.5,
    13.6,
    15.7,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'sesame', 'soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g egg whites', 0),
    ((SELECT id FROM new_recipe), '120g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '30g almonds', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the egg whites and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Pork Tenderloin with Swede (Mashed) & Mixed Salad Leaves',
    'keto',
    'dinner',
    588,
    48,
    11.5,
    36.5,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g pork tenderloin', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork tenderloin generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork tenderloin stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the pork tenderloin and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style King Prawns with Swede (Mashed) & Green Beans',
    'keto',
    'dinner',
    509,
    44.4,
    11.8,
    30.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['crustaceans'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g king prawns', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the king prawns and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Egg Whites with Cabbage (Shredded) & Cherry Tomatoes',
    'keto',
    'dinner',
    411,
    21.4,
    9.3,
    30.5,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g egg whites', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites oven-baked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the egg whites and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Firm Tofu with Turnip (Roasted) & Cherry Tomatoes',
    'keto',
    'dinner',
    495,
    37.7,
    19.6,
    32.5,
    ARRAY['vegan'],
    ARRAY['soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g firm tofu', 0),
    ((SELECT id FROM new_recipe), '120g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '30g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the firm tofu and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Whole Eggs with Swede (Mashed) & Mixed Salad Leaves',
    'keto',
    'dinner',
    610,
    24.6,
    13.5,
    50,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g whole eggs', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the whole eggs and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Whole Eggs with Cabbage (Shredded) & Cherry Tomatoes',
    'keto',
    'dinner',
    458,
    36.4,
    10,
    28.6,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g whole eggs', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '30g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the whole eggs and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Chicken Thigh (Skin-On) with Swede (Mashed) & Tenderstem Broccoli',
    'keto',
    'dinner',
    622,
    45,
    12.3,
    41.6,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g chicken thigh (skin-on)', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '30ml double cream', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken thigh (skin-on) generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken thigh (skin-on) griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the chicken thigh (skin-on) and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Halloumi with Celeriac Mash & Baby Spinach',
    'keto',
    'dinner',
    870,
    58.3,
    19.7,
    62.2,
    ARRAY['vegetarian'],
    ARRAY['dairy', 'peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g halloumi', 0),
    ((SELECT id FROM new_recipe), '120g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '30g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the baby spinach for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the halloumi and baby spinach.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Salmon Fillet with Courgette Noodles (Zoodles) & Chestnut Mushrooms',
    'keto',
    'dinner',
    597,
    52.4,
    12,
    40,
    ARRAY['pescatarian'],
    ARRAY['fish', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '120g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '30g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the salmon fillet and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Beef Ribeye Steak with Swede (Mashed) & Mixed Salad Leaves',
    'keto',
    'dinner',
    768,
    49.5,
    17.8,
    56,
    ARRAY['omnivore'],
    ARRAY['sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g beef ribeye steak', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the beef ribeye steak generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the beef ribeye steak shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the beef ribeye steak and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Whole Eggs with Broccoli Florets & Courgette',
    'keto',
    'dinner',
    518,
    31.9,
    18.7,
    36.5,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g whole eggs', 0),
    ((SELECT id FROM new_recipe), '120g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the whole eggs and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Turkey Breast with Cauliflower Rice & Green Beans',
    'keto',
    'dinner',
    472,
    59.7,
    13.1,
    19.3,
    ARRAY['omnivore'],
    ARRAY['sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g turkey breast', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the turkey breast generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the turkey breast poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the turkey breast and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Lean Beef Mince (5%) with Broccoli Florets & Mixed Peppers',
    'keto',
    'dinner',
    509,
    52.6,
    11.2,
    27.5,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g lean beef mince (5%)', 0),
    ((SELECT id FROM new_recipe), '120g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '30ml double cream', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lean beef mince (5%) generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lean beef mince (5%) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the lean beef mince (5%) and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Cod Fillet with Cabbage (Shredded) & Asparagus Tips',
    'keto',
    'dinner',
    287,
    43.6,
    10.7,
    5.9,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g cod fillet', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '30g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the cod fillet generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the cod fillet pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the cod fillet and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Mackerel with Swede (Mashed) & Kale',
    'keto',
    'dinner',
    611,
    42.9,
    17.5,
    40.3,
    ARRAY['pescatarian'],
    ARRAY['fish', 'peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g mackerel', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '30g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the mackerel generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the mackerel poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the mackerel and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Lean Beef Mince (5%) with Cabbage (Shredded) & Cauliflower',
    'keto',
    'dinner',
    537,
    56.5,
    14.6,
    27.7,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g lean beef mince (5%)', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g cauliflower', 2),
    ((SELECT id FROM new_recipe), '30g almonds', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lean beef mince (5%) generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lean beef mince (5%) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cauliflower for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the lean beef mince (5%) and cauliflower.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Sardines with Cauliflower Rice & Chestnut Mushrooms',
    'keto',
    'dinner',
    527,
    49.2,
    8,
    30.4,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g sardines', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '30g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the sardines generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the sardines pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the sardines and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Beef Ribeye Steak with Broccoli Florets & Mixed Salad Leaves',
    'keto',
    'dinner',
    761,
    54.1,
    16.4,
    55.1,
    ARRAY['omnivore'],
    ARRAY['peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g beef ribeye steak', 0),
    ((SELECT id FROM new_recipe), '120g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '30g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the beef ribeye steak generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the beef ribeye steak air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the mixed salad leaves, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the beef ribeye steak and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb Salmon Fillet with Turnip (Roasted) & Leeks',
    'keto',
    'dinner',
    693,
    46.1,
    9.7,
    53.5,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '120g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the salmon fillet and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Beef Ribeye Steak with Celeriac Mash & Asparagus Tips',
    'keto',
    'dinner',
    773,
    50.5,
    19.1,
    56.2,
    ARRAY['omnivore'],
    ARRAY['sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g beef ribeye steak', 0),
    ((SELECT id FROM new_recipe), '120g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the beef ribeye steak generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the beef ribeye steak shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the beef ribeye steak and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Cod Fillet with Cauliflower Rice & Asparagus Tips',
    'keto',
    'dinner',
    418,
    48.9,
    13.1,
    17.8,
    ARRAY['pescatarian'],
    ARRAY['fish', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g cod fillet', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the cod fillet generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the cod fillet slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the cod fillet and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Turkey Breast with Shirataki Noodles & Mixed Peppers',
    'keto',
    'dinner',
    378,
    54,
    6.8,
    12.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g turkey breast', 0),
    ((SELECT id FROM new_recipe), '120g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '30g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the turkey breast generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the turkey breast roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the turkey breast and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Bacon (Smoked Back) with Courgette Noodles (Zoodles) & Courgette',
    'keto',
    'dinner',
    807,
    57.8,
    5.7,
    59.5,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '120g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '30g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the bacon (smoked back) and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Chicken Breast with Broccoli Florets & Celery',
    'keto',
    'dinner',
    540,
    65.2,
    16.7,
    23.2,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g chicken breast', 0),
    ((SELECT id FROM new_recipe), '120g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '30g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken breast generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken breast pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the chicken breast and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Cod Fillet with Turnip (Roasted) & Asparagus Tips',
    'keto',
    'dinner',
    377,
    43.1,
    10.5,
    15.8,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g cod fillet', 0),
    ((SELECT id FROM new_recipe), '120g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '30ml double cream', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the cod fillet generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the cod fillet stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the cod fillet and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Whole Eggs with Celeriac Mash & Kale',
    'keto',
    'dinner',
    528,
    30.7,
    21.1,
    36.4,
    ARRAY['vegetarian'],
    ARRAY['eggs', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g whole eggs', 0),
    ((SELECT id FROM new_recipe), '120g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the whole eggs and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Pork Belly (Slow-Roasted) with Cauliflower Rice & Green Beans',
    'keto',
    'dinner',
    890,
    46.2,
    6.8,
    72.1,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g pork belly (slow-roasted)', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g green beans', 2),
    ((SELECT id FROM new_recipe), '30g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork belly (slow-roasted) generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork belly (slow-roasted) griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the green beans for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the pork belly (slow-roasted) and green beans.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Whole Eggs with Cabbage (Shredded) & Chestnut Mushrooms',
    'keto',
    'dinner',
    458,
    36.4,
    10,
    28.6,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g whole eggs', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '30g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the whole eggs and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Bacon (Smoked Back) with Cauliflower Rice & Avocado Slices',
    'keto',
    'dinner',
    955,
    47.4,
    6.8,
    80.8,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '120g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g avocado slices', 2),
    ((SELECT id FROM new_recipe), '30g (1 tbsp) coconut oil', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the avocado slices, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the bacon (smoked back) and avocado slices.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g (1 tbsp) coconut oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Cod Fillet with Cabbage (Shredded) & Cucumber',
    'keto',
    'dinner',
    454,
    43.1,
    8,
    25.7,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g cod fillet', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '30g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the cod fillet generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the cod fillet slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the cod fillet and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Halloumi with Celeriac Mash & Chestnut Mushrooms',
    'keto',
    'dinner',
    828,
    51.4,
    14.5,
    61.6,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g halloumi', 0),
    ((SELECT id FROM new_recipe), '120g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '30ml double cream', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the halloumi and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Salmon Fillet with Cabbage (Shredded) & Chestnut Mushrooms',
    'keto',
    'dinner',
    554,
    58,
    8,
    32.2,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '120g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '30g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the salmon fillet and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Halloumi with Broccoli Florets & Leeks',
    'keto',
    'dinner',
    866,
    58,
    17.6,
    63.5,
    ARRAY['vegetarian'],
    ARRAY['dairy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g halloumi', 0),
    ((SELECT id FROM new_recipe), '120g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '30g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the halloumi and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Whole Eggs with Swede (Mashed) & Asparagus Tips',
    'keto',
    'dinner',
    447,
    26.4,
    14.7,
    30.2,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g whole eggs', 0),
    ((SELECT id FROM new_recipe), '120g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '30g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the whole eggs and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 30g full-fat cream cheese and a final crack of black pepper. Serve immediately.'),
    ((SELECT id FROM new_recipe), 7, 'Snack (30 recipes)');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Turkey Breast with Shirataki Noodles & Leeks',
    'keto',
    'snack',
    225,
    26.2,
    7,
    9.3,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g turkey breast', 0),
    ((SELECT id FROM new_recipe), '60g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '15g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the turkey breast generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the turkey breast shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the turkey breast and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Turkey Breast with Swede (Mashed) & Tenderstem Broccoli',
    'keto',
    'snack',
    258,
    23.9,
    6.7,
    13.5,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g turkey breast', 0),
    ((SELECT id FROM new_recipe), '60g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '15g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the turkey breast generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the turkey breast stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the turkey breast and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb King Prawns with Cauliflower Rice & Mixed Peppers',
    'keto',
    'snack',
    247,
    20.4,
    4.6,
    15.4,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['crustaceans'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g king prawns', 0),
    ((SELECT id FROM new_recipe), '60g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '15g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the king prawns and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Tuna Steak with Broccoli Florets & Chestnut Mushrooms',
    'keto',
    'snack',
    233,
    28,
    9.5,
    8.8,
    ARRAY['pescatarian'],
    ARRAY['fish', 'sesame', 'soy', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g tuna steak', 0),
    ((SELECT id FROM new_recipe), '60g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '15g almonds', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the tuna steak generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the tuna steak stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the tuna steak and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Turkey Breast with Swede (Mashed) & Courgette',
    'keto',
    'snack',
    211,
    27.6,
    6.9,
    6.3,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g turkey breast', 0),
    ((SELECT id FROM new_recipe), '60g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '15g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the turkey breast generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the turkey breast air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the turkey breast and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Chicken Thigh (Skin-On) with Cauliflower Rice & Leeks',
    'keto',
    'snack',
    309,
    23.5,
    7.7,
    19.7,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g chicken thigh (skin-on)', 0),
    ((SELECT id FROM new_recipe), '60g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g leeks', 2),
    ((SELECT id FROM new_recipe), '15g almonds', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken thigh (skin-on) generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken thigh (skin-on) roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the leeks for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the chicken thigh (skin-on) and leeks.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Lean Beef Mince (5%) with Celeriac Mash & Olives',
    'keto',
    'snack',
    271,
    25.8,
    10.7,
    13.3,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g lean beef mince (5%)', 0),
    ((SELECT id FROM new_recipe), '60g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '15g almonds', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lean beef mince (5%) generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lean beef mince (5%) roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the lean beef mince (5%) and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Halloumi with Swede (Mashed) & Courgette',
    'keto',
    'snack',
    409,
    24.8,
    10.3,
    29,
    ARRAY['vegetarian'],
    ARRAY['dairy', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g halloumi', 0),
    ((SELECT id FROM new_recipe), '60g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g courgette', 2),
    ((SELECT id FROM new_recipe), '15g (1 tbsp) tahini', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the courgette for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the halloumi and courgette.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g (1 tbsp) tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Bacon (Smoked Back) with Cauliflower Rice & Cauliflower',
    'keto',
    'snack',
    383,
    26.9,
    4.4,
    26.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g bacon (smoked back)', 0),
    ((SELECT id FROM new_recipe), '60g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g cauliflower', 2),
    ((SELECT id FROM new_recipe), '15g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the bacon (smoked back) generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the bacon (smoked back) griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cauliflower for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the bacon (smoked back) and cauliflower.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Haddock Fillet with Broccoli Florets & Tenderstem Broccoli',
    'keto',
    'snack',
    211,
    21.5,
    9.4,
    8.8,
    ARRAY['pescatarian'],
    ARRAY['fish', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g haddock fillet', 0),
    ((SELECT id FROM new_recipe), '60g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '15g mixed nuts', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the haddock fillet generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the haddock fillet poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the haddock fillet and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g mixed nuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean King Prawns with Swede (Mashed) & Mixed Peppers',
    'keto',
    'snack',
    230,
    19.9,
    6.9,
    12.5,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['crustaceans', 'dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g king prawns', 0),
    ((SELECT id FROM new_recipe), '60g swede (mashed)', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '15g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'oregano, lemon zest and crushed garlic', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with oregano, lemon zest and crushed garlic.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the swede (mashed) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the swede (mashed) as a base, top with the king prawns and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Pork Belly (Slow-Roasted) with Turnip (Roasted) & Mixed Peppers',
    'keto',
    'snack',
    441,
    18.7,
    8.8,
    35.6,
    ARRAY['omnivore'],
    ARRAY['peanuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g pork belly (slow-roasted)', 0),
    ((SELECT id FROM new_recipe), '60g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '15g natural peanut butter', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork belly (slow-roasted) generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork belly (slow-roasted) shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the pork belly (slow-roasted) and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g natural peanut butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mexican-style Lean Beef Mince (5%) with Shirataki Noodles & Asparagus Tips',
    'keto',
    'snack',
    226,
    25.4,
    4,
    10.6,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g lean beef mince (5%)', 0),
    ((SELECT id FROM new_recipe), '60g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '15g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'cumin, chilli powder and lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lean beef mince (5%) generously with cumin, chilli powder and lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lean beef mince (5%) griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the lean beef mince (5%) and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g grated cheddar and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Lamb Leg with Broccoli Florets & Kale',
    'keto',
    'snack',
    236,
    22.6,
    6.8,
    12.5,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g lamb leg', 0),
    ((SELECT id FROM new_recipe), '60g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '15g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lamb leg generously with cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lamb leg grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the lamb leg and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Lamb Leg with Celeriac Mash & Cucumber',
    'keto',
    'snack',
    254,
    26.8,
    7.4,
    11.7,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g lamb leg', 0),
    ((SELECT id FROM new_recipe), '60g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '15g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lamb leg generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lamb leg shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the lamb leg and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Mackerel with Courgette Noodles (Zoodles) & Cherry Tomatoes',
    'keto',
    'snack',
    262,
    16.2,
    4.3,
    18.5,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g mackerel', 0),
    ((SELECT id FROM new_recipe), '60g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '15ml double cream', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the mackerel generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the mackerel griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the mackerel and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Salmon Fillet with Cabbage (Shredded) & Olives',
    'keto',
    'snack',
    269,
    21.1,
    5.4,
    17.7,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g salmon fillet', 0),
    ((SELECT id FROM new_recipe), '60g cabbage (shredded)', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '15ml double cream', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the salmon fillet generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the salmon fillet grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cabbage (shredded) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cabbage (shredded) as a base, top with the salmon fillet and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Lamb Leg with Shirataki Noodles & Kale',
    'keto',
    'snack',
    257,
    23.2,
    7.1,
    14.7,
    ARRAY['omnivore'],
    ARRAY['tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g lamb leg', 0),
    ((SELECT id FROM new_recipe), '60g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '15g almonds', 3),
    ((SELECT id FROM new_recipe), 'ras el hanout, cinnamon and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lamb leg generously with ras el hanout, cinnamon and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lamb leg shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the lamb leg and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Halloumi with Turnip (Roasted) & Red Onion',
    'keto',
    'snack',
    446,
    22.1,
    6.2,
    35.9,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g halloumi', 0),
    ((SELECT id FROM new_recipe), '60g turnip (roasted)', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '15g (1 tbsp) extra virgin olive oil', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the turnip (roasted) according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the turnip (roasted) as a base, top with the halloumi and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g (1 tbsp) extra virgin olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli King Prawns with Cauliflower Rice & Red Onion',
    'keto',
    'snack',
    182,
    20.7,
    5,
    7.6,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['crustaceans', 'dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g king prawns', 0),
    ((SELECT id FROM new_recipe), '60g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g red onion', 2),
    ((SELECT id FROM new_recipe), '15ml double cream', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the king prawns generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the king prawns shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the red onion for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the king prawns and red onion.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15ml double cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Whole Eggs with Cauliflower Rice & Chestnut Mushrooms',
    'keto',
    'snack',
    267,
    11.7,
    5.3,
    21.1,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy', 'eggs', 'sesame', 'soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g whole eggs', 0),
    ((SELECT id FROM new_recipe), '60g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '15g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and a splash of sesame oil', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with tamari (gluten-free soy), ginger and a splash of sesame oil.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs griddled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the whole eggs and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Chicken Breast with Broccoli Florets & Cherry Tomatoes',
    'keto',
    'snack',
    196,
    26.8,
    7.6,
    5.4,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g chicken breast', 0),
    ((SELECT id FROM new_recipe), '60g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '15g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the chicken breast generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the chicken breast air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the chicken breast and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Lean Beef Mince (5%) with Broccoli Florets & Tenderstem Broccoli',
    'keto',
    'snack',
    231,
    24.2,
    6.8,
    10.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g lean beef mince (5%)', 0),
    ((SELECT id FROM new_recipe), '60g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '15g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lean beef mince (5%) generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lean beef mince (5%) poached until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the lean beef mince (5%) and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Beef Ribeye Steak with Celeriac Mash & Cucumber',
    'keto',
    'snack',
    329,
    21.2,
    8,
    22.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g beef ribeye steak', 0),
    ((SELECT id FROM new_recipe), '60g celeriac mash', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '15g full-fat cream cheese', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the beef ribeye steak generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the beef ribeye steak air-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the celeriac mash according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the celeriac mash as a base, top with the beef ribeye steak and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g full-fat cream cheese and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Beef Ribeye Steak with Cauliflower Rice & Asparagus Tips',
    'keto',
    'snack',
    375,
    20.5,
    4.4,
    29.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g beef ribeye steak', 0),
    ((SELECT id FROM new_recipe), '60g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '15g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the beef ribeye steak generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the beef ribeye steak slow-cooked until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the beef ribeye steak and asparagus tips.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb Cod Fillet with Cauliflower Rice & Cucumber',
    'keto',
    'snack',
    227,
    19.7,
    4.4,
    12.9,
    ARRAY['pescatarian', 'gluten-free'],
    ARRAY['dairy', 'fish'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g cod fillet', 0),
    ((SELECT id FROM new_recipe), '60g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g cucumber', 2),
    ((SELECT id FROM new_recipe), '15g unsalted butter', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the cod fillet generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the cod fillet roasted until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the cucumber, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the cauliflower rice as a base, top with the cod fillet and cucumber.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g unsalted butter and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Halloumi with Courgette Noodles (Zoodles) & Olives',
    'keto',
    'snack',
    372,
    28,
    4.3,
    25.3,
    ARRAY['vegetarian', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g halloumi', 0),
    ((SELECT id FROM new_recipe), '60g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g olives', 2),
    ((SELECT id FROM new_recipe), '15g grated parmesan', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the halloumi generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the halloumi stir-fried until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the olives, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the courgette noodles (zoodles) as a base, top with the halloumi and olives.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g grated parmesan and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Lean Beef Mince (5%) with Shirataki Noodles & Mixed Peppers',
    'keto',
    'snack',
    189,
    21.9,
    5.2,
    7.9,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY[]::TEXT[],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g lean beef mince (5%)', 0),
    ((SELECT id FROM new_recipe), '60g shirataki noodles', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '15g avocado, sliced', 3),
    ((SELECT id FROM new_recipe), 'smoky BBQ rub and black pepper', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the lean beef mince (5%) generously with smoky BBQ rub and black pepper.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the lean beef mince (5%) grilled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the shirataki noodles according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the shirataki noodles as a base, top with the lean beef mince (5%) and mixed peppers.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g avocado, sliced and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Sardines with Broccoli Florets & Kale',
    'keto',
    'snack',
    294,
    24.8,
    9.5,
    16.5,
    ARRAY['pescatarian'],
    ARRAY['fish', 'tree nuts'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g sardines', 0),
    ((SELECT id FROM new_recipe), '60g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '15g almonds', 3),
    ((SELECT id FROM new_recipe), 'turmeric, garam masala and cumin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the sardines generously with turmeric, garam masala and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the sardines pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Steam or sauté the kale for 3-4 minutes until just tender.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the sardines and kale.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g almonds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Creamy herb Pork Tenderloin with Broccoli Florets & Celery',
    'keto',
    'snack',
    215,
    26.2,
    6.4,
    8,
    ARRAY['omnivore', 'gluten-free'],
    ARRAY['dairy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '80g pork tenderloin', 0),
    ((SELECT id FROM new_recipe), '60g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g celery', 2),
    ((SELECT id FROM new_recipe), '15g grated cheddar', 3),
    ((SELECT id FROM new_recipe), 'fresh thyme, cracked black pepper and a splash of double cream', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the pork tenderloin generously with fresh thyme, cracked black pepper and a splash of double cream.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the pork tenderloin shallow-fried in butter until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Meanwhile, prepare the broccoli florets according to packet instructions.'),
    ((SELECT id FROM new_recipe), 4, 'Wash and prepare the celery, set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 5, 'Plate the broccoli florets as a base, top with the pork tenderloin and celery.'),
    ((SELECT id FROM new_recipe), 6, 'Finish with 15g grated cheddar and a final crack of black pepper. Serve immediately.');

-- ── From 20260701130000_seed_veg_df_keto_pack.sql (30 veg/dairy-free keto) ──

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Firm Tofu with Cauliflower Rice & Baby Spinach',
    'keto',
    'lunch',
    400,
    30,
    13,
    27,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '10g sesame oil', 3),
    ((SELECT id FROM new_recipe), '15g hemp seeds', 4),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and spring onion', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with tamari, ginger and spring onion.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the baby spinach for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the cauliflower rice as a base, top with the firm tofu and baby spinach.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the sesame oil and hemp seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Firm Tofu with Cabbage (Shredded) & Olives',
    'keto',
    'lunch',
    420,
    27,
    12,
    30,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g shredded cabbage', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '25g olives (pitted)', 4),
    ((SELECT id FROM new_recipe), 'oregano, basil and a squeeze of lemon', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with oregano, basil and a squeeze of lemon.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the shredded cabbage by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the mixed salad leaves for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the shredded cabbage as a base, top with the firm tofu and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and olives and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Whole Eggs with Broccoli Florets & Cherry Tomatoes',
    'keto',
    'lunch',
    460,
    25,
    12,
    35,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '3 whole eggs', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '80g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '20g pumpkin seeds', 4),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Whisk the whole eggs lightly in a bowl.'),
    ((SELECT id FROM new_recipe), 2, 'Season the whole eggs generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the whole eggs scrambled in a non-stick pan over medium heat until just set.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the broccoli florets by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the broccoli florets as a base, top with the whole eggs and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and pumpkin seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Firm Tofu with Courgette Noodles (Zoodles) & Kale',
    'keto',
    'lunch',
    395,
    28,
    11,
    26,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '20g sunflower seeds', 4),
    ((SELECT id FROM new_recipe), 'ras el hanout, cumin and cinnamon', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with ras el hanout, cumin and cinnamon.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the kale for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the courgette noodles (zoodles) as a base, top with the firm tofu and kale.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and sunflower seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Egg Whites with Cauliflower Rice & Mixed Peppers',
    'keto',
    'lunch',
    380,
    30,
    11,
    24,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '200g egg whites', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g mixed peppers', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '60g avocado', 4),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Whisk the egg whites lightly in a bowl.'),
    ((SELECT id FROM new_recipe), 2, 'Season the egg whites generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the egg whites scrambled in a non-stick pan over medium heat until just set.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the mixed peppers for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the cauliflower rice as a base, top with the egg whites and mixed peppers.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Firm Tofu with Broccoli Florets & Red Onion',
    'keto',
    'lunch',
    440,
    29,
    13,
    30,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '60g red onion', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '20g walnuts', 4),
    ((SELECT id FROM new_recipe), 'Cajun seasoning, smoked paprika and garlic powder', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with Cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the broccoli florets by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the red onion for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the broccoli florets as a base, top with the firm tofu and red onion.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and walnuts and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Whole Eggs with Cabbage (Shredded) & Baby Spinach',
    'keto',
    'lunch',
    485,
    25,
    10,
    38,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '3 whole eggs', 0),
    ((SELECT id FROM new_recipe), '100g shredded cabbage', 1),
    ((SELECT id FROM new_recipe), '80g baby spinach', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '80g avocado', 4),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Whisk the whole eggs lightly in a bowl.'),
    ((SELECT id FROM new_recipe), 2, 'Season the whole eggs generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the whole eggs scrambled in a non-stick pan over medium heat until just set.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the shredded cabbage by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the baby spinach for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the shredded cabbage as a base, top with the whole eggs and baby spinach.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Teriyaki Firm Tofu with Courgette Noodles (Zoodles) & Asparagus Tips',
    'keto',
    'lunch',
    390,
    28,
    13,
    25,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '10g sesame oil', 3),
    ((SELECT id FROM new_recipe), '15g tahini', 4),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and mirin', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with tamari, ginger and mirin.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the courgette noodles (zoodles) as a base, top with the firm tofu and asparagus tips.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the sesame oil and tahini and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Egg Whites with Cauliflower Rice & Chestnut Mushrooms',
    'keto',
    'lunch',
    360,
    27,
    9,
    23,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '200g egg whites', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '60g avocado', 4),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Whisk the egg whites lightly in a bowl.'),
    ((SELECT id FROM new_recipe), 2, 'Season the egg whites generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the egg whites scrambled in a non-stick pan over medium heat until just set.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the cauliflower rice as a base, top with the egg whites and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Firm Tofu with Cabbage (Shredded) & Cherry Tomatoes',
    'keto',
    'lunch',
    415,
    27,
    13,
    28,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g shredded cabbage', 1),
    ((SELECT id FROM new_recipe), '80g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '15g olive oil', 3),
    ((SELECT id FROM new_recipe), '15g coconut cream', 4),
    ((SELECT id FROM new_recipe), 'garam masala, turmeric and cumin', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with garam masala, turmeric and cumin.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the shredded cabbage by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the shredded cabbage as a base, top with the firm tofu and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil and coconut cream and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Firm Tofu with Courgette Noodles (Zoodles) & Olives',
    'keto',
    'dinner',
    580,
    32,
    13,
    44,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g mixed salad leaves', 2),
    ((SELECT id FROM new_recipe), '20g olive oil', 3),
    ((SELECT id FROM new_recipe), '40g olives (pitted)', 4),
    ((SELECT id FROM new_recipe), '80g avocado', 5),
    ((SELECT id FROM new_recipe), 'oregano, basil and a squeeze of lemon', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with oregano, basil and a squeeze of lemon.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the mixed salad leaves for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the courgette noodles (zoodles) as a base, top with the firm tofu and mixed salad leaves.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil, olives and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Tempeh with Cauliflower Rice & Kale',
    'keto',
    'dinner',
    605,
    34,
    14,
    42,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g tempeh', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g kale', 2),
    ((SELECT id FROM new_recipe), '20g olive oil', 3),
    ((SELECT id FROM new_recipe), '20g sunflower seeds', 4),
    ((SELECT id FROM new_recipe), '80g avocado', 5),
    ((SELECT id FROM new_recipe), 'ras el hanout, cumin and cinnamon', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Slice the tempeh into thin strips.'),
    ((SELECT id FROM new_recipe), 2, 'Season the tempeh generously with ras el hanout, cumin and cinnamon.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the tempeh pan-seared in a little olive oil until golden and heated through, turning once.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the kale for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the cauliflower rice as a base, top with the tempeh and kale.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil, sunflower seeds and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Whole Eggs with Broccoli Florets & Chestnut Mushrooms',
    'keto',
    'dinner',
    560,
    28,
    11,
    44,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '4 whole eggs', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '100g chestnut mushrooms', 2),
    ((SELECT id FROM new_recipe), '20g olive oil', 3),
    ((SELECT id FROM new_recipe), '80g avocado', 4),
    ((SELECT id FROM new_recipe), '20g pumpkin seeds', 5),
    ((SELECT id FROM new_recipe), 'Cajun seasoning, smoked paprika and garlic powder', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Whisk the whole eggs lightly in a bowl.'),
    ((SELECT id FROM new_recipe), 2, 'Season the whole eggs generously with Cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the whole eggs scrambled in a non-stick pan over medium heat until just set.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the broccoli florets by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the chestnut mushrooms for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the broccoli florets as a base, top with the whole eggs and chestnut mushrooms.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil, sliced avocado and pumpkin seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Firm Tofu with Cabbage (Shredded) & Cherry Tomatoes',
    'keto',
    'dinner',
    630,
    33,
    13,
    48,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g shredded cabbage', 1),
    ((SELECT id FROM new_recipe), '80g cherry tomatoes', 2),
    ((SELECT id FROM new_recipe), '20g olive oil', 3),
    ((SELECT id FROM new_recipe), '30g olives (pitted)', 4),
    ((SELECT id FROM new_recipe), '80g avocado', 5),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the shredded cabbage by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the cherry tomatoes for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the shredded cabbage as a base, top with the firm tofu and cherry tomatoes.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil, olives and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Tempeh with Courgette Noodles (Zoodles) & Baby Spinach',
    'keto',
    'dinner',
    585,
    34,
    14,
    41,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g tempeh', 0),
    ((SELECT id FROM new_recipe), '100g courgette noodles (zoodles)', 1),
    ((SELECT id FROM new_recipe), '100g baby spinach', 2),
    ((SELECT id FROM new_recipe), '10g sesame oil', 3),
    ((SELECT id FROM new_recipe), '15g tahini', 4),
    ((SELECT id FROM new_recipe), '20g hemp seeds', 5),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and spring onion', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Slice the tempeh into thin strips.'),
    ((SELECT id FROM new_recipe), 2, 'Season the tempeh generously with tamari, ginger and spring onion.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the tempeh pan-seared in a little olive oil until golden and heated through, turning once.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the courgette noodles (zoodles) by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the baby spinach for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the courgette noodles (zoodles) as a base, top with the tempeh and baby spinach.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the sesame oil, tahini and hemp seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Firm Tofu with Cauliflower Rice & Asparagus Tips',
    'keto',
    'dinner',
    620,
    33,
    12,
    48,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g asparagus tips', 2),
    ((SELECT id FROM new_recipe), '20g olive oil', 3),
    ((SELECT id FROM new_recipe), '80g avocado', 4),
    ((SELECT id FROM new_recipe), '20g pumpkin seeds', 5),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the asparagus tips for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the cauliflower rice as a base, top with the firm tofu and asparagus tips.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil, sliced avocado and pumpkin seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Teriyaki Egg Whites with Cauliflower Rice & Tenderstem Broccoli',
    'keto',
    'dinner',
    545,
    30,
    12,
    40,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs', 'soy', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '220g egg whites', 0),
    ((SELECT id FROM new_recipe), '100g cauliflower rice', 1),
    ((SELECT id FROM new_recipe), '100g tenderstem broccoli', 2),
    ((SELECT id FROM new_recipe), '10g sesame oil', 3),
    ((SELECT id FROM new_recipe), '80g avocado', 4),
    ((SELECT id FROM new_recipe), '20g hemp seeds', 5),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and mirin', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Whisk the egg whites lightly in a bowl.'),
    ((SELECT id FROM new_recipe), 2, 'Season the egg whites generously with tamari, ginger and mirin.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the egg whites scrambled in a non-stick pan over medium heat until just set.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the cauliflower rice by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the tenderstem broccoli for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the cauliflower rice as a base, top with the egg whites and tenderstem broccoli.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the sesame oil, sliced avocado and hemp seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Firm Tofu with Broccoli Florets & Red Onion',
    'keto',
    'dinner',
    590,
    31,
    13,
    44,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '180g firm tofu', 0),
    ((SELECT id FROM new_recipe), '100g broccoli florets', 1),
    ((SELECT id FROM new_recipe), '60g red onion', 2),
    ((SELECT id FROM new_recipe), '20g olive oil', 3),
    ((SELECT id FROM new_recipe), '80g avocado', 4),
    ((SELECT id FROM new_recipe), '20g sunflower seeds', 5),
    ((SELECT id FROM new_recipe), 'smoked paprika, garlic powder and a smoky BBQ rub', 6),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 7)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Press and cube the firm tofu.'),
    ((SELECT id FROM new_recipe), 2, 'Season the firm tofu generously with smoked paprika, garlic powder and a smoky BBQ rub.'),
    ((SELECT id FROM new_recipe), 3, 'Cook the firm tofu pan-seared in a little olive oil until golden on all sides.'),
    ((SELECT id FROM new_recipe), 4, 'Meanwhile, prepare the broccoli florets by sautéing in a hot pan with a little fat for 4-5 minutes.'),
    ((SELECT id FROM new_recipe), 5, 'Steam or sauté the red onion for 3-4 minutes until just tender but still vibrant.'),
    ((SELECT id FROM new_recipe), 6, 'Plate the broccoli florets as a base, top with the firm tofu and red onion.'),
    ((SELECT id FROM new_recipe), 7, 'Finish with the olive oil, sliced avocado and sunflower seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Peri-peri Egg Whites with Cucumber & Olives',
    'keto',
    'snack',
    230,
    17,
    6,
    15,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cucumber', 1),
    ((SELECT id FROM new_recipe), '20g olives (pitted)', 2),
    ((SELECT id FROM new_recipe), '10g olive oil', 3),
    ((SELECT id FROM new_recipe), 'peri-peri seasoning and a squeeze of lime', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with peri-peri seasoning and a squeeze of lime.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites scrambled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the cucumber and olives, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the cucumber and olives, top with the egg whites.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Firm Tofu with Cherry Tomatoes',
    'keto',
    'snack',
    270,
    18,
    7,
    18,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g cherry tomatoes', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '10g olives (pitted)', 3),
    ((SELECT id FROM new_recipe), 'oregano, basil and a squeeze of lemon', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with oregano, basil and a squeeze of lemon.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the cherry tomatoes and olives, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the cherry tomatoes and olives, top with the firm tofu.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Garlic & chilli Whole Eggs with Baby Spinach',
    'keto',
    'snack',
    250,
    15,
    4,
    19,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '2 whole eggs', 0),
    ((SELECT id FROM new_recipe), '80g baby spinach', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '40g avocado', 3),
    ((SELECT id FROM new_recipe), 'crushed garlic, chilli flakes and parsley', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with crushed garlic, chilli flakes and parsley.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs scrambled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the baby spinach, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the baby spinach, top with the whole eggs.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Asian-inspired Firm Tofu with Cucumber',
    'keto',
    'snack',
    290,
    17,
    6,
    21,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g cucumber', 1),
    ((SELECT id FROM new_recipe), '10g sesame oil', 2),
    ((SELECT id FROM new_recipe), '10g hemp seeds', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and spring onion', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with tamari, ginger and spring onion.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the cucumber, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the cucumber, top with the firm tofu.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the sesame oil and hemp seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Italian herb Egg Whites with Cherry Tomatoes',
    'keto',
    'snack',
    200,
    18,
    6,
    12,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g cherry tomatoes', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '10g pumpkin seeds', 3),
    ((SELECT id FROM new_recipe), 'basil, oregano and a touch of chilli flake', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with basil, oregano and a touch of chilli flake.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites scrambled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the cherry tomatoes, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the cherry tomatoes, top with the egg whites.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil and pumpkin seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Moroccan-spiced Firm Tofu with Kale',
    'keto',
    'snack',
    310,
    19,
    8,
    22,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g kale', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '10g sunflower seeds', 3),
    ((SELECT id FROM new_recipe), '40g avocado', 4),
    ((SELECT id FROM new_recipe), 'ras el hanout, cumin and cinnamon', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with ras el hanout, cumin and cinnamon.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the kale, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the kale, top with the firm tofu.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil, sunflower seeds and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Cajun Whole Eggs with Mixed Peppers',
    'keto',
    'snack',
    275,
    15,
    8,
    20,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '2 whole eggs', 0),
    ((SELECT id FROM new_recipe), '80g mixed peppers', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '40g avocado', 3),
    ((SELECT id FROM new_recipe), 'Cajun seasoning, smoked paprika and garlic powder', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with Cajun seasoning, smoked paprika and garlic powder.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs scrambled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the mixed peppers, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the mixed peppers, top with the whole eggs.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Lemon herb Firm Tofu with Cucumber',
    'keto',
    'snack',
    250,
    17,
    5,
    18,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g cucumber', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '40g avocado', 3),
    ((SELECT id FROM new_recipe), 'lemon juice, thyme and rosemary', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with lemon juice, thyme and rosemary.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the cucumber, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the cucumber, top with the firm tofu.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Teriyaki Egg Whites with Asparagus Tips',
    'keto',
    'snack',
    195,
    17,
    6,
    11,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs', 'soy', 'sesame'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g asparagus tips', 1),
    ((SELECT id FROM new_recipe), '10g sesame oil', 2),
    ((SELECT id FROM new_recipe), '10g hemp seeds', 3),
    ((SELECT id FROM new_recipe), 'tamari (gluten-free soy), ginger and mirin', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with tamari, ginger and mirin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites scrambled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the asparagus tips, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the asparagus tips, top with the egg whites.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the sesame oil and hemp seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Indian-spiced Firm Tofu with Baby Spinach',
    'keto',
    'snack',
    305,
    19,
    7,
    22,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['soy'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '120g firm tofu', 0),
    ((SELECT id FROM new_recipe), '80g baby spinach', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '15g coconut cream', 3),
    ((SELECT id FROM new_recipe), '40g avocado', 4),
    ((SELECT id FROM new_recipe), 'garam masala, turmeric and cumin', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the firm tofu generously with garam masala, turmeric and cumin.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the firm tofu pan-seared until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the baby spinach, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the baby spinach, top with the firm tofu.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil, coconut cream and sliced avocado and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'BBQ Whole Eggs with Red Onion',
    'keto',
    'snack',
    290,
    15,
    8,
    22,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '2 whole eggs', 0),
    ((SELECT id FROM new_recipe), '60g red onion', 1),
    ((SELECT id FROM new_recipe), '10g olive oil', 2),
    ((SELECT id FROM new_recipe), '40g avocado', 3),
    ((SELECT id FROM new_recipe), '10g sunflower seeds', 4),
    ((SELECT id FROM new_recipe), 'smoked paprika, garlic powder and a smoky BBQ rub', 5),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 6)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the whole eggs generously with smoked paprika, garlic powder and a smoky BBQ rub.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the whole eggs scrambled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the red onion, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the red onion, top with the whole eggs.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil, sliced avocado and sunflower seeds and a final crack of black pepper. Serve immediately.');

WITH new_recipe AS (
  INSERT INTO public.recipes (
    name, category, meal_type, calories, protein_g, carbs_g, fat_g, dietary_tags, allergens, source
  ) VALUES (
    'Mediterranean Egg Whites with Olives',
    'keto',
    'snack',
    245,
    17,
    5,
    17,
    ARRAY['vegetarian', 'gluten-free', 'hitt_ext_v1'],
    ARRAY['eggs'],
    'owner'
  ) RETURNING id
)
, ing AS (
  INSERT INTO public.ingredients (recipe_id, item, sort_order) VALUES
    ((SELECT id FROM new_recipe), '150g egg whites', 0),
    ((SELECT id FROM new_recipe), '80g mixed salad leaves', 1),
    ((SELECT id FROM new_recipe), '20g olives (pitted)', 2),
    ((SELECT id FROM new_recipe), '10g olive oil', 3),
    ((SELECT id FROM new_recipe), 'oregano, basil and a squeeze of lemon', 4),
    ((SELECT id FROM new_recipe), 'Salt and black pepper, to taste', 5)
  RETURNING 1
)
INSERT INTO public.steps (recipe_id, step_number, instruction) VALUES
    ((SELECT id FROM new_recipe), 1, 'Season the egg whites generously with oregano, basil and a squeeze of lemon.'),
    ((SELECT id FROM new_recipe), 2, 'Cook the egg whites scrambled until cooked through, turning once.'),
    ((SELECT id FROM new_recipe), 3, 'Wash and prepare the mixed salad leaves and olives, then set aside to serve fresh.'),
    ((SELECT id FROM new_recipe), 4, 'Plate the mixed salad leaves and olives, top with the egg whites.'),
    ((SELECT id FROM new_recipe), 5, 'Finish with the olive oil and a final crack of black pepper. Serve immediately.');

END
$reseed$;

COMMIT;
