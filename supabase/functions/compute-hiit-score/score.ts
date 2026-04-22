// Pure scoring logic — no Deno or Supabase imports so it's easy to unit-test.
// The edge function's index.ts is responsible for gathering the inputs from
// the database and persisting the result; computeHiitScore() only maps
// inputs → score + components.

export interface HiitScoreInputs {
  /** Number of scheduled_workouts with status=completed in the last 7 days. */
  workoutCount: number;
  /** user_streaks.current_streak. */
  streakDays: number;
  /** Days (of the last 7) where the user hit ≥90% of their protein target. */
  nutritionDaysHit: number;
  /** Days (of the last 7) with sleep_logs.duration_minutes ≥ 420. */
  sleepDaysGood: number;
  /** Average duration across completed workouts (minutes). Drives intensity. */
  avgDurationMinutes: number;
}

export interface HiitScoreComponents {
  workouts: number;
  streak: number;
  nutrition: number;
  sleep: number;
  intensity: number;
  inputs: HiitScoreInputs;
}

export interface HiitScoreResult {
  score: number;
  components: HiitScoreComponents;
}

export const MAX_WORKOUTS = 15;
export const MAX_STREAK = 5;
export const MAX_NUTRITION = 10;
export const MAX_SLEEP = 10;
export const MAX_INTENSITY = 10;
export const BASELINE = 50;

export function computeHiitScore(i: HiitScoreInputs): HiitScoreResult {
  const workouts = Math.min(i.workoutCount * 3, MAX_WORKOUTS);
  const streak = Math.min(i.streakDays, MAX_STREAK);
  const nutrition = Math.min(i.nutritionDaysHit * 2, MAX_NUTRITION);
  const sleep = Math.min(i.sleepDaysGood * 2, MAX_SLEEP);

  const intensityRatio = i.workoutCount > 0 ? Math.min(i.avgDurationMinutes / 20, 1) : 0;
  const intensity = Math.round(intensityRatio * MAX_INTENSITY);

  const raw = BASELINE + workouts + streak + nutrition + sleep + intensity;
  const score = Math.max(0, Math.min(100, raw));

  return {
    score,
    components: {
      workouts,
      streak,
      nutrition,
      sleep,
      intensity,
      inputs: {
        workoutCount: i.workoutCount,
        streakDays: i.streakDays,
        nutritionDaysHit: i.nutritionDaysHit,
        sleepDaysGood: i.sleepDaysGood,
        avgDurationMinutes: Math.round(i.avgDurationMinutes),
      },
    },
  };
}
