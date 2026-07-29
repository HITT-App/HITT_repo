-- Task #118 — store body-scan progress photos, with consent.
--
-- The Progress tab's "Visual progress" card has always had FIRST and LATEST slots,
-- but body_scans had nowhere to keep an image, so both slots rendered a placeholder
-- icon forever. Photos were held in React state, sent to analyze-body, and discarded.
--
-- PRIVACY: body photos are materially more sensitive than anything else the app
-- stores. Three deliberate choices follow from that:
--   1. The bucket is PRIVATE. Every other image bucket except activity-images is
--      public; these must never be. Reads go through short-lived signed URLs.
--   2. Storage is OPT-IN per scan. photo_path stays NULL unless the user explicitly
--      agrees on that scan, and body scan works exactly as before if they decline.
--   3. Objects are pathed {user_id}/... so RLS can scope them by the first folder,
--      and so account deletion can remove a user's photos by prefix.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Where the path is recorded.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE public.body_scans
  ADD COLUMN IF NOT EXISTS photo_path TEXT;

COMMENT ON COLUMN public.body_scans.photo_path IS
  'Object path in the private body-scan-photos bucket for the front pose. NULL means '
  'the user did not consent to storing a photo for this scan — which is the default.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Private bucket.
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'body-scan-photos',
  'body-scan-photos',
  false,                                  -- never public
  5242880,                                -- 5 MB; captures are resized to ~0.8 quality JPEG
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,                     -- re-assert if it was ever flipped
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RLS — a user touches only their own folder. No shared or admin read path:
--    nobody but the owner should ever see these, including staff.
-- ─────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users insert own body scan photos" ON storage.objects;
CREATE POLICY "Users insert own body scan photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'body-scan-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users read own body scan photos" ON storage.objects;
CREATE POLICY "Users read own body scan photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'body-scan-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own body scan photos" ON storage.objects;
CREATE POLICY "Users delete own body scan photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'body-scan-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
