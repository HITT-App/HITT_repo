-- Grant admin role to the first user in profiles
INSERT INTO public.user_roles (user_id, role) 
SELECT user_id, 'admin' FROM public.profiles 
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE role = 'admin'
)
LIMIT 1;

-- Create moderation logs table
CREATE TABLE IF NOT EXISTS public.moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on moderation_logs
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view moderation logs
CREATE POLICY "Admins can view moderation logs"
ON public.moderation_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can create moderation logs
CREATE POLICY "Admins can create moderation logs"
ON public.moderation_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags
CREATE POLICY "Anyone can view feature flags"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage feature flags
CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at on feature_flags
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default feature flags
INSERT INTO public.feature_flags (name, enabled, description) VALUES
('maintenance_mode', false, 'Enable maintenance mode for the app'),
('community_enabled', true, 'Enable community features'),
('coaching_enabled', true, 'Enable coaching features'),
('push_notifications_enabled', true, 'Enable push notifications')
ON CONFLICT (name) DO NOTHING;