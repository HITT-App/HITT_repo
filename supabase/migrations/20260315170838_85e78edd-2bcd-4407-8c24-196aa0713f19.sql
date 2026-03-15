
-- Add is_official and rating columns to routes table
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0;

-- Add met_value and workout_type columns to workouts table
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS met_value numeric DEFAULT 5.0;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS workout_type text DEFAULT 'hiit';

-- Add watch_type to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS watch_type text DEFAULT null;

-- Allow anon/public to read official routes without auth
CREATE POLICY "Anyone can view official routes" ON public.routes FOR SELECT USING (is_official = true);
