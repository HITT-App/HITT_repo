import { describe, it, expect } from "bun:test";
import { exerciseEnum, garminSport, mapWorkout, planSync } from "./garmin-workout";

const ok = (r: ReturnType<typeof mapWorkout>) => {
  if (!r.ok) throw new Error(r.reason);
  return r.workout;
};

describe("garminSport", () => {
  it("maps HIIT categories to Garmin's list", () => {
    expect(garminSport("HIIT")).toBe("CARDIO_TRAINING");
    expect(garminSport(null)).toBe("CARDIO_TRAINING");
    expect(garminSport("Strength Training")).toBe("STRENGTH_TRAINING");
    expect(garminSport("Yoga")).toBe("YOGA");
    expect(garminSport("Running")).toBe("RUNNING");
    expect(garminSport("Swimming")).toBeNull();
    expect(garminSport("Triathlon")).toBeNull();
  });
});

describe("exerciseEnum", () => {
  it("matches common names whatever the format", () => {
    expect(exerciseEnum("Push-ups")).toEqual(["PUSH_UP", "PUSH_UP"]);
    expect(exerciseEnum("BURPEES")).toEqual(["TOTAL_BODY", "BURPEE"]);
    expect(exerciseEnum("Inverted thing")).toBeNull();
  });
});

describe("mapWorkout", () => {
  it("builds timed steps with rest between exercises", () => {
    const w = ok(mapWorkout({
      title: "Quick burn",
      category: "HIIT",
      exercises: [
        { title: "Burpees", duration_seconds: 40, order_index: 1 },
        { title: "Unusual move", duration_seconds: 20, order_index: 2 },
      ],
    }));
    expect(w.sport).toBe("CARDIO_TRAINING");
    expect(w.workoutProvider).toBe("HIIT Fitness");
    expect(w.segments[0].steps).toEqual([
      expect.objectContaining({ stepOrder: 1, durationType: "TIME", durationValue: 40, exerciseName: "BURPEE", description: "Burpees" }),
      expect.objectContaining({ stepOrder: 2, intensity: "REST", durationValue: 30 }),
      expect.objectContaining({ stepOrder: 3, durationValue: 20, description: "Unusual move" }),
    ]);
    expect(w.segments[0].steps[2].exerciseName).toBeUndefined();
  });

  it("turns sets and reps into a repeat block, numbering nested steps in order", () => {
    const w = ok(mapWorkout({
      title: "Strength",
      category: "strength",
      exercises: [{ title: "Squats", sets: 3, reps: 10 }, { title: "Plank", duration_seconds: 30 }],
    }));
    const [repeat, rest, plank] = w.segments[0].steps as any[];
    expect(repeat).toMatchObject({ type: "WorkoutRepeatStep", stepOrder: 1, repeatType: "REPEAT_UNTIL_STEPS_CMPLT", repeatValue: 3, skipLastRestStep: true });
    expect(repeat.steps[0]).toMatchObject({ stepOrder: 2, durationType: "REPS", durationValue: 10, exerciseName: "SQUAT" });
    expect(repeat.steps[1]).toMatchObject({ stepOrder: 3, intensity: "REST" });
    expect(rest.stepOrder).toBe(4);
    expect(plank.stepOrder).toBe(5);
  });

  it("sorts by order and defaults a missing duration", () => {
    const w = ok(mapWorkout({ title: "x", exercises: [{ title: "B", order_index: 2 }, { title: "A", order_index: 1 }] }));
    expect(w.segments[0].steps[0]).toMatchObject({ description: "A", durationValue: 45 });
  });

  it("never sends a description, even if the input has one", () => {
    const input: any = {
      title: "Catalogue",
      description: "Owner's written description",
      exercises: [{ title: "Squat", description: "Owner's coaching notes", duration_seconds: 30 }],
    };
    const json = JSON.stringify(ok(mapWorkout(input)));
    expect(json).not.toContain("Owner's");
  });

  it("refuses to truncate an over-long workout", () => {
    const exercises = Array.from({ length: 51 }, (_, i) => ({ title: `E${i}`, duration_seconds: 30 }));
    expect(mapWorkout({ title: "Long", exercises })).toEqual({ ok: false, reason: "too_long" });
    expect(mapWorkout({ title: "Fits", exercises: exercises.slice(0, 50) }).ok).toBe(true);
  });

  it("refuses sports it can't send, and empty workouts", () => {
    expect(mapWorkout({ title: "Swim", category: "Swimming", exercises: [{ title: "Laps" }] })).toEqual({ ok: false, reason: "unsupported" });
    expect(mapWorkout({ title: "Empty", exercises: [] })).toEqual({ ok: false, reason: "unsupported" });
  });
});

describe("planSync", () => {
  const today = "2026-11-05";
  const end = "2026-11-11";
  const link = (id: string, over = {}) => ({ id, hash: "h", hasRow: true, date: today, garminWorkoutId: 1, ...over });

  it("creates new, replaces changed and leaves unchanged", () => {
    const plan = planSync(
      [{ id: "new", date: today, hash: "h" }, { id: "changed", date: today, hash: "h2" }, { id: "same", date: today, hash: "h" }],
      [link("changed"), link("same")],

      end,
    );
    expect(plan.create.map(d => d.id)).toEqual(["new"]);
    expect(plan.replace.map(d => d.id)).toEqual(["changed"]);
    expect(plan.remove).toEqual([]);
  });

  it("removes a deleted workout and one moved beyond the window", () => {
    const plan = planSync([], [link("gone", { hasRow: false }), link("moved", { date: "2026-12-01" })], end);
    expect(plan.remove.map(l => l.id)).toEqual(["gone", "moved"]);
  });

  it("leaves past workouts on Garmin", () => {
    expect(planSync([], [link("past", { date: "2026-11-01" })], end).remove).toEqual([]);
  });
});
