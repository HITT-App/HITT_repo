
-- Persist user fitness goals stated to Jarvis; user-MD will read this table
CREATE TABLE public.user_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  goal_type     TEXT,        -- "fat loss" | "muscle gain" | "endurance" | "strength" | "event" | "general"
  target_text   TEXT,        -- free-text paraphrase: "lose 5kg", "run a half marathon"
  target_date   DATE,        -- nullable
  is_active     BOOLEAN NOT NULL DEFAULT true,
  set_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.user_goals FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_goals_user_active ON public.user_goals (user_id, is_active, set_at DESC);
