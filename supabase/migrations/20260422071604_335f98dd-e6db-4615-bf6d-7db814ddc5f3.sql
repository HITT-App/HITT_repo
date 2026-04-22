-- Seed content: 15 predefined badges and 20 starter workouts.
--
-- Idempotent — inserts are guarded by NOT EXISTS on name (badges) and title
-- (workouts) so re-running the migration is a no-op and manual edits in the
-- dashboard are preserved.
--
-- Workout video_url is intentionally empty until the founder films the
-- starter set; titles, descriptions, categories, and tags are in place so
-- the catalogue UI is never empty. Badges only use requirement_types that
-- the existing useStreaksAndBadges hook actually evaluates
-- (current_streak, total_workouts) — anything else would show up in the
-- UI but never be awarded.

-- Badges -------------------------------------------------------------------

INSERT INTO public.badges (name, description, icon, category, requirement_type, requirement_value)
SELECT v.name, v.description, v.icon, v.category, v.requirement_type, v.requirement_value
FROM (VALUES
  ('First Steps',            'Kick things off with a 3-day streak.',            'star',     'streak',      'current_streak',  3),
  ('Week Warrior',           'Train 7 days in a row.',                          'flame',    'streak',      'current_streak',  7),
  ('Fortnight Fighter',      'Keep the streak alive for 14 days.',              'flame',    'streak',      'current_streak',  14),
  ('Consistency Champion',   '30 days of non-stop commitment.',                 'trophy',   'streak',      'current_streak',  30),
  ('Sixty and Strong',       'Two solid months of daily workouts.',             'award',    'streak',      'current_streak',  60),
  ('Centurion',              'A full 100 days of streak. Legendary.',           'award',    'streak',      'current_streak',  100),
  ('First Rep',              'Complete your very first workout.',               'dumbbell', 'consistency', 'total_workouts',  1),
  ('Getting Started',        'Finish 5 workouts.',                              'dumbbell', 'consistency', 'total_workouts',  5),
  ('Double Digits',          '10 workouts in the books.',                       'dumbbell', 'consistency', 'total_workouts',  10),
  ('Quarter Century',        '25 workouts completed.',                          'target',   'consistency', 'total_workouts',  25),
  ('Half Century',           'You have hit 50 workouts.',                       'target',   'consistency', 'total_workouts',  50),
  ('Seventy-Five',           '75 sessions — habit locked in.',                  'zap',      'consistency', 'total_workouts',  75),
  ('Century Club',           '100 workouts. Serious business.',                 'trophy',   'consistency', 'total_workouts',  100),
  ('Double Century',         '200 workouts. Dedication.',                       'award',    'consistency', 'total_workouts',  200),
  ('Five Hundred Club',      '500 workouts. Elite tier.',                       'zap',      'consistency', 'total_workouts',  500)
) AS v(name, description, icon, category, requirement_type, requirement_value)
WHERE NOT EXISTS (SELECT 1 FROM public.badges b WHERE b.name = v.name);

-- Workouts -----------------------------------------------------------------

INSERT INTO public.workouts (title, description, category, difficulty, duration_minutes, calories_burned, body_areas, equipment, is_featured)
SELECT v.title, v.description, v.category, v.difficulty, v.duration_minutes, v.calories_burned, v.body_areas, v.equipment, v.is_featured
FROM (VALUES
  ('Full Body HIIT Blaze',        'High-intensity intervals hitting every major muscle group. Minimal rest, maximum return.',                     'hiit',     'intermediate', 20, 220, ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               TRUE),
  ('HIIT Quick 10',               'Ten minutes, no equipment, full burn. Ideal for a busy day.',                                                  'hiit',     'beginner',     10, 100, ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               TRUE),
  ('Tabata Classic',              'Eight rounds of 20 seconds work, 10 seconds rest. The original HIIT protocol.',                                'hiit',     'intermediate', 15, 180, ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               FALSE),
  ('HIIT Advanced Burnout',       'For seasoned athletes. Pyramid intervals and minimal recovery.',                                               'hiit',     'advanced',     30, 380, ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               FALSE),
  ('HIIT Cardio Crusher',         'Interval-based cardio with sprints, jumps, and mountain climbers.',                                            'hiit',     'intermediate', 20, 260, ARRAY['cardio']::TEXT[],                            ARRAY[]::TEXT[],               FALSE),
  ('HIIT Core Finisher',          'Short, sharp core circuit to cap off any session.',                                                            'hiit',     'intermediate', 10, 95,  ARRAY['core']::TEXT[],                              ARRAY[]::TEXT[],               FALSE),
  ('Upper Body Basics',           'Foundational upper-body strength: press, row, curl.',                                                          'strength', 'beginner',     25, 180, ARRAY['upper_body']::TEXT[],                        ARRAY['dumbbells']::TEXT[],    TRUE),
  ('Lower Body Power',            'Squats, lunges, glute bridges — build a stronger lower half.',                                                 'strength', 'intermediate', 30, 230, ARRAY['lower_body','glutes']::TEXT[],               ARRAY['dumbbells']::TEXT[],    FALSE),
  ('Full Body Strength Circuit',  'Compound lifts circuited for time. Strength meets conditioning.',                                              'strength', 'intermediate', 35, 300, ARRAY['full_body']::TEXT[],                         ARRAY['dumbbells']::TEXT[],    FALSE),
  ('Core Foundation',             'Planks, dead bugs, bird dogs — the building blocks of a bulletproof core.',                                    'strength', 'beginner',     15, 95,  ARRAY['core']::TEXT[],                              ARRAY[]::TEXT[],               FALSE),
  ('Beginner Run Workout',        'Gentle intro to steady-state running. Walk-run intervals to build your base.',                                 'cardio',   'beginner',     20, 160, ARRAY['cardio','lower_body']::TEXT[],               ARRAY[]::TEXT[],               FALSE),
  ('Interval Run Session',        'Alternating tempo and recovery runs for serious aerobic gains.',                                               'cardio',   'intermediate', 25, 260, ARRAY['cardio','lower_body']::TEXT[],               ARRAY[]::TEXT[],               FALSE),
  ('Low-Impact Step Cardio',      'Joint-friendly cardio using step-ups and marches. Great for active recovery days.',                            'cardio',   'beginner',     20, 140, ARRAY['cardio','lower_body']::TEXT[],               ARRAY[]::TEXT[],               FALSE),
  ('Morning Mobility Flow',       'Ten minutes to wake up the hips, spine, and shoulders. Start the day moving well.',                            'mobility', 'beginner',     10, 40,  ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               TRUE),
  ('Post-Workout Stretch',        'Full-body cooldown to bring the heart rate down and open up tight muscles.',                                   'mobility', 'beginner',     10, 35,  ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               FALSE),
  ('Hip Opener Flow',             'Targeted mobility for tight hips and lower back. Ideal after a long day at the desk.',                         'mobility', 'beginner',     15, 55,  ARRAY['lower_body','hips']::TEXT[],                 ARRAY[]::TEXT[],               FALSE),
  ('Dynamic Warm-Up',             'Five minutes to prep the body for any workout. Rehearsal of the movements to come.',                           'warmup',   'beginner',     5,  25,  ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               FALSE),
  ('Upper Body Primer',           'Short warm-up specifically for pushing and pulling movements.',                                                'warmup',   'beginner',     5,  20,  ARRAY['upper_body']::TEXT[],                        ARRAY[]::TEXT[],               FALSE),
  ('Foam Rolling Guide',          'Self-myofascial release routine hitting quads, glutes, back, and shoulders.',                                  'recovery', 'beginner',     10, 30,  ARRAY['full_body']::TEXT[],                         ARRAY['foam_roller']::TEXT[],  FALSE),
  ('Breathing and Reset',         'Box breathing and gentle movement to calm the nervous system. No equipment, minimal effort, huge payoff.',     'recovery', 'beginner',     8,  20,  ARRAY['full_body']::TEXT[],                         ARRAY[]::TEXT[],               FALSE)
) AS v(title, description, category, difficulty, duration_minutes, calories_burned, body_areas, equipment, is_featured)
WHERE NOT EXISTS (SELECT 1 FROM public.workouts w WHERE w.title = v.title);
