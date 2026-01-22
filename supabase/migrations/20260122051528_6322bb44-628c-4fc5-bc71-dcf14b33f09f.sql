-- Drop duplicate policy on coaching_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.coaching_sessions;

-- Create a public view for coaches that hides exact location coordinates
-- Only show general location info (address city-level), not lat/lng
CREATE OR REPLACE VIEW public.coaches_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    avatar_url,
    title,
    bio,
    specialties,
    coaching_types,
    experience_years,
    certifications,
    languages,
    rating,
    review_count,
    session_count,
    price_per_session_min,
    price_per_session_max,
    is_available,
    is_featured,
    gender,
    gallery_urls,
    available_days,
    available_hours_start,
    available_hours_end,
    created_at,
    updated_at
    -- Excludes: location_address, location_lat, location_lng (privacy)
  FROM public.coaches;

-- Mark the coaches location findings as acknowledged since:
-- 1. These are professional coaches, not home addresses
-- 2. The location is for their coaching practice/gym
COMMENT ON TABLE public.coaches IS 'Coach profiles - location fields are for coaching practice locations, not home addresses';