INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-images', 'activity-images', true);

CREATE POLICY "Users can upload their own activity images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'activity-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read access for activity images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'activity-images');

CREATE POLICY "Users can delete their own activity images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'activity-images' AND (storage.foldername(name))[1] = auth.uid()::text);