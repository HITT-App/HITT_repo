-- Fix function search_path warnings
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(xp_amount / 100))::INTEGER + 1)
$$;

CREATE OR REPLACE FUNCTION public.get_level_title(level_num INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN level_num <= 5 THEN 'Rookie'
    WHEN level_num <= 10 THEN 'Rising Star'
    WHEN level_num <= 20 THEN 'Warrior'
    WHEN level_num <= 35 THEN 'Champion'
    WHEN level_num <= 50 THEN 'Legend'
    WHEN level_num <= 75 THEN 'Elite'
    ELSE 'Grandmaster'
  END
$$;