
-- Seed feature flags for all app modules
-- Priority features (enabled): workouts, nutrition, food_scanner, community, leaderboard, ai_coach
-- Non-priority features (disabled): activity, sleep, health_metrics, coaching (already exists), resources, challenges, achievements, gamification

INSERT INTO feature_flags (name, description, enabled) VALUES
  ('workouts_enabled', 'Workout library, schedule, and exercise tracking', true),
  ('nutrition_enabled', 'Nutrition dashboard, meal plans, and calorie tracking', true),
  ('food_scanner_enabled', 'AI-powered scan to log food', true),
  ('leaderboard_enabled', 'Leaderboard and rankings', true),
  ('ai_coach_enabled', 'HIIT AI Coach chat assistant', true),
  ('activity_enabled', 'Activity tracker, GPS tracking, and activity goals', false),
  ('sleep_enabled', 'Sleep tracking and sleep dashboard', false),
  ('health_metrics_enabled', 'Health metrics (heart rate, blood pressure, weight, hydration, steps, mood)', false),
  ('resources_enabled', 'Articles, courses, shorts, and learning resources', false),
  ('challenges_enabled', 'Challenges and challenge enrollment', false),
  ('achievements_enabled', 'Achievements and badges', false),
  ('gamification_enabled', 'XP, levels, streaks, and daily check-ins', false)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, enabled = EXCLUDED.enabled;
