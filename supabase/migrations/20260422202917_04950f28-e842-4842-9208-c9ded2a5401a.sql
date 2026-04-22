-- Privatise user-generated media buckets.
--
-- activity-images (workout photos the app generates for users to share)
-- and meal-images (user-uploaded food photos) are sensitive enough that
-- we shouldn't let anyone with the URL retrieve them. Switch them to
-- public=false; clients must use signed URLs for reads. Writes for these
-- two continue to go through the edge-function service role or the
-- per-user "own prefix" rule.
--
-- Workout videos, workout thumbnails, avatars, and app-assets stay public
-- — they're branding/content and meant to be linkable.

UPDATE storage.buckets
SET public = false
WHERE id IN ('activity-images', 'meal-images');

-- Replace the catch-all public-read policy with a narrower one that only
-- covers the buckets still marked public. For the two private buckets,
-- add owner-read policies scoped by first-folder-segment = user_id.

DROP POLICY IF EXISTS "Public read on content buckets" ON storage.objects;

CREATE POLICY "Public read on public content buckets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN (
    'avatars', 'app-assets', 'workout-videos', 'workout-thumbnails'
  ));

CREATE POLICY "Owners can read their private media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id IN ('activity-images', 'meal-images')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can upload to their own prefix in the private buckets (e.g.
-- <uid>/my-lunch.jpg). Edge functions using the service role bypass RLS.

CREATE POLICY "Users can upload their own private media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('activity-images', 'meal-images')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own private media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('activity-images', 'meal-images')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own private media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('activity-images', 'meal-images')
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
