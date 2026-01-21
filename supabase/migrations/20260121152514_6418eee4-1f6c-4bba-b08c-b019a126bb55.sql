-- Create nutrition_profiles table for storing user nutrition preferences
CREATE TABLE public.nutrition_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  food_preferences TEXT[], -- vegetarian, vegan, pescatarian, etc.
  allergies TEXT[], -- gluten, wheat, milk, egg, shellfish, etc.
  snack_frequency TEXT, -- one_time, two_times, three_times, etc.
  protein_intake TEXT, -- low, moderate, high
  daily_calorie_target INTEGER DEFAULT 2000,
  notes TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meals table for meal database
CREATE TABLE public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- breakfast, lunch, dinner, snack
  cuisine_type TEXT, -- vegetarian, keto, paleo, etc.
  calories INTEGER,
  protein_grams NUMERIC(6,1),
  fat_grams NUMERIC(6,1),
  carbs_grams NUMERIC(6,1),
  fiber_grams NUMERIC(6,1),
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER DEFAULT 1,
  ingredients JSONB, -- array of {name, amount, unit}
  instructions JSONB, -- array of step strings
  image_url TEXT,
  tags TEXT[],
  rating NUMERIC(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meal_logs table for tracking user meals
CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_id UUID REFERENCES public.meals(id),
  custom_name TEXT, -- for manually logged meals without meal_id
  category TEXT NOT NULL, -- breakfast, lunch, dinner, snack
  calories INTEGER,
  protein_grams NUMERIC(6,1),
  fat_grams NUMERIC(6,1),
  carbs_grams NUMERIC(6,1),
  fiber_grams NUMERIC(6,1),
  servings NUMERIC(4,2) DEFAULT 1,
  image_url TEXT,
  notes TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create nutrition_goals table for daily/weekly goals
CREATE TABLE public.nutrition_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_calories INTEGER DEFAULT 2000,
  daily_protein_grams INTEGER DEFAULT 50,
  daily_fat_grams INTEGER DEFAULT 65,
  daily_carbs_grams INTEGER DEFAULT 250,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Nutrition profiles policies (user-specific)
CREATE POLICY "Users can view their own nutrition profile" ON public.nutrition_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own nutrition profile" ON public.nutrition_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition profile" ON public.nutrition_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Meals policies (public read for browsing)
CREATE POLICY "Anyone can view meals" ON public.meals FOR SELECT USING (true);

-- Meal logs policies (user-specific)
CREATE POLICY "Users can view their own meal logs" ON public.meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own meal logs" ON public.meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal logs" ON public.meal_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal logs" ON public.meal_logs FOR DELETE USING (auth.uid() = user_id);

-- Nutrition goals policies (user-specific)
CREATE POLICY "Users can view their own nutrition goals" ON public.nutrition_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own nutrition goals" ON public.nutrition_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own nutrition goals" ON public.nutrition_goals FOR UPDATE USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_nutrition_profiles_updated_at BEFORE UPDATE ON public.nutrition_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_goals_updated_at BEFORE UPDATE ON public.nutrition_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample meals for browsing
INSERT INTO public.meals (name, description, category, cuisine_type, calories, protein_grams, fat_grams, carbs_grams, fiber_grams, prep_time_minutes, cook_time_minutes, servings, ingredients, instructions, tags, is_featured) VALUES
('Avocado & Chickpea Salad', 'Fresh and nutritious salad with creamy avocado and protein-rich chickpeas', 'lunch', 'vegetarian', 385, 12, 22, 38, 10, 15, 0, 2, '[{"name": "Avocado", "amount": "1", "unit": "whole"}, {"name": "Chickpeas", "amount": "400", "unit": "g"}, {"name": "Cherry Tomatoes", "amount": "200", "unit": "g"}, {"name": "Red Onion", "amount": "1", "unit": "small"}, {"name": "Lemon Juice", "amount": "2", "unit": "tbsp"}]', '["Drain and rinse chickpeas", "Dice avocado and tomatoes", "Mix all ingredients in a bowl", "Dress with lemon juice and olive oil"]', ARRAY['high-protein', 'fiber-rich', 'quick'], true),
('Grilled Steak With Avocado Salsa', 'Tender, healthy, and juicy — all the same time for a better life', 'dinner', 'keto', 648, 45, 48, 12, 5, 20, 10, 1, '[{"name": "Ribeye Steak", "amount": "200", "unit": "g"}, {"name": "Avocado", "amount": "1", "unit": "whole"}, {"name": "Lime", "amount": "1", "unit": "whole"}, {"name": "Cilantro", "amount": "2", "unit": "tbsp"}, {"name": "Garlic", "amount": "2", "unit": "cloves"}]', '["Season steak with salt and pepper", "Grill to desired doneness", "Prepare salsa by mixing diced avocado, lime, and cilantro", "Top steak with salsa and serve"]', ARRAY['high-protein', 'low-carb', 'keto'], true),
('Greek Yogurt Parfait with Nuts & Berries', 'Creamy yogurt layered with crunchy nuts and fresh berries', 'breakfast', 'vegetarian', 380, 18, 16, 42, 4, 5, 0, 1, '[{"name": "Greek Yogurt", "amount": "200", "unit": "g"}, {"name": "Mixed Berries", "amount": "100", "unit": "g"}, {"name": "Honey", "amount": "1", "unit": "tbsp"}, {"name": "Granola", "amount": "30", "unit": "g"}, {"name": "Almonds", "amount": "20", "unit": "g"}]', '["Layer yogurt in a glass", "Add berries and granola", "Drizzle with honey", "Top with almonds"]', ARRAY['high-protein', 'quick', 'breakfast'], true),
('Quinoa & Roasted Veggie Power Bowl', 'Nutrient-dense bowl with roasted vegetables and protein-rich quinoa', 'lunch', 'vegan', 420, 14, 16, 58, 8, 15, 25, 2, '[{"name": "Quinoa", "amount": "150", "unit": "g"}, {"name": "Sweet Potato", "amount": "200", "unit": "g"}, {"name": "Broccoli", "amount": "150", "unit": "g"}, {"name": "Chickpeas", "amount": "100", "unit": "g"}, {"name": "Tahini", "amount": "2", "unit": "tbsp"}]', '["Cook quinoa according to package", "Roast vegetables at 400°F for 25 minutes", "Assemble bowl with quinoa base", "Top with roasted veggies and drizzle tahini"]', ARRAY['vegan', 'high-fiber', 'meal-prep'], true),
('Turmeric Ginger Anti-Inflammatory Smoothie', 'Healing smoothie packed with anti-inflammatory ingredients', 'breakfast', 'vegan', 280, 6, 8, 48, 6, 5, 0, 1, '[{"name": "Banana", "amount": "1", "unit": "whole"}, {"name": "Mango", "amount": "100", "unit": "g"}, {"name": "Turmeric", "amount": "1", "unit": "tsp"}, {"name": "Ginger", "amount": "1", "unit": "tsp"}, {"name": "Coconut Milk", "amount": "250", "unit": "ml"}]', '["Add all ingredients to blender", "Blend until smooth", "Serve immediately"]', ARRAY['anti-inflammatory', 'vegan', 'smoothie'], false),
('Hummus & Fresh Veggie Platter with Pita', 'Classic Mediterranean snack with creamy hummus and crisp vegetables', 'snack', 'vegetarian', 320, 10, 14, 42, 8, 10, 0, 2, '[{"name": "Hummus", "amount": "150", "unit": "g"}, {"name": "Pita Bread", "amount": "2", "unit": "pieces"}, {"name": "Cucumber", "amount": "1", "unit": "whole"}, {"name": "Carrots", "amount": "2", "unit": "whole"}, {"name": "Bell Pepper", "amount": "1", "unit": "whole"}]', '["Slice vegetables into sticks", "Warm pita bread if desired", "Arrange around hummus", "Serve immediately"]', ARRAY['vegetarian', 'mediterranean', 'snack'], true),
('Mushroom Rice Bowl Deluxe', 'Savory rice bowl with sautéed mushrooms and umami flavors', 'dinner', 'vegetarian', 450, 12, 14, 68, 4, 10, 20, 2, '[{"name": "Brown Rice", "amount": "200", "unit": "g"}, {"name": "Mixed Mushrooms", "amount": "250", "unit": "g"}, {"name": "Soy Sauce", "amount": "2", "unit": "tbsp"}, {"name": "Sesame Oil", "amount": "1", "unit": "tbsp"}, {"name": "Green Onions", "amount": "3", "unit": "stalks"}]', '["Cook rice according to package", "Sauté mushrooms until golden", "Season with soy sauce and sesame oil", "Serve over rice with green onions"]', ARRAY['vegetarian', 'umami', 'comfort-food'], false),
('Banana Peanut Butter Protein Smoothie', 'Creamy, protein-packed smoothie perfect for post-workout', 'breakfast', 'vegetarian', 420, 22, 18, 52, 6, 5, 0, 1, '[{"name": "Banana", "amount": "1", "unit": "large"}, {"name": "Peanut Butter", "amount": "2", "unit": "tbsp"}, {"name": "Protein Powder", "amount": "1", "unit": "scoop"}, {"name": "Almond Milk", "amount": "300", "unit": "ml"}, {"name": "Oats", "amount": "30", "unit": "g"}]', '["Add all ingredients to blender", "Blend until smooth and creamy", "Pour and enjoy immediately"]', ARRAY['high-protein', 'post-workout', 'smoothie'], true);