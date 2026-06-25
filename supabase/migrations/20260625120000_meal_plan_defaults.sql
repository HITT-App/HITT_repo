-- Saved meal-plan wizard defaults — when a user ticks "Save these as my
-- defaults" on the wizard review screen, the wizard's choices are persisted
-- here so subsequent meal-plan requests can skip the wizard.
--
-- Shape (jsonb):
-- {
--   "scope": "day" | "meal",
--   "calories": int,           -- per-meal
--   "macros": { "protein": bool, "carbs": bool, "fat": bool },
--   "proteinG": int | null,    -- per-meal grams
--   "carbsG":   int | null,
--   "fatG":     int | null,
--   "proteinSources": ["lean" | "red" | "fish" | "plant" | "any", ...],
--   "proteinFreeText": string,
--   "mealsCount": int,
--   "savedAt": iso8601
-- }

alter table nutrition_profiles
  add column if not exists meal_plan_defaults jsonb;

comment on column nutrition_profiles.meal_plan_defaults is
  'Cached choices from the meal-plan wizard so users can skip it on repeat runs. NULL when no defaults saved.';
