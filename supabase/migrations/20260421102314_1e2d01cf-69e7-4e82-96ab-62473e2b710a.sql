-- HIIT Score history: one row per score computation (nightly + on-demand).
-- Client reads the latest row for the badge and the full series for the trend chart.
-- Writes come from the compute-hiit-score edge function using the service role;
-- users never insert directly.

CREATE TABLE public.hiit_score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  components JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_hiit_score_history_user_computed
  ON public.hiit_score_history (user_id, computed_at DESC);

ALTER TABLE public.hiit_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hiit score history"
  ON public.hiit_score_history FOR SELECT
  USING (auth.uid() = user_id);
