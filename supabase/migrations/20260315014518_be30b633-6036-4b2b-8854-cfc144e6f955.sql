
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  distance_km NUMERIC DEFAULT 0,
  elevation_gain_m NUMERIC DEFAULT 0,
  estimated_minutes INTEGER DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT 'moderate',
  surface_type TEXT DEFAULT 'mixed',
  coordinates JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT true,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read public routes
CREATE POLICY "Anyone can read public routes"
  ON public.routes FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

-- Users can insert their own routes
CREATE POLICY "Users can create own routes"
  ON public.routes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own routes
CREATE POLICY "Users can update own routes"
  ON public.routes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own routes
CREATE POLICY "Users can delete own routes"
  ON public.routes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON public.routes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
