
-- Persist full AI body-scan analysis; health_metrics continues to store scalar body_fat for the history chart
CREATE TABLE public.body_scans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL,
  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  estimated_body_fat  NUMERIC,
  confidence_level    TEXT,
  analysis            JSONB NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.body_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own body scans"
  ON public.body_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body scans"
  ON public.body_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body scans"
  ON public.body_scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own body scans"
  ON public.body_scans FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_body_scans_user_scanned ON public.body_scans (user_id, scanned_at DESC);
