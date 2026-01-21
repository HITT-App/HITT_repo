-- Create activity_preferences table for onboarding
CREATE TABLE public.activity_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_types TEXT[] DEFAULT '{}',
  preferred_time TEXT,
  typical_duration_minutes INTEGER DEFAULT 30,
  intensity_level INTEGER DEFAULT 3,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create activity_goals table
CREATE TABLE public.activity_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weekly_activities INTEGER DEFAULT 5,
  weekly_distance_km NUMERIC DEFAULT 10,
  weekly_calories INTEGER DEFAULT 1500,
  weekly_duration_minutes INTEGER DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create activity_logs table for tracking activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  distance_km NUMERIC,
  calories_burned INTEGER,
  avg_heart_rate INTEGER,
  intensity_level INTEGER,
  route_start_address TEXT,
  route_end_address TEXT,
  route_data JSONB,
  notes TEXT,
  score_impact INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_recommendations table
CREATE TABLE public.activity_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  activity_type TEXT NOT NULL,
  suggested_time TEXT,
  suggested_duration_minutes INTEGER,
  intensity TEXT,
  estimated_calories INTEGER,
  score_reward INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.activity_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_recommendations ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_preferences
CREATE POLICY "Users can view their own activity preferences" ON public.activity_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own activity preferences" ON public.activity_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activity preferences" ON public.activity_preferences FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for activity_goals
CREATE POLICY "Users can view their own activity goals" ON public.activity_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own activity goals" ON public.activity_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activity goals" ON public.activity_goals FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for activity_logs
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own activity logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own activity logs" ON public.activity_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own activity logs" ON public.activity_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for activity_recommendations
CREATE POLICY "Users can view their own recommendations" ON public.activity_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recommendations" ON public.activity_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recommendations" ON public.activity_recommendations FOR UPDATE USING (auth.uid() = user_id);

-- Add update triggers
CREATE TRIGGER update_activity_preferences_updated_at BEFORE UPDATE ON public.activity_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_activity_goals_updated_at BEFORE UPDATE ON public.activity_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();