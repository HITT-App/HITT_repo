-- Fix duplicate RLS policies on coaching_sessions
-- Drop the redundant policy that only checks user_id
DROP POLICY IF EXISTS "Users can view own coaching sessions" ON public.coaching_sessions;

-- The remaining policy "Users can view their sessions or sessions where they are coach" 
-- already covers both user_id and coach_id access which is correct

-- Ensure coaches_public is a proper view without sensitive data
-- First check if it's a table or view
DROP VIEW IF EXISTS public.coaches_public CASCADE;

-- Recreate as a secure view exposing only non-sensitive data
CREATE OR REPLACE VIEW public.coaches_public AS
SELECT 
  id,
  name,
  title,
  bio,
  avatar_url,
  specialties,
  certifications,
  coaching_types,
  languages,
  experience_years,
  rating,
  review_count,
  session_count,
  price_per_session_min,
  price_per_session_max,
  is_available,
  is_featured,
  available_days,
  available_hours_start,
  available_hours_end,
  gender,
  gallery_urls,
  created_at,
  updated_at
  -- Intentionally EXCLUDED: location_lat, location_lng, location_address
FROM public.coaches
WHERE is_available = true;