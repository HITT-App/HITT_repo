-- Add dietary_tags column to recipes
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS dietary_tags text[] DEFAULT '{}';

-- Tag every recipe based on:
--   vegetarian  : no meat, fish, or seafood
--   vegan       : vegetarian + no dairy (milk) + no eggs
--   gluten_free : 'gluten' absent from allergens
--   dairy_free  : 'milk' absent from allergens
--   low_carb    : carbs_g <= 20
--   halal_friendly  : no pork, no alcohol (all current recipes qualify)
--   kosher_friendly : no shellfish; kosher fish (fins+scales) ok;
--                     no mixing poultry/meat with dairy

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '4eb9b6cb-0084-4597-a7b3-7f0d122e4929'; -- Avocado Egg Toast

UPDATE recipes SET dietary_tags = ARRAY['dairy_free','halal_friendly','low_carb','kosher_friendly']
  WHERE id = 'ceb8d516-377b-4e70-9c5a-084550a7592d'; -- Baked Cod & Roasted Asparagus

UPDATE recipes SET dietary_tags = ARRAY['gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = 'b6640ae5-2155-453a-9872-7b3228a3c965'; -- Beef & Lentil Bolognese

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','halal_friendly','kosher_friendly']
  WHERE id = 'fb814780-2091-4a6d-adfd-cf3ab4858b84'; -- Berry Protein Smoothie

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','vegan','gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '2f2e3f38-ba4a-46cf-911a-88e8dd67263a'; -- Cauliflower Fried Rice

UPDATE recipes SET dietary_tags = ARRAY['dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '41cbace6-0df4-4093-bc55-d344d7230e44'; -- Chicken Burrito Bowl

UPDATE recipes SET dietary_tags = ARRAY['gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '0c4f58fb-417f-4c25-9501-8126a757ead7'; -- Chicken Thigh & Veggie Stir-Fry

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','gluten_free','halal_friendly','kosher_friendly']
  WHERE id = 'dbb8f25c-1f06-4ddd-baad-bccab2621a12'; -- Chlorophyll Green Smoothie Bowl

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','gluten_free','halal_friendly','kosher_friendly']
  WHERE id = '0f57d849-1f46-4f40-8652-8ed58d335a53'; -- Cottage Cheese Protein Bowl

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','vegan','gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = 'd4e65a9b-d4b7-47f8-8b06-731f59166efa'; -- Edamame & Quinoa Power Salad

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','gluten_free','halal_friendly','kosher_friendly','low_carb']
  WHERE id = 'ce66353c-7921-40ab-b40b-d2b1c1d06891'; -- Egg & Spinach Stuffed Peppers

-- Turkey + dairy allergen (milk in eggs+milk combo) = poultry+dairy = not kosher
UPDATE recipes SET dietary_tags = ARRAY['gluten_free','halal_friendly','low_carb']
  WHERE id = '36042fdf-5a34-4ef9-96bf-ad00263f28f6'; -- Egg White & Turkey Omelette

-- Shrimp = shellfish = not kosher
UPDATE recipes SET dietary_tags = ARRAY['gluten_free','dairy_free','halal_friendly','low_carb']
  WHERE id = '77f8ada6-ee7a-4a28-acdd-896b0187ee46'; -- Greek Salad with Grilled Shrimp

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','halal_friendly','kosher_friendly']
  WHERE id = 'e334ccb2-2c66-465b-9bce-d459fffa02a1'; -- Greek Yoghurt Protein Pancakes

-- Chicken + milk (Caesar dressing) = poultry+dairy = not kosher
UPDATE recipes SET dietary_tags = ARRAY['halal_friendly','low_carb']
  WHERE id = 'fa2bd028-b8bb-4881-9523-a4bfc5cc96ed'; -- Grilled Chicken & Kale Caesar

UPDATE recipes SET dietary_tags = ARRAY['gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '1bfa46fb-a148-48b1-ae97-81d7b3cde55b'; -- Lean Chicken Soup

UPDATE recipes SET dietary_tags = ARRAY['dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '3ca8f8af-2bdb-4b5f-b40f-e41c68a90149'; -- Lean Turkey Stuffed Peppers

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','halal_friendly','kosher_friendly']
  WHERE id = 'efbd6002-a322-4763-8169-94fe54874909'; -- Mass-Gain Overnight Oats

UPDATE recipes SET dietary_tags = ARRAY['gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '9a4b3008-71eb-402b-ade7-d7a5bfb749fa'; -- Mediterranean Tuna Salad

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','vegan','gluten_free','dairy_free','halal_friendly','kosher_friendly','low_carb']
  WHERE id = '39f28f6e-bb25-42db-999c-7e153aba0649'; -- Miso Soup with Edamame & Tofu

-- Asian-Style Prawn Noodle Salad — prawns are shellfish, not kosher
UPDATE recipes SET dietary_tags = ARRAY['dairy_free','halal_friendly']
  WHERE id = 'ca9e20ca-ddc6-41fd-8afa-a753b08fb06a'; -- Asian-Style Prawn Noodle Salad

-- Chicken + milk (pesto) = poultry+dairy = not kosher
UPDATE recipes SET dietary_tags = ARRAY['halal_friendly']
  WHERE id = '94294dbd-2828-4af9-b65c-e3c340ff032e'; -- Pesto Chicken & Roasted Tomato Pasta

UPDATE recipes SET dietary_tags = ARRAY['gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '44ee6f50-eb4a-4b93-8108-fe7cefe21d45'; -- Salmon & Quinoa Muscle Plate

UPDATE recipes SET dietary_tags = ARRAY['vegetarian','gluten_free','dairy_free','halal_friendly','kosher_friendly','low_carb']
  WHERE id = 'cfdedd8b-bc3c-47d8-bba6-a485bc2eb650'; -- Spiced Egg & Veggie Scramble

-- Beef + milk = meat+dairy = not kosher
UPDATE recipes SET dietary_tags = ARRAY['gluten_free','halal_friendly']
  WHERE id = 'e61e4b1e-147a-43b2-9785-5231fbea443a'; -- Steak & Sweet Potato Power Bowl

UPDATE recipes SET dietary_tags = ARRAY['dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '2fa1c760-05ea-477f-a01b-38fe6cf7bb3e'; -- Teriyaki Salmon Rice Bowl

UPDATE recipes SET dietary_tags = ARRAY['gluten_free','dairy_free','halal_friendly','kosher_friendly']
  WHERE id = '595b23d6-1ac6-43a9-a68f-539dc00405ff'; -- Tuna Protein Rice Cakes

UPDATE recipes SET dietary_tags = ARRAY['dairy_free','halal_friendly','kosher_friendly','low_carb']
  WHERE id = '500714f9-358b-4c6d-9507-f0cb881f09f6'; -- Turkey Lettuce Wraps

-- White fish + dairy: fish+dairy is permitted in most Ashkenazi kashrut
UPDATE recipes SET dietary_tags = ARRAY['halal_friendly','kosher_friendly']
  WHERE id = '1e3dd4ce-7661-4837-9424-88eaa38b4bee'; -- White Fish Tacos with Slaw

UPDATE recipes SET dietary_tags = ARRAY['dairy_free','halal_friendly','kosher_friendly','low_carb']
  WHERE id = 'ba85c87e-f428-45a1-b7f8-d3c3632c8860'; -- Zucchini Noodles & Turkey Bolognese
