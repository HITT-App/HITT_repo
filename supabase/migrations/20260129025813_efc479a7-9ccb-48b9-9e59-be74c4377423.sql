-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'workouts',
  target_value INTEGER NOT NULL DEFAULT 5,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  status TEXT NOT NULL DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  reward_xp INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge enrollments table
CREATE TABLE public.challenge_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  current_progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, challenge_id)
);

-- Enable RLS
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;

-- Challenges are viewable by everyone
CREATE POLICY "Challenges are viewable by everyone" 
ON public.challenges 
FOR SELECT 
USING (true);

-- Users can view their own enrollments
CREATE POLICY "Users can view their own enrollments" 
ON public.challenge_enrollments 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can enroll themselves
CREATE POLICY "Users can enroll in challenges" 
ON public.challenge_enrollments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own enrollment progress
CREATE POLICY "Users can update their own enrollment" 
ON public.challenge_enrollments 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add calories_burned to workout_progress
ALTER TABLE public.workout_progress 
ADD COLUMN IF NOT EXISTS calories_burned INTEGER DEFAULT 0;

-- Add created_at to workout_progress if missing
ALTER TABLE public.workout_progress 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Insert sample challenges
INSERT INTO public.challenges (title, description, challenge_type, target_value, is_featured, reward_xp)
VALUES 
  ('Burn 2,000 Calories', 'Burn 2,000 calories this week through any workout activity', 'calories', 2000, true, 150),
  ('5 Workout Week', 'Complete 5 workouts this week to earn bonus XP', 'workouts', 5, false, 100),
  ('60 Minutes of Movement', 'Accumulate 60 minutes of exercise time', 'minutes', 60, false, 75);