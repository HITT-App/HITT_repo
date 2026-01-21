-- Create workout_preferences table for onboarding data
CREATE TABLE public.workout_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_goal TEXT NOT NULL,
  fitness_level TEXT NOT NULL,
  days_per_week INTEGER NOT NULL DEFAULT 3,
  session_duration INTEGER NOT NULL DEFAULT 30,
  target_body_areas TEXT[] DEFAULT '{}',
  available_equipment TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create workouts table for workout content
CREATE TABLE public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  calories_burned INTEGER,
  body_areas TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
  instructor_name TEXT,
  instructor_avatar TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  rating NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_exercises table for individual exercises
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  reps INTEGER,
  sets INTEGER,
  body_area TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_workouts table
CREATE TABLE public.scheduled_workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT DEFAULT 'scheduled',
  completed_at TIMESTAMP WITH TIME ZONE,
  calories_burned INTEGER,
  duration_minutes INTEGER,
  rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_progress table for tracking
CREATE TABLE public.workout_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_id UUID NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.workout_exercises(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_seconds INTEGER,
  notes TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.workout_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_progress ENABLE ROW LEVEL SECURITY;

-- RLS for workout_preferences
CREATE POLICY "Users can view their own workout preferences" ON public.workout_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workout preferences" ON public.workout_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout preferences" ON public.workout_preferences FOR UPDATE USING (auth.uid() = user_id);

-- RLS for workouts (public read)
CREATE POLICY "Anyone can view workouts" ON public.workouts FOR SELECT USING (true);

-- RLS for workout_exercises (public read)
CREATE POLICY "Anyone can view workout exercises" ON public.workout_exercises FOR SELECT USING (true);

-- RLS for scheduled_workouts
CREATE POLICY "Users can view their own scheduled workouts" ON public.scheduled_workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own scheduled workouts" ON public.scheduled_workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own scheduled workouts" ON public.scheduled_workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own scheduled workouts" ON public.scheduled_workouts FOR DELETE USING (auth.uid() = user_id);

-- RLS for workout_progress
CREATE POLICY "Users can view their own workout progress" ON public.workout_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workout progress" ON public.workout_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_workout_preferences_updated_at
  BEFORE UPDATE ON public.workout_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample workouts
INSERT INTO public.workouts (title, description, category, difficulty, duration_minutes, calories_burned, body_areas, equipment, instructor_name, is_featured, rating, rating_count) VALUES
('HIIT Cardio Burn', 'High-intensity interval training to maximize calorie burn', 'cardio', 'intermediate', 30, 350, ARRAY['full-body'], ARRAY['none'], 'Coach Jim', true, 4.8, 234),
('Upper Body Strength', 'Build upper body muscle with compound movements', 'strength', 'beginner', 25, 200, ARRAY['chest', 'shoulders', 'arms'], ARRAY['dumbbells'], 'Sarah Miller', true, 4.6, 189),
('Core Crusher', 'Intense ab workout for a stronger core', 'strength', 'intermediate', 20, 150, ARRAY['abs', 'core'], ARRAY['none', 'mat'], 'Mike Chen', false, 4.7, 156),
('Lower Body Blast', 'Target legs and glutes with this power workout', 'strength', 'advanced', 35, 280, ARRAY['legs', 'glutes'], ARRAY['barbell', 'dumbbells'], 'Jessica Torres', true, 4.9, 312),
('Yoga Flow', 'Relaxing yoga session for flexibility and mindfulness', 'flexibility', 'beginner', 40, 120, ARRAY['full-body'], ARRAY['mat'], 'Emma Wilson', false, 4.5, 98),
('Kickboxing Basics', 'Learn fundamental kickboxing moves while burning calories', 'cardio', 'beginner', 30, 300, ARRAY['full-body', 'arms', 'legs'], ARRAY['none'], 'Marcus Johnson', true, 4.7, 245),
('Back Workout 101', 'Strengthen your back with these essential exercises', 'strength', 'intermediate', 25, 180, ARRAY['back', 'shoulders'], ARRAY['pull-up-bar', 'dumbbells'], 'David Park', false, 4.6, 167),
('Full Body HIIT', 'Complete body workout with high intensity intervals', 'hiit', 'advanced', 45, 450, ARRAY['full-body'], ARRAY['none'], 'Coach Jim', true, 4.8, 289);

-- Seed sample exercises for first workout
INSERT INTO public.workout_exercises (workout_id, title, description, duration_seconds, body_area, order_index) 
SELECT id, 'Jumping Jacks', 'Full body warm-up exercise', 45, 'full-body', 1 FROM public.workouts WHERE title = 'HIIT Cardio Burn';

INSERT INTO public.workout_exercises (workout_id, title, description, duration_seconds, body_area, order_index) 
SELECT id, 'Burpees', 'High-intensity full body movement', 30, 'full-body', 2 FROM public.workouts WHERE title = 'HIIT Cardio Burn';

INSERT INTO public.workout_exercises (workout_id, title, description, duration_seconds, body_area, order_index) 
SELECT id, 'Mountain Climbers', 'Core and cardio combination', 45, 'core', 3 FROM public.workouts WHERE title = 'HIIT Cardio Burn';

INSERT INTO public.workout_exercises (workout_id, title, description, duration_seconds, body_area, order_index) 
SELECT id, 'High Knees', 'Cardio boost exercise', 30, 'legs', 4 FROM public.workouts WHERE title = 'HIIT Cardio Burn';