-- Create storage bucket for community post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-images', 'community-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload community images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-images' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view community images (public bucket)
CREATE POLICY "Anyone can view community images"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-images');

-- Allow users to update their own images
CREATE POLICY "Users can update their own community images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own community images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);