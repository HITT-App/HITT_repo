-- Add goal-prompt preference columns to profiles.
-- goal_prompt_preference: 'later' | 'never' | NULL (null = never asked, treated as "later").
-- 'set' is never stored — active-goal state is derived live from user_goals.is_active.
-- goal_prompt_last_at: when the pop-up was last shown, used for the 7-day re-surface check.
-- Both nullable, additive — no RLS changes (profiles already has owner-scoped RLS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goal_prompt_preference TEXT,
  ADD COLUMN IF NOT EXISTS goal_prompt_last_at TIMESTAMPTZ;
