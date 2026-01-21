-- Create user_streaks table for tracking workout consistency
CREATE TABLE public.user_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_workout_date DATE,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create badges table (predefined badges)
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'streak',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_badges table for earned badges
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_streaks
CREATE POLICY "Users can view their own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own streaks" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own streaks" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for badges (everyone can view)
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);

-- RLS policies for user_badges
CREATE POLICY "Users can view their own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert predefined badges
INSERT INTO public.badges (name, description, icon, category, requirement_type, requirement_value) VALUES
  ('First Step', 'Complete your first workout', 'footprints', 'milestone', 'total_workouts', 1),
  ('Getting Started', 'Complete 5 workouts', 'rocket', 'milestone', 'total_workouts', 5),
  ('Dedicated', 'Complete 10 workouts', 'target', 'milestone', 'total_workouts', 10),
  ('Committed', 'Complete 25 workouts', 'medal', 'milestone', 'total_workouts', 25),
  ('Centurion', 'Complete 100 workouts', 'crown', 'milestone', 'total_workouts', 100),
  ('Hot Streak', '3 days in a row', 'flame', 'streak', 'current_streak', 3),
  ('On Fire', '7 days in a row', 'zap', 'streak', 'current_streak', 7),
  ('Unstoppable', '14 days in a row', 'trophy', 'streak', 'current_streak', 14),
  ('Iron Will', '30 days in a row', 'shield', 'streak', 'current_streak', 30),
  ('Legend', '60 days in a row', 'star', 'streak', 'current_streak', 60);