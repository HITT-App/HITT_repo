-- ============================================================
-- FUELFORM RECIPES — SUPABASE SCHEMA + SEED DATA
-- 30 recipes across 3 categories: muscle (10), fat (10), lean (10)
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
ALTER TABLE public.recipes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_read"     ON public.recipes     FOR SELECT TO authenticated USING (true);
CREATE POLICY "ingredients_read" ON public.ingredients FOR SELECT TO authenticated USING (true);
CREATE POLICY "steps_read"       ON public.steps       FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------
-- SEED: MUSCLE CATEGORY (10 recipes)
-- ------------------------------------------------------------

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Steak & Sweet Potato Power Bowl', '🥩', 'muscle', 'dinner',
    'High-protein iron-rich steak over caramelised sweet potato with spinach and chimichurri.',
    720, 58, 65, 22,
    'Replace steak with 200g halloumi or 2 large portobello mushrooms, grilled. Same macros minus 10g protein.',
    'Use 200g smoky marinated tempeh or black bean patty. Add hemp seeds for extra protein.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g sirloin steak', '1 large sweet potato', '2 cups baby spinach', '½ avocado',
  'chimichurri sauce', 'olive oil', 'garlic', 'sea salt'
]), generate_series(1,8) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Steak & Sweet Potato Power Bowl')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Cube and roast sweet potato at 200°C for 25 min.'),
  (2, 'Season steak, sear 3 min each side. Rest 5 min.'),
  (3, 'Layer spinach, sweet potato, sliced steak and avocado.'),
  (4, 'Drizzle chimichurri and serve.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Greek Yoghurt Protein Pancakes', '🥞', 'muscle', 'breakfast',
    'Fluffy high-protein pancakes made with oats, eggs and Greek yoghurt — 40g protein per stack.',
    510, 40, 55, 12,
    'Already vegetarian! Use plant-based yoghurt and swap honey for maple syrup.',
    'Use flax eggs (1 tbsp flaxseed + 3 tbsp water each), oat-based yoghurt, and maple syrup.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '1 cup oats (blended)', '200g Greek yoghurt', '3 eggs', '1 tsp baking powder',
  '1 tbsp honey', '1 tsp vanilla', 'berries to top'
]), generate_series(1,7) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Greek Yoghurt Protein Pancakes')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Blend oats to flour. Mix all ingredients into batter.'),
  (2, 'Heat non-stick pan, pour ¼ cup portions.'),
  (3, 'Cook 2 min per side until golden.'),
  (4, 'Top with berries and extra yoghurt.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Salmon & Quinoa Muscle Plate', '🐟', 'muscle', 'lunch',
    'Omega-3 loaded salmon with protein-dense quinoa, edamame and sesame miso dressing.',
    680, 52, 58, 20,
    'Replace salmon with 200g pan-fried tofu or 2 fried eggs for similar omega fat profile.',
    'Seared tofu or nori-wrapped avocado for sea-like flavour. Add algae oil for omega-3s.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '180g salmon fillet', '¾ cup quinoa', '½ cup edamame', 'cucumber',
  'radish', 'miso paste', 'sesame oil', 'rice vinegar', 'ginger'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Salmon & Quinoa Muscle Plate')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Cook quinoa per packet. Cool slightly.'),
  (2, 'Pan-sear salmon skin-side down 4 min, flip 2 min.'),
  (3, 'Whisk miso, sesame oil, vinegar, ginger for dressing.'),
  (4, 'Assemble bowl and drizzle dressing.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Chicken Burrito Bowl', '🍗', 'muscle', 'lunch',
    'Lean chicken thigh, black beans, brown rice, charred corn and smoky chipotle crema.',
    750, 55, 80, 16,
    'Swap chicken for grilled halloumi strips or a double portion of black beans + cheese.',
    'Use seasoned jackfruit or double black beans. Replace sour cream crema with cashew chipotle sauce.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '220g chicken thighs', '1 cup brown rice', '½ cup black beans', 'corn',
  'red onion', 'chipotle in adobo', 'sour cream', 'lime', 'coriander'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Chicken Burrito Bowl')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Cook brown rice. Season and grill chicken.'),
  (2, 'Char corn in dry pan until slightly blackened.'),
  (3, 'Mix chipotle with sour cream for crema.'),
  (4, 'Assemble rice, beans, chicken, corn, and top with crema.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Mass-Gain Overnight Oats', '🥣', 'muscle', 'breakfast',
    'Calorie-dense overnight oats with nut butter, banana, protein powder and chia seeds.',
    620, 38, 72, 18,
    'Already vegetarian — use any protein powder (whey or plant-based works equally well).',
    'Use oat or soy milk, plant-based protein powder, and maple syrup instead of honey.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '1 cup oats', '300ml whole milk', '1 scoop vanilla protein powder', '1 banana',
  '2 tbsp peanut butter', '1 tbsp chia seeds', 'honey'
]), generate_series(1,7) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Mass-Gain Overnight Oats')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Mix oats, milk, protein powder and chia seeds.'),
  (2, 'Cover and refrigerate overnight (min 6 hrs).'),
  (3, 'Top with sliced banana and peanut butter.'),
  (4, 'Drizzle honey and eat cold or warm.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Beef & Lentil Bolognese', '🍝', 'muscle', 'dinner',
    'Protein-packed red meat bolognese boosted with green lentils and served on pasta.',
    780, 60, 78, 18,
    'Omit beef, double the lentils and add 200g chopped mushrooms for umami depth.',
    'All-lentil bolognese with mushrooms and walnuts. Skip parmesan or use nutritional yeast.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g lean beef mince', '½ cup green lentils', '120g pasta (dry)', 'crushed tomatoes',
  'carrot', 'celery', 'onion', 'garlic', 'fresh basil', 'parmesan'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Beef & Lentil Bolognese')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Brown beef in pan. Set aside. Sauté veg.'),
  (2, 'Add lentils, tomatoes and 400ml water. Simmer 25 min.'),
  (3, 'Stir in beef. Season well.'),
  (4, 'Serve on cooked pasta, top with parmesan and basil.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Egg White & Turkey Omelette', '🍳', 'muscle', 'breakfast',
    '6-egg-white omelette with lean turkey, spinach and low-fat cheese — pure muscle fuel.',
    440, 50, 6, 14,
    'Replace turkey with sautéed mushrooms or 50g crumbled feta for a rich vegetarian version.',
    'Use 200g silken tofu scramble with turmeric and kala namak (black salt for egg flavour).'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '6 egg whites', '100g sliced turkey breast', '1 cup baby spinach', '40g low-fat mozzarella',
  'cherry tomatoes', 'herbs', 'salt & pepper'
]), generate_series(1,7) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Egg White & Turkey Omelette')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Whisk egg whites with salt and herbs.'),
  (2, 'Cook turkey in pan 2 min, add spinach.'),
  (3, 'Pour egg whites over, cook on low until just set.'),
  (4, 'Add cheese, fold and serve with cherry tomatoes.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Tuna Protein Rice Cakes', '🍙', 'muscle', 'snack',
    'Crispy rice cakes loaded with tuna, cottage cheese and everything bagel seasoning.',
    310, 38, 22, 6,
    'Replace tuna with smashed chickpeas or a mix of cream cheese and smoked paprika.',
    'Smashed chickpeas, tahini, lemon and capers for a tuna-style filling. Use dairy-free cream cheese.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '4 plain rice cakes', '160g tinned tuna in water', '100g low-fat cottage cheese',
  'everything bagel seasoning', 'cucumber slices', 'dill', 'lemon juice'
]), generate_series(1,7) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Tuna Protein Rice Cakes')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Drain tuna and mix with cottage cheese, lemon juice and dill.'),
  (2, 'Season with everything bagel spice.'),
  (3, 'Pile generously onto rice cakes.'),
  (4, 'Top with cucumber and extra seasoning.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Cottage Cheese Protein Bowl', '🥄', 'muscle', 'snack',
    'Simple, fast high-protein snack — cottage cheese with walnuts, berries and flaxseed.',
    380, 32, 24, 16,
    'Already vegetarian! Great as-is.',
    'Use 250g plain coconut or soy yoghurt for a similar texture. Add hemp seeds for protein.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '250g full-fat cottage cheese', '30g walnuts', '½ cup mixed berries',
  '1 tbsp flaxseed', '1 tsp honey', 'cinnamon'
]), generate_series(1,6) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Cottage Cheese Protein Bowl')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Scoop cottage cheese into bowl.'),
  (2, 'Top with berries, walnuts and flaxseed.'),
  (3, 'Drizzle honey and dust cinnamon.'),
  (4, 'Eat immediately.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Chicken Thigh & Veggie Stir-Fry', '🥢', 'muscle', 'dinner',
    'High-volume stir-fry with chicken thighs, broccoli, edamame and sticky oyster sauce.',
    640, 48, 55, 15,
    'Replace chicken with 200g firm tofu or seitan strips. Increase edamame to ¾ cup.',
    'Firm tofu or seitan. Use vegan oyster sauce (mushroom-based) instead of regular.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '220g chicken thighs (diced)', '1 cup broccoli florets', '½ cup edamame', 'bell pepper',
  '2 tbsp oyster sauce', 'soy sauce', 'ginger', 'garlic', 'sesame oil', 'jasmine rice'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Chicken Thigh & Veggie Stir-Fry')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Cook rice. Heat oil, stir-fry chicken until golden.'),
  (2, 'Add garlic, ginger, then vegetables.'),
  (3, 'Pour sauces and toss on high heat 3 min.'),
  (4, 'Serve over rice with sesame oil drizzle.')
) AS s(n,txt);

-- ------------------------------------------------------------
-- SEED: FAT LOSS CATEGORY (10 recipes)
-- ------------------------------------------------------------

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Grilled Chicken & Kale Caesar', '🥗', 'fat', 'lunch',
    'Lean protein over massaged kale with a light Greek yoghurt Caesar, no croutons needed.',
    420, 45, 12, 18,
    'Replace chicken with 2 soft-boiled eggs and 30g pine nuts for healthy fats and protein.',
    'Marinated chickpeas roasted crispy. Use vegan caesar (cashew, lemon, capers, dijon).'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '180g chicken breast', '3 cups kale', '20g parmesan',
  'Greek yoghurt', 'lemon', 'dijon mustard', 'anchovy paste', 'garlic', 'salt & pepper'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Grilled Chicken & Kale Caesar')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Grill chicken breast 5 min each side. Rest, then slice.'),
  (2, 'Massage kale with lemon juice and a pinch of salt for 2 min.'),
  (3, 'Whisk dressing ingredients together.'),
  (4, 'Toss kale in dressing, top with chicken and parmesan.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Spiced Egg & Veggie Scramble', '🍳', 'fat', 'breakfast',
    'Low-calorie, high-fibre morning scramble with eggs, peppers, zucchini and chilli.',
    310, 24, 14, 16,
    'Already vegetarian — add 50g crumbled feta for extra richness and calcium.',
    'Tofu scramble with turmeric and kala namak. Use same veg and spices.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '3 whole eggs', '1 zucchini (diced)', '1 red pepper (diced)', '½ onion',
  'cherry tomatoes', 'cumin', 'smoked paprika', 'chilli flakes', 'fresh coriander'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Spiced Egg & Veggie Scramble')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Sauté onion and pepper in minimal oil 3 min.'),
  (2, 'Add zucchini and tomatoes, cook 2 more min.'),
  (3, 'Add spices, then pour in beaten eggs.'),
  (4, 'Fold gently until just set. Top with coriander.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Zucchini Noodles & Turkey Bolognese', '🍝', 'fat', 'dinner',
    'Classic bolognese, stripped of carbs — spiralised zucchini replaces pasta for a 350-calorie dinner.',
    350, 38, 12, 12,
    'Use Puy lentils or crumbled walnuts instead of turkey for a hearty meat-free version.',
    'Walnut-lentil mince and nutritional yeast instead of parmesan.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g turkey mince', '2 large zucchini (spiralised)', 'crushed tomatoes', 'onion',
  'garlic', 'celery', 'fresh basil', '5g parmesan', 'olive oil'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Zucchini Noodles & Turkey Bolognese')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Brown turkey. Set aside. Sauté onion, garlic, celery.'),
  (2, 'Add tomatoes, simmer 20 min. Stir in turkey.'),
  (3, 'Sauté zucchini noodles 2 min only — keep bite.'),
  (4, 'Plate noodles, ladle sauce, add basil and parmesan.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'White Fish Tacos with Slaw', '🌮', 'fat', 'dinner',
    'Light baked cod in corn tortillas with crunchy apple-cabbage slaw and lime crema.',
    380, 32, 38, 10,
    'Swap cod for crispy paneer or battered cauliflower florets. Bake don''t fry.',
    'Spiced crispy chickpeas or battered cauliflower. Cashew-based crema instead of yoghurt.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g cod fillet', '4 corn tortillas', '1 cup red cabbage (shredded)', '1 apple',
  'lime', 'Greek yoghurt', 'sriracha', 'cumin', 'coriander', 'jalapeño'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'White Fish Tacos with Slaw')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Season cod with cumin and bake at 200°C for 15 min.'),
  (2, 'Mix slaw: cabbage, apple, lime juice, coriander.'),
  (3, 'Make crema: yoghurt + sriracha + lime.'),
  (4, 'Assemble tacos and serve with jalapeño.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Berry Protein Smoothie', '🫐', 'fat', 'breakfast',
    'Filling 300-calorie smoothie packed with antioxidants, fibre and 30g lean protein.',
    300, 30, 32, 4,
    'Already vegetarian. Use any protein powder.',
    'Use pea or hemp protein powder. Already plant-based otherwise.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '1 cup frozen mixed berries', '1 scoop vanilla whey protein', '200ml unsweetened almond milk',
  '1 tbsp chia seeds', '½ banana', 'ice'
]), generate_series(1,6) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Berry Protein Smoothie')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Add all ingredients to blender.'),
  (2, 'Blend on high 60 seconds until smooth.'),
  (3, 'Add extra almond milk to adjust consistency.'),
  (4, 'Serve immediately.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Baked Cod & Roasted Asparagus', '🐟', 'fat', 'dinner',
    'Ultra-lean white fish with lemon-herb roasted asparagus and a light mustard dressing.',
    340, 38, 8, 14,
    'Use a thick white fish alternative like paneer steak or a large baked cauliflower steak with same dressing.',
    'Seasoned tofu steak or cauliflower steak. Use vegan dijon (most are).'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g cod fillet', '1 bunch asparagus', 'dijon mustard', 'lemon',
  'olive oil', 'garlic', 'capers', 'fresh dill', 'black pepper'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Baked Cod & Roasted Asparagus')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Toss asparagus in olive oil, garlic, salt. Roast 12 min at 200°C.'),
  (2, 'Spread mustard on cod, top with capers and dill.'),
  (3, 'Bake cod at 200°C for 15 min.'),
  (4, 'Serve with lemon wedge and asparagus.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Turkey Lettuce Wraps', '🥬', 'fat', 'lunch',
    'Asian-style minced turkey in crisp butter lettuce cups — under 300 calories per serving.',
    290, 30, 14, 10,
    'Replace turkey with 200g crumbled firm tofu or finely chopped mushroom and walnut mix.',
    'Mushroom and walnut mince with same sauces. Ensure hoisin is vegan (most are).'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g turkey mince', '1 head butter lettuce', 'water chestnuts', 'shiitake mushrooms',
  'hoisin sauce', 'soy sauce', 'ginger', 'garlic', 'spring onions', 'sesame seeds'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Turkey Lettuce Wraps')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Sauté turkey until cooked. Set aside.'),
  (2, 'Stir-fry mushrooms, chestnuts, garlic, ginger.'),
  (3, 'Add turkey back with hoisin and soy. Toss 2 min.'),
  (4, 'Spoon into lettuce cups, top with sesame and spring onion.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Greek Salad with Grilled Shrimp', '🍤', 'fat', 'lunch',
    'Classic Greek salad elevated with protein-rich grilled shrimp and herby oregano dressing.',
    360, 34, 16, 16,
    'Replace shrimp with 100g extra feta and 2 soft-boiled eggs. Rich and satisfying.',
    'Grilled marinated tofu cubes and swap feta for vegan feta (coconut-based). Olives stay.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g shrimp (peeled)', 'cucumber', 'cherry tomatoes', 'kalamata olives',
  '100g feta', 'red onion', 'oregano', 'extra virgin olive oil', 'lemon juice'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Greek Salad with Grilled Shrimp')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Season and grill shrimp 2 min each side.'),
  (2, 'Chop all vegetables and combine.'),
  (3, 'Whisk olive oil, lemon and oregano.'),
  (4, 'Top salad with shrimp, crumble feta, drizzle dressing.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Egg & Spinach Stuffed Peppers', '🫑', 'fat', 'breakfast',
    'Bell pepper cups baked with egg, spinach, tomato and feta — naturally low-carb and filling.',
    270, 22, 10, 16,
    'Already vegetarian! This is a perfect veg recipe as-is.',
    'Replace egg with seasoned tofu scramble (silken tofu + turmeric). Use vegan feta.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '2 large bell peppers (halved)', '4 eggs', '2 cups baby spinach', '50g feta',
  'cherry tomatoes', 'garlic', 'smoked paprika', 'black pepper'
]), generate_series(1,8) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Egg & Spinach Stuffed Peppers')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Halve peppers and roast at 200°C for 10 min.'),
  (2, 'Sauté spinach and garlic 2 min. Add to peppers.'),
  (3, 'Crack 1 egg into each half. Top with feta and tomato.'),
  (4, 'Bake 12–15 min until egg whites are set.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Miso Soup with Edamame & Tofu', '🍜', 'fat', 'snack',
    'Gut-friendly warming miso broth with tofu, seaweed and edamame — only 160 calories.',
    160, 14, 10, 5,
    'Already vegetarian — use vegetable dashi instead of fish-based.',
    'Use veg dashi and check miso is fermented without bonito (most white miso is vegan).'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '2 tbsp white miso paste', '150g silken tofu', '½ cup edamame (shelled)',
  'dried wakame seaweed', 'spring onions', '600ml dashi or veg stock', 'soy sauce'
]), generate_series(1,7) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Miso Soup with Edamame & Tofu')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Bring stock to gentle simmer (don''t boil).'),
  (2, 'Whisk miso with a little warm stock until smooth.'),
  (3, 'Add tofu, edamame, seaweed to pot.'),
  (4, 'Stir in miso mixture, top with spring onions.')
) AS s(n,txt);

-- ------------------------------------------------------------
-- SEED: GET LEAN CATEGORY (10 recipes)
-- ------------------------------------------------------------

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Mediterranean Tuna Salad', '🫙', 'lean', 'lunch',
    'Clean, bright tuna salad with white beans, capers, sun-dried tomato and parsley over rocket.',
    390, 36, 28, 12,
    'Replace tuna with artichoke hearts and 2 hard-boiled eggs for a similar salty, savoury profile.',
    'Smashed chickpeas marinated with nori, capers and lemon for a tuna of the sea vibe.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '160g tinned tuna in olive oil', '½ cup white beans', '30g capers', 'sun-dried tomatoes',
  'rocket leaves', 'lemon juice', 'parsley', 'red onion', 'black pepper'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Mediterranean Tuna Salad')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Drain tuna, flake into bowl.'),
  (2, 'Add beans, capers, tomatoes, onion.'),
  (3, 'Dress with lemon juice, olive oil, parsley.'),
  (4, 'Serve over fresh rocket.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Avocado Egg Toast', '🥑', 'lean', 'breakfast',
    'Whole grain sourdough with smashed avocado, poached egg, dukkah and chilli flakes.',
    410, 20, 38, 20,
    'Already vegetarian — perfect as-is. Add feta for extra richness.',
    'Replace poached egg with pan-fried firm tofu round seasoned with kala namak.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '2 slices sourdough', '1 ripe avocado', '2 eggs', 'dukkah',
  'chilli flakes', 'lemon juice', 'flaky sea salt', 'rocket'
]), generate_series(1,8) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Avocado Egg Toast')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Toast sourdough until golden.'),
  (2, 'Smash avocado with lemon, salt and chilli flakes.'),
  (3, 'Poach eggs in simmering vinegared water for 3 min.'),
  (4, 'Spread avo, top with egg, dukkah and rocket.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Teriyaki Salmon Rice Bowl', '🍚', 'lean', 'dinner',
    'Glazed teriyaki salmon over brown rice with pickled cucumber, edamame and sesame.',
    580, 42, 55, 16,
    'Teriyaki tofu steak or king oyster mushrooms — they absorb glaze beautifully.',
    'Teriyaki tofu or mushroom. Use maple syrup instead of honey in glaze.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '180g salmon fillet', '¾ cup brown rice', '½ cup edamame', 'cucumber',
  'rice vinegar', 'soy sauce', 'mirin', 'honey', 'sesame seeds', 'spring onions'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Teriyaki Salmon Rice Bowl')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Cook brown rice. Quick-pickle cucumber in vinegar and salt.'),
  (2, 'Mix soy, mirin, honey for teriyaki glaze.'),
  (3, 'Pan-sear salmon, brush glaze, cook 2 min more.'),
  (4, 'Assemble bowl with all ingredients.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Pesto Chicken & Roasted Tomato Pasta', '🍃', 'lean', 'dinner',
    'Wholesome 35g protein pasta — chicken, roasted cherry tomatoes, rocket pesto, whole wheat.',
    560, 42, 60, 14,
    'Replace chicken with a ball of fresh mozzarella (torn) or 2 fried eggs on top.',
    'Use vegan parmesan pesto (nutritional yeast) and top with roasted chickpeas or sunflower seeds.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '180g chicken breast', '100g whole wheat pasta', 'cherry tomatoes',
  'rocket', 'parmesan', 'pine nuts', 'garlic', 'olive oil', 'lemon', 'black pepper'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Pesto Chicken & Roasted Tomato Pasta')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Roast cherry tomatoes at 200°C for 20 min until burst.'),
  (2, 'Cook pasta al dente. Blend pesto ingredients.'),
  (3, 'Slice grilled chicken.'),
  (4, 'Toss pasta in pesto, add chicken and tomatoes.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Lean Turkey Stuffed Peppers', '🫑', 'lean', 'dinner',
    'Baked bell peppers filled with spiced turkey, quinoa, black beans and melted cheese.',
    480, 40, 44, 13,
    'Replace turkey with 200g spiced black lentils or crumbled quorn mince.',
    'Black bean and lentil filling. Use vegan cheese and cashew sour cream.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '4 bell peppers', '200g turkey mince', '½ cup quinoa (cooked)', '½ cup black beans',
  'salsa', 'cumin', 'smoked paprika', '40g cheddar', 'sour cream'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Lean Turkey Stuffed Peppers')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Halve peppers, brush with oil, roast 10 min.'),
  (2, 'Cook turkey with spices. Mix with quinoa and beans.'),
  (3, 'Fill pepper halves, top with cheddar.'),
  (4, 'Bake at 190°C for 20 min. Top with sour cream.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Chlorophyll Green Smoothie Bowl', '🥝', 'lean', 'breakfast',
    'Thick blended green base of spinach, kiwi and mango — topped with granola and seeds.',
    370, 18, 52, 8,
    'Already vegetarian! Great as-is.',
    'Use pea protein and oat milk (which is already in the recipe).'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '1 cup baby spinach', '½ cup frozen mango', '1 kiwi', '1 frozen banana',
  '1 scoop vanilla protein', '150ml oat milk', 'granola', 'hemp seeds', 'chia seeds'
]), generate_series(1,9) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Chlorophyll Green Smoothie Bowl')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Blend spinach, mango, kiwi, banana and oat milk until thick.'),
  (2, 'Add protein powder and blend 10 sec more.'),
  (3, 'Pour into bowl — should be thick enough to support toppings.'),
  (4, 'Top with granola, seeds and extra kiwi slices.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Asian-Style Prawn Noodle Salad', '🍤', 'lean', 'lunch',
    'Cold glass noodles with grilled prawns, mango, cucumber and a zingy peanut-lime dressing.',
    420, 30, 50, 10,
    'Replace prawns with crispy baked tofu or 2 fried eggs sliced over the top.',
    'Crispy tofu — already vegan-friendly. Ensure no fish sauce in dressing (use soy instead).'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g king prawns', '80g glass noodles', '1 mango', 'cucumber', 'red cabbage',
  'carrots', 'mint', 'coriander', 'peanut butter', 'lime', 'soy sauce', 'chilli', 'ginger'
]), generate_series(1,13) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Asian-Style Prawn Noodle Salad')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Soak and rinse glass noodles. Grill prawns 2 min each side.'),
  (2, 'Julienne mango, cucumber, carrot, shred cabbage.'),
  (3, 'Whisk dressing ingredients with warm water to loosen.'),
  (4, 'Toss everything together, top with fresh herbs.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Cauliflower Fried Rice', '🍳', 'lean', 'lunch',
    'Lean hack on fried rice — riced cauliflower with egg, peas, edamame and soy-ginger sauce.',
    320, 22, 22, 14,
    'Already vegetarian! Works perfectly. Add extra eggs or paneer cubes.',
    'Replace eggs with scrambled tofu (turmeric, kala namak). Everything else is vegan.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '1 head cauliflower (riced)', '3 eggs', '½ cup edamame', 'frozen peas',
  'spring onions', 'garlic', 'ginger', 'soy sauce', 'sesame oil', 'chilli'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Cauliflower Fried Rice')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Rice cauliflower by grating or using food processor.'),
  (2, 'Stir-fry garlic, ginger in sesame oil. Add cauliflower.'),
  (3, 'Push to side. Scramble eggs in same pan.'),
  (4, 'Add edamame, peas, soy sauce, toss everything.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Lean Chicken Soup', '🍲', 'lean', 'dinner',
    'Low-calorie, high-protein chicken and vegetable soup with pearl barley and fresh thyme.',
    340, 36, 28, 6,
    'Use 200g white beans or chickpeas instead of chicken with a vegetable stock base.',
    'White bean and vegetable soup. Same method, same herbs, all plant-based.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '200g chicken breast', '1.2L chicken stock', '½ cup pearl barley', 'carrot',
  'celery', 'leek', 'garlic', 'fresh thyme', 'bay leaf', 'parsley'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Lean Chicken Soup')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Poach chicken in stock 15 min. Remove and shred.'),
  (2, 'Add barley, carrot, celery, leek to stock. Simmer 30 min.'),
  (3, 'Return chicken. Add thyme and season well.'),
  (4, 'Serve topped with fresh parsley.')
) AS s(n,txt);

WITH r AS (
  INSERT INTO public.recipes (name, emoji, category, meal_type, description, calories, protein_g, carbs_g, fat_g, veg_swap, vegan_swap)
  VALUES (
    'Edamame & Quinoa Power Salad', '🥗', 'lean', 'lunch',
    'Protein-packed cold salad — quinoa, edamame, roasted sweet potato, pomegranate and tahini.',
    440, 22, 58, 14,
    'Already vegetarian! It''s a fully plant-inclusive salad.',
    'Already vegan! This recipe is completely plant-based.'
  ) RETURNING id
)
INSERT INTO public.ingredients (recipe_id, item, sort_order)
SELECT id, unnest(ARRAY[
  '¾ cup quinoa', '1 cup edamame', '1 small sweet potato (roasted)', 'pomegranate seeds',
  'rocket', 'tahini', 'lemon juice', 'garlic', 'water', 'maple syrup'
]), generate_series(1,10) FROM r;

WITH r AS (SELECT id FROM public.recipes WHERE name = 'Edamame & Quinoa Power Salad')
INSERT INTO public.steps (recipe_id, step_number, instruction)
SELECT id, s.n, s.txt FROM r, (VALUES
  (1, 'Cook and cool quinoa. Roast sweet potato cubes.'),
  (2, 'Make dressing: whisk tahini with lemon, garlic, water.'),
  (3, 'Combine quinoa, edamame, sweet potato, rocket.'),
  (4, 'Add pomegranate seeds, drizzle tahini dressing.')
) AS s(n,txt);

-- ------------------------------------------------------------
-- VIEW: recipes_full — aggregated ingredients + steps per recipe
-- ------------------------------------------------------------

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
