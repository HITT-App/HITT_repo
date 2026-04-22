-- Storage buckets + RLS policies.
--
-- Creates the six buckets the app reads/writes: three already referenced
-- in client/edge code (avatars, app-assets, activity-images) and three for
-- upcoming content (workout-videos, workout-thumbnails, meal-images).
-- All public-read so thumbnails and videos can load without signed URLs;
-- writes are gated:
--   avatars         — user writes into their own uid/ prefix
--   others          — admins only (via has_role)
--   activity-images — also allowed for edge functions (service role bypasses RLS)
--
-- Idempotent: bucket inserts use ON CONFLICT DO NOTHING, policies use
-- DROP IF EXISTS + CREATE so re-running the migration is a no-op.

-- Buckets ------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars',            'avatars',            true),
  ('app-assets',         'app-assets',         true),
  ('activity-images',    'activity-images',    true),
  ('workout-videos',     'workout-videos',     true),
  ('workout-thumbnails', 'workout-thumbnails', true),
  ('meal-images',        'meal-images',        true)
ON CONFLICT (id) DO NOTHING;

-- Public read --------------------------------------------------------------
-- A single catch-all SELECT policy for anon/authenticated on all six
-- buckets. Keeps things simple: everything is publicly readable, writes
-- are the gated surface.

DROP POLICY IF EXISTS "Public read on content buckets" ON storage.objects;
CREATE POLICY "Public read on content buckets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN (
    'avatars', 'app-assets', 'activity-images',
    'workout-videos', 'workout-thumbnails', 'meal-images'
  ));

-- Avatars ------------------------------------------------------------------
-- Users can only write objects under a path that starts with their uid.
-- Follows the pattern <user_id>/<filename> that useProfile.ts uses.

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin-write buckets ------------------------------------------------------
-- app-assets, workout-videos, workout-thumbnails, meal-images
-- Admins (role 'admin' via has_role) can insert/update/delete.
-- activity-images is written by edge functions using the service role,
-- which bypasses RLS — so no policy needed for that bucket's writes.

DROP POLICY IF EXISTS "Admins can manage static content" ON storage.objects;
CREATE POLICY "Admins can manage static content"
  ON storage.objects FOR ALL
  USING (
    bucket_id IN ('app-assets', 'workout-videos', 'workout-thumbnails', 'meal-images')
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id IN ('app-assets', 'workout-videos', 'workout-thumbnails', 'meal-images')
    AND public.has_role(auth.uid(), 'admin')
  );
