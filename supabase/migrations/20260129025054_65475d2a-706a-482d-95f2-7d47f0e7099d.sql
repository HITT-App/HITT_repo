-- Create user_levels table for XP and level progression
CREATE TABLE public.user_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  title TEXT DEFAULT 'Rookie',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_checkins table for mood/energy tracking
CREATE TABLE public.daily_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_levels
CREATE POLICY "Users can view their own level" 
ON public.user_levels 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level" 
ON public.user_levels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level" 
ON public.user_levels 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for daily_checkins
CREATE POLICY "Users can view their own checkins" 
ON public.daily_checkins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checkins" 
ON public.daily_checkins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins" 
ON public.daily_checkins 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Enable realtime on workout_progress for friend activity feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_progress;

-- Create function to update user level based on XP
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(xp_amount / 100))::INTEGER + 1)
$$;

-- Create function to get level title
CREATE OR REPLACE FUNCTION public.get_level_title(level_num INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
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

-- Trigger to auto-update level and title when XP changes
CREATE OR REPLACE FUNCTION public.update_level_on_xp_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.level := calculate_level(NEW.xp);
  NEW.title := get_level_title(NEW.level);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_level
BEFORE UPDATE OF xp ON public.user_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_level_on_xp_change();