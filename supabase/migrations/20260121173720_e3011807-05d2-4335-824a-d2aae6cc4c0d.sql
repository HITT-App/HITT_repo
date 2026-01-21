-- Create sleep preferences table for onboarding
CREATE TABLE public.sleep_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_hours NUMERIC NOT NULL DEFAULT 8,
  target_minutes INTEGER NOT NULL DEFAULT 0,
  preferred_wake_time TIME DEFAULT '06:30:00',
  preferred_bedtime TIME DEFAULT '22:30:00',
  sleep_issues TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create sleep schedule table
CREATE TABLE public.sleep_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  active_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  bedtime TIME NOT NULL DEFAULT '22:30:00',
  wake_time TIME NOT NULL DEFAULT '06:30:00',
  alarm_sound TEXT DEFAULT 'rooster',
  repeat_alarm TEXT DEFAULT 'one-time',
  vibration_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sleep logs table for tracking actual sleep
CREATE TABLE public.sleep_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sleep_date DATE NOT NULL,
  bedtime TIMESTAMP WITH TIME ZONE NOT NULL,
  wake_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  sleep_quality INTEGER CHECK (sleep_quality >= 0 AND sleep_quality <= 100),
  deep_sleep_minutes INTEGER DEFAULT 0,
  rem_sleep_minutes INTEGER DEFAULT 0,
  light_sleep_minutes INTEGER DEFAULT 0,
  awake_minutes INTEGER DEFAULT 0,
  score_impact INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sleep recommendations table
CREATE TABLE public.sleep_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'sleep',
  score_reward INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.sleep_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_recommendations ENABLE ROW LEVEL SECURITY;

-- Sleep preferences policies
CREATE POLICY "Users can view their own sleep preferences" 
ON public.sleep_preferences FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep preferences" 
ON public.sleep_preferences FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep preferences" 
ON public.sleep_preferences FOR UPDATE 
USING (auth.uid() = user_id);

-- Sleep schedules policies
CREATE POLICY "Users can view their own sleep schedules" 
ON public.sleep_schedules FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep schedules" 
ON public.sleep_schedules FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep schedules" 
ON public.sleep_schedules FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep schedules" 
ON public.sleep_schedules FOR DELETE 
USING (auth.uid() = user_id);

-- Sleep logs policies
CREATE POLICY "Users can view their own sleep logs" 
ON public.sleep_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep logs" 
ON public.sleep_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep logs" 
ON public.sleep_logs FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep logs" 
ON public.sleep_logs FOR DELETE 
USING (auth.uid() = user_id);

-- Sleep recommendations policies
CREATE POLICY "Users can view their own sleep recommendations" 
ON public.sleep_recommendations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep recommendations" 
ON public.sleep_recommendations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep recommendations" 
ON public.sleep_recommendations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep recommendations" 
ON public.sleep_recommendations FOR DELETE 
USING (auth.uid() = user_id);

-- Add update triggers
CREATE TRIGGER update_sleep_preferences_updated_at
BEFORE UPDATE ON public.sleep_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sleep_schedules_updated_at
BEFORE UPDATE ON public.sleep_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();