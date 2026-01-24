-- Fix the SECURITY DEFINER view issue by using SECURITY INVOKER
-- Drop and recreate with explicit security invoker
DROP VIEW IF EXISTS public.coaches_public CASCADE;

-- Recreate as SECURITY INVOKER view (safe - uses caller's permissions)
CREATE VIEW public.coaches_public 
WITH (security_invoker = true) 
AS
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