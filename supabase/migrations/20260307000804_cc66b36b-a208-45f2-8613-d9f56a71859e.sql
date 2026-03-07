
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_amount numeric NOT NULL DEFAULT 0,
  period text NOT NULL DEFAULT '/month',
  icon text NOT NULL DEFAULT 'star',
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  features text[] NOT NULL DEFAULT '{}',
  limitations text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active plans
CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default plans
INSERT INTO public.subscription_plans (name, price_amount, period, icon, is_popular, features, limitations, sort_order)
VALUES
  ('Basic', 0, '', 'zap', false, ARRAY['Basic workout plans', 'Progress tracking', 'Community access', 'Limited AI coach'], ARRAY['No personalized plans', 'Limited exercises'], 0),
  ('Standard', 9.99, '/month', 'star', true, ARRAY['Everything in Basic', 'Personalized workouts', 'Nutrition tracking', 'Full AI coach access', 'Progress analytics'], '{}', 1),
  ('Premium', 19.99, '/month', 'crown', false, ARRAY['Everything in Standard', '1-on-1 coaching calls', 'Custom meal plans', 'Priority support', 'Exclusive content', 'Family sharing (up to 5)'], '{}', 2);
