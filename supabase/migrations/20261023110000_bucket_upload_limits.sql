-- SEC-007 (2026-10-23): size and type limits on the user-upload buckets.
-- Every current and old app upload path fits: community uploads are re-encoded WebP/PNG
-- (or GIF), video up to 20MB in old builds, voice notes sent as audio/webm; avatars are
-- cropped to JPEG. Nothing in meal-images or activity-images is uploaded by the app.
UPDATE storage.buckets
SET file_size_limit = 25 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp',
                               'video/mp4', 'video/webm', 'video/ogg', 'audio/*']
WHERE id = 'community-images';

UPDATE storage.buckets
SET file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'avatars';

UPDATE storage.buckets
SET file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/*']
WHERE id IN ('activity-images', 'meal-images');
