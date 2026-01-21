-- Create coaches table
CREATE TABLE public.coaches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  title TEXT NOT NULL DEFAULT 'Certified Fitness Trainer',
  bio TEXT,
  specialties TEXT[] DEFAULT '{}',
  coaching_types TEXT[] DEFAULT '{"in-person", "video-call"}',
  experience_years INTEGER DEFAULT 1,
  certifications TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{"English"}',
  rating NUMERIC(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  price_per_session_min INTEGER DEFAULT 50,
  price_per_session_max INTEGER DEFAULT 150,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  gender TEXT DEFAULT 'other',
  gallery_urls TEXT[] DEFAULT '{}',
  location_address TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  available_days TEXT[] DEFAULT '{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday"}',
  available_hours_start TIME DEFAULT '08:00',
  available_hours_end TIME DEFAULT '18:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coaching preferences table (for matching)
CREATE TABLE public.coaching_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  preferred_workout_types TEXT[] DEFAULT '{}',
  preferred_coach_gender TEXT,
  target_body_areas TEXT[] DEFAULT '{}',
  budget_min INTEGER DEFAULT 50,
  budget_max INTEGER DEFAULT 250,
  session_duration_minutes INTEGER DEFAULT 30,
  coaching_type TEXT DEFAULT 'remote',
  exercise_frequency TEXT,
  workout_time_preference TEXT,
  supplements TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coaching sessions (appointments) table
CREATE TABLE public.coaching_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'in-person',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  price INTEGER NOT NULL,
  notes TEXT,
  user_full_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  meeting_link TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coach reviews table
CREATE TABLE public.coach_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  experience_emoji TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create coach availability slots table
CREATE TABLE public.coach_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_availability ENABLE ROW LEVEL SECURITY;

-- Coaches policies (everyone can view)
CREATE POLICY "Anyone can view coaches" ON public.coaches FOR SELECT USING (true);

-- Coaching preferences policies
CREATE POLICY "Users can view their own preferences" ON public.coaching_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own preferences" ON public.coaching_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.coaching_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Coaching sessions policies
CREATE POLICY "Users can view their own sessions" ON public.coaching_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sessions" ON public.coaching_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.coaching_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Coach reviews policies
CREATE POLICY "Anyone can view reviews" ON public.coach_reviews FOR SELECT USING (true);
CREATE POLICY "Users can create their own reviews" ON public.coach_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coach availability policies
CREATE POLICY "Anyone can view availability" ON public.coach_availability FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_coaches_updated_at BEFORE UPDATE ON public.coaches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coaching_preferences_updated_at BEFORE UPDATE ON public.coaching_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coaching_sessions_updated_at BEFORE UPDATE ON public.coaching_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample coaches
INSERT INTO public.coaches (name, avatar_url, title, bio, specialties, coaching_types, experience_years, certifications, rating, review_count, session_count, price_per_session_min, price_per_session_max, gender, is_featured, languages, gallery_urls) VALUES
  ('Arnold Swarznibble', 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=200', 'HIIT Expert & Nutrition Coach', 'With over 15 years of experience, Coach Arnold has helped hundreds of clients reach their fitness goals through personalized HIIT training and nutrition guidance.', '{"HIIT", "Strength Training", "Bodybuilding", "Nutrition"}', '{"in-person", "video-call"}', 15, '{"Certified Personal Trainer", "Nutrition Specialist"}', 4.8, 203, 500, 100, 200, 'male', true, '{"English", "Spanish"}', '{"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"}'),
  ('Analese Blue', 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=200', 'HIIT & Cardio Expert', 'Specializing in high-intensity interval training and cardiovascular fitness with a focus on sustainable results.', '{"HIIT", "Cardio", "Fat Loss", "Endurance"}', '{"in-person", "video-call", "phone-call"}', 8, '{"ACE Certified", "Group Fitness Instructor"}', 4.9, 156, 380, 80, 150, 'female', true, '{"English"}', '{}'),
  ('Farnese Vandimon', 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=200', 'Lower Body & Endurance Trainer', 'Expert in lower body strength training and building endurance for athletes of all levels.', '{"Lower Body", "Endurance", "Strength", "Flexibility"}', '{"in-person"}', 6, '{"NASM Certified", "Sports Performance Coach"}', 4.1, 89, 220, 60, 120, 'female', false, '{"English", "French"}', '{}'),
  ('Julius White', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=200', 'Cardio & Boxing Coach', 'Combining boxing techniques with cardio for an intense full-body workout experience.', '{"Boxing", "Cardio", "HIIT", "Self-Defense"}', '{"in-person", "video-call"}', 10, '{"Boxing Trainer Certified", "First Aid"}', 4.6, 178, 420, 90, 180, 'male', false, '{"English"}', '{}'),
  ('Julia Gray', 'https://images.unsplash.com/photo-1609899517237-7a1c02f15a9c?w=200', 'Yoga & Mobility Specialist', 'Helping clients improve flexibility, reduce stress, and build core strength through yoga and mobility training.', '{"Yoga", "Mobility", "Flexibility", "Mindfulness"}', '{"video-call", "in-person"}', 12, '{"RYT-500", "Mobility Specialist"}', 4.7, 245, 600, 70, 140, 'female', true, '{"English", "Mandarin"}', '{}');

-- Insert sample availability for coaches
INSERT INTO public.coach_availability (coach_id, day_of_week, start_time, end_time) 
SELECT id, generate_series(1, 5), '09:00'::TIME, '17:00'::TIME FROM public.coaches;