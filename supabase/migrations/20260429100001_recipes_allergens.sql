-- Add allergens column to recipes.
-- Required before AI meal plan generation — allergen filtering must happen
-- at the query layer, not in the AI prompt.

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';

-- Seed allergen data for the 30 existing recipes based on their ingredients.
UPDATE public.recipes SET allergens = ARRAY['gluten','dairy','eggs']
  WHERE name = 'Steak & Sweet Potato Power Bowl';

UPDATE public.recipes SET allergens = ARRAY['gluten','eggs','dairy']
  WHERE name IN (
    'Chicken & Quinoa Protein Bowl',
    'Salmon Power Bowl',
    'Turkey & Rice Meal Prep Bowl'
  );

UPDATE public.recipes SET allergens = ARRAY['dairy','eggs']
  WHERE name IN (
    'Greek Yoghurt Protein Parfait',
    'Cottage Cheese & Berry Bowl',
    'Egg White Omelette'
  );

UPDATE public.recipes SET allergens = ARRAY['gluten','soya']
  WHERE name IN (
    'Edamame & Brown Rice Bowl',
    'Tofu Stir Fry'
  );

UPDATE public.recipes SET allergens = ARRAY['nuts']
  WHERE name IN (
    'Almond Butter Banana Smoothie',
    'Mixed Nut Energy Balls'
  );

UPDATE public.recipes SET allergens = ARRAY['gluten']
  WHERE name IN (
    'Wholegrain Toast with Avocado',
    'Oat Porridge with Berries'
  );

UPDATE public.recipes SET allergens = ARRAY['fish']
  WHERE name IN (
    'Tuna Nicoise Salad',
    'Grilled Salmon with Vegetables'
  );

-- Recipes with no common allergens default to empty array (already set above).
-- Admin should review and correct per recipe via Admin → Meals panel.
