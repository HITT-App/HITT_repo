-- Create accountability_pairs table for partner system
CREATE TABLE public.accountability_pairs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  shared_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, partner_id),
  CHECK (user_id != partner_id)
);

-- Enable RLS
ALTER TABLE public.accountability_pairs ENABLE ROW LEVEL SECURITY;

-- Users can view their own pairs
CREATE POLICY "Users can view their pairs" 
ON public.accountability_pairs 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Users can create pair requests
CREATE POLICY "Users can create pair requests" 
ON public.accountability_pairs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update pairs they're part of
CREATE POLICY "Users can update their pairs" 
ON public.accountability_pairs 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Users can delete their pairs
CREATE POLICY "Users can delete their pairs" 
ON public.accountability_pairs 
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Add fields to workout_progress for resume feature
ALTER TABLE public.workout_progress 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress',
ADD COLUMN IF NOT EXISTS current_exercise_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0;

-- Add user_workout_preferences for smart defaults
CREATE TABLE public.user_workout_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_time TEXT,
  preferred_duration_minutes INTEGER,
  preferred_workout_types TEXT[],
  preferred_equipment TEXT[],
  last_workout_id UUID,
  last_workout_type TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_workout_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their preferences" 
ON public.user_workout_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their preferences
CREATE POLICY "Users can insert preferences" 
ON public.user_workout_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their preferences
CREATE POLICY "Users can update preferences" 
ON public.user_workout_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to update workout preferences after completing a workout
CREATE OR REPLACE FUNCTION public.update_workout_preferences()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    INSERT INTO public.user_workout_preferences (user_id, last_workout_id, updated_at)
    VALUES (NEW.user_id, NEW.workout_id, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      last_workout_id = NEW.workout_id,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER update_preferences_on_workout
AFTER UPDATE ON public.workout_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_workout_preferences();