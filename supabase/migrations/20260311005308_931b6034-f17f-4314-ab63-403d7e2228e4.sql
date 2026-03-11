
-- Create app_settings key-value table
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can view app settings"
  ON public.app_settings FOR SELECT
  TO public
  USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage app settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default hero video setting
INSERT INTO public.app_settings (key, value)
VALUES ('hero_video_url', null);

-- Create storage bucket for app assets
INSERT INTO storage.buckets (id, name, public) VALUES ('app-assets', 'app-assets', true)
ON CONFLICT DO NOTHING;

-- Storage policies for app-assets bucket
CREATE POLICY "Anyone can view app assets"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'app-assets');

CREATE POLICY "Admins can upload app assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'app-assets' AND public.has_role(auth.uid(), 'admin'));
