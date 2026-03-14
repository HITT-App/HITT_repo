
-- Create a unified health_metrics table for all health readings
CREATE TABLE public.health_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- heart_rate, blood_pressure, steps, weight, hydration
  value NUMERIC NOT NULL, -- primary value (bpm, systolic, steps, kg, ml)
  secondary_value NUMERIC, -- secondary value (diastolic for BP)
  unit TEXT NOT NULL DEFAULT '',
  notes TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own health metrics"
  ON public.health_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health metrics"
  ON public.health_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health metrics"
  ON public.health_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health metrics"
  ON public.health_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_health_metrics_user_type ON public.health_metrics (user_id, metric_type, recorded_at DESC);
