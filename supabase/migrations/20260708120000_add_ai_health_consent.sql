-- Explicit, opt-in consent for sending Apple Health / HealthKit-derived data
-- (heart rate, steps, sleep, HealthKit-sourced workouts) to the third-party AI
-- provider (Google Gemini) for personalised coaching. Required by App Store
-- Guideline 5.1.3 — health data may only reach a third party with the user's
-- explicit permission. Defaults to FALSE so nothing is shared until the user
-- opts in via Settings.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_health_consent BOOLEAN NOT NULL DEFAULT false;
