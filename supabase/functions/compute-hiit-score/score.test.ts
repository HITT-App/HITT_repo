import { describe, it, expect } from "bun:test";
import {
  computeHiitScore,
  BASELINE,
  MAX_WORKOUTS,
  MAX_STREAK,
  MAX_NUTRITION,
  MAX_SLEEP,
  MAX_INTENSITY,
} from "./score";

const EMPTY = {
  workoutCount: 0,
  streakDays: 0,
  nutritionDaysHit: 0,
  sleepDaysGood: 0,
  avgDurationMinutes: 0,
};

describe("computeHiitScore", () => {
  it("returns baseline 50 for a completely inactive user", () => {
    const { score, components } = computeHiitScore(EMPTY);
    expect(score).toBe(BASELINE);
    expect(components.workouts).toBe(0);
    expect(components.streak).toBe(0);
    expect(components.nutrition).toBe(0);
    expect(components.sleep).toBe(0);
    expect(components.intensity).toBe(0);
  });

  it("returns 100 for a user who maxes every signal", () => {
    const { score, components } = computeHiitScore({
      workoutCount: 7,
      streakDays: 365,
      nutritionDaysHit: 7,
      sleepDaysGood: 7,
      avgDurationMinutes: 45,
    });
    expect(score).toBe(100);
    expect(components.workouts).toBe(MAX_WORKOUTS);
    expect(components.streak).toBe(MAX_STREAK);
    expect(components.nutrition).toBe(MAX_NUTRITION);
    expect(components.sleep).toBe(MAX_SLEEP);
    expect(components.intensity).toBe(MAX_INTENSITY);
  });

  it("never exceeds 100 no matter how extreme the inputs", () => {
    const { score } = computeHiitScore({
      workoutCount: 999,
      streakDays: 9999,
      nutritionDaysHit: 99,
      sleepDaysGood: 99,
      avgDurationMinutes: 600,
    });
    expect(score).toBe(100);
  });

  it("never drops below 0 (though floor is really 50 from baseline)", () => {
    const { score } = computeHiitScore(EMPTY);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("awards 3 points per workout up to the 15-point ceiling", () => {
    // 4 workouts × 3 = 12 points
    expect(computeHiitScore({ ...EMPTY, workoutCount: 4 }).components.workouts).toBe(12);
    // 5 workouts would give 15 — exactly the ceiling
    expect(computeHiitScore({ ...EMPTY, workoutCount: 5 }).components.workouts).toBe(15);
    // 6th workout is wasted — stays at the 15 ceiling
    expect(computeHiitScore({ ...EMPTY, workoutCount: 6 }).components.workouts).toBe(15);
  });

  it("caps the streak contribution at 5 points regardless of streak length", () => {
    expect(computeHiitScore({ ...EMPTY, streakDays: 3 }).components.streak).toBe(3);
    expect(computeHiitScore({ ...EMPTY, streakDays: 5 }).components.streak).toBe(5);
    expect(computeHiitScore({ ...EMPTY, streakDays: 100 }).components.streak).toBe(5);
  });

  it("awards 2 points per nutrition day hit up to the 10-point ceiling", () => {
    expect(computeHiitScore({ ...EMPTY, nutritionDaysHit: 3 }).components.nutrition).toBe(6);
    expect(computeHiitScore({ ...EMPTY, nutritionDaysHit: 5 }).components.nutrition).toBe(10);
    expect(computeHiitScore({ ...EMPTY, nutritionDaysHit: 7 }).components.nutrition).toBe(10);
  });

  it("awards 2 points per good-sleep day up to the 10-point ceiling", () => {
    expect(computeHiitScore({ ...EMPTY, sleepDaysGood: 4 }).components.sleep).toBe(8);
    expect(computeHiitScore({ ...EMPTY, sleepDaysGood: 5 }).components.sleep).toBe(10);
    expect(computeHiitScore({ ...EMPTY, sleepDaysGood: 7 }).components.sleep).toBe(10);
  });

  it("gives zero intensity when there are no workouts even if avgDuration is set", () => {
    const { components } = computeHiitScore({ ...EMPTY, avgDurationMinutes: 60 });
    expect(components.intensity).toBe(0);
  });

  it("ramps intensity linearly up to 20-minute avg, then caps", () => {
    const base = { ...EMPTY, workoutCount: 1 };
    expect(computeHiitScore({ ...base, avgDurationMinutes: 0 }).components.intensity).toBe(0);
    expect(computeHiitScore({ ...base, avgDurationMinutes: 10 }).components.intensity).toBe(5);
    expect(computeHiitScore({ ...base, avgDurationMinutes: 20 }).components.intensity).toBe(10);
    expect(computeHiitScore({ ...base, avgDurationMinutes: 60 }).components.intensity).toBe(10);
  });

  it("produces a middle-of-the-road score for a reasonable week", () => {
    // Someone training 3x/week, 30-minute avg sessions, hitting protein 4 days
    // and sleeping well 5 nights, on a 10-day streak.
    const { score } = computeHiitScore({
      workoutCount: 3,
      streakDays: 10,
      nutritionDaysHit: 4,
      sleepDaysGood: 5,
      avgDurationMinutes: 30,
    });
    // 50 + 9 (3x3) + 5 (cap) + 8 (4x2) + 10 (5x2 cap) + 10 (intensity cap) = 92
    expect(score).toBe(92);
  });

  it("echoes raw inputs back in components.inputs, rounding avgDuration", () => {
    const { components } = computeHiitScore({
      workoutCount: 2,
      streakDays: 4,
      nutritionDaysHit: 3,
      sleepDaysGood: 2,
      avgDurationMinutes: 23.6,
    });
    expect(components.inputs).toEqual({
      workoutCount: 2,
      streakDays: 4,
      nutritionDaysHit: 3,
      sleepDaysGood: 2,
      avgDurationMinutes: 24,
    });
  });
});
