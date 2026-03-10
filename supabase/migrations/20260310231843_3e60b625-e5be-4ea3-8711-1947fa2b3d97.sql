
CREATE TABLE public.home_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  label text NOT NULL,
  enabled boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.home_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read home layout" ON public.home_layout FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update home layout" ON public.home_layout FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.home_layout (section_key, label, sort_order, enabled) VALUES
  ('hero', 'Hero Banner', 0, true),
  ('header', 'Header & Score', 1, true),
  ('stats_grid', 'Stats Grid', 2, true),
  ('fitness_metrics', 'Fitness Metrics', 3, true),
  ('activity', 'Activity', 4, true),
  ('workouts', 'Workouts', 5, true),
  ('coaching', 'Coach Session', 6, true),
  ('nutrition', 'Nutrition', 7, true),
  ('sleep', 'Sleep', 8, true),
  ('ai_coach', 'AI Coach', 9, true),
  ('resources', 'Resources', 10, true);
