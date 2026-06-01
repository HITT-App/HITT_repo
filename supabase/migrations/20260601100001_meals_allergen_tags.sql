ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary_tags TEXT[] DEFAULT '{}';
