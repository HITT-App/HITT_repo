import { describe, it, expect } from "bun:test";
import { exerciseEnum, garminSport, garminSportForName, inferCategory, mapOneOff, mapWorkout, matchSentWorkout, parseDistanceMetres, planSync } from "./garmin-workout";

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
    expect(garminSport("Swimming")).toBe("LAP_SWIMMING");
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
    expect(mapWorkout({ title: "Race", category: "Triathlon", exercises: [{ title: "Laps" }] })).toEqual({ ok: false, reason: "unsupported" });
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

describe("inferCategory", () => {
  const w = (title: string, exercises: any[] = [{ title: "Move", duration_seconds: 30 }]) => ({ title, exercises });

  it("uses the catalogue category first", () => {
    expect(inferCategory({ ...w("Morning run"), category: "Strength" })).toBe("Strength");
  });

  it("works out Jarvis and uploaded workouts from the wording", () => {
    expect(inferCategory(w("Easy 5k run"))).toBe("running");
    expect(inferCategory(w("Upper body strength"))).toBe("strength");
    expect(inferCategory(w("Morning session", [{ title: "4 x 100m freestyle" }]))).toBe("swimming");
    expect(inferCategory(w("HIIT burner", [{ title: "Burpees", sets: 3, reps: 10 }]))).toBe("cardio");
    expect(inferCategory(w("Monday", [{ title: "Squats", sets: 3, reps: 10 }]))).toBe("strength");
  });

  it("doesn't mistake a word containing a sport for that sport", () => {
    expect(inferCategory(w("Crunch time"))).toBeNull();
    expect(inferCategory(w("Prune and stretch"))).toBeNull();
  });

  it("sends strength plans as strength, not cardio", () => {
    const r = mapWorkout(w("Upper body strength", [{ title: "Push ups", sets: 3, reps: 10 }]));
    expect(r.ok && r.workout.sport).toBe("STRENGTH_TRAINING");
  });
});

describe("swimming", () => {
  it("reads distances from wording", () => {
    expect(parseDistanceMetres("4 x 100m freestyle")).toBe(100);
    expect(parseDistanceMetres("1.5 km swim")).toBe(1500);
    expect(parseDistanceMetres("400 metres easy")).toBe(400);
    expect(parseDistanceMetres("Easy laps")).toBeNull();
  });

  it("sends distance steps in any pool, with repeats and rest", () => {
    const r = mapWorkout({ title: "Swim session", exercises: [{ title: "Freestyle", distance_m: 100, sets: 4 }, { title: "Backstroke", distance_m: 200 }] });
    if (!r.ok) throw new Error(r.reason);
    expect(r.workout.sport).toBe("LAP_SWIMMING");
    expect(r.workout.poolLength).toBeNull();
    const [repeat, rest, back] = r.workout.segments[0].steps as any[];
    expect(repeat).toMatchObject({ type: "WorkoutRepeatStep", repeatValue: 4, skipLastRestStep: true });
    expect(repeat.steps[0]).toMatchObject({ durationType: "DISTANCE", durationValue: 100, durationValueType: "METER", strokeType: "FREESTYLE", intensity: "MAIN", targetType: null });
    expect(repeat.steps[1]).toMatchObject({ durationType: "FIXED_REST", intensity: "REST" });
    expect(rest.durationType).toBe("FIXED_REST");
    expect(back).toMatchObject({ durationValue: 200, strokeType: "BACKSTROKE" });
  });

  it("falls back to Garmin's timed steps, within its 1 to 59 minute range", () => {
    const r = mapWorkout({ title: "Swim", exercises: [{ title: "Easy swim", duration_seconds: 600 }] });
    if (!r.ok) throw new Error(r.reason);
    expect(r.workout.segments[0].steps[0]).toMatchObject({ durationType: "TIME", durationValue: 600 });
  });

  it("asks for a distance when it has neither", () => {
    expect(mapWorkout({ title: "Swim", exercises: [{ title: "Swim drills" }] })).toEqual({ ok: false, reason: "needs_distance" });
    expect(mapWorkout({ title: "Swim", exercises: [{ title: "Swim drills", duration_seconds: 30 }] })).toEqual({ ok: false, reason: "needs_distance" });
  });
});

describe("mapOneOff", () => {
  it("sends a triathlon as one multisport workout using the chosen distances", () => {
    const r = mapOneOff({ kind: "triathlon", name: "Olympic", swim_km: 1.5, bike_km: 40, run_km: 10 });
    if (!r.ok) throw new Error(r.reason);
    expect(r.workout).toMatchObject({ workoutName: "HIIT Olympic Triathlon", sport: "MULTI_SPORT", isSessionTransitionEnabled: true });
    expect(r.workout.segments.map(s => [s.segmentOrder, s.sport, (s.steps[0] as any).durationValue, (s.steps[0] as any).stepOrder])).toEqual([
      [1, "LAP_SWIMMING", 1500, 1],
      [2, "CYCLING", 40000, 2],
      [3, "RUNNING", 10000, 3],
    ]);
  });

  it("refuses a missing triathlon distance", () => {
    expect(mapOneOff({ kind: "triathlon", swim_km: 0, bike_km: 40, run_km: 10 })).toEqual({ ok: false, reason: "needs_distance" });
  });

  it("sends a chosen sport as an open workout", () => {
    const r = mapOneOff({ kind: "sport", sport: "Run" });
    if (!r.ok) throw new Error(r.reason);
    expect(r.workout.sport).toBe("RUNNING");
    expect(r.workout.segments[0].steps[0]).toMatchObject({ durationType: "OPEN", stepOrder: 1 });
  });

  it("asks for a swim distance and turns away sports Garmin doesn't list", () => {
    expect(mapOneOff({ kind: "sport", sport: "Swim" })).toEqual({ ok: false, reason: "needs_distance" });
    expect(mapOneOff({ kind: "sport", sport: "Swim", distance_m: 1000 }).ok).toBe(true);
    expect(mapOneOff({ kind: "sport", sport: "Surf" })).toEqual({ ok: false, reason: "unsupported" });
    expect(garminSportForName("Surf")).toBeNull();
  });
});

describe("matchSentWorkout", () => {
  const candidates = [
    { id: "a", date: "2026-11-05", sport: "CARDIO_TRAINING" },
    { id: "b", date: "2026-11-05", sport: "RUNNING" },
  ];
  const run = { activity_type: "running", localDate: "2026-11-05", durationSeconds: 1800 };

  it("needs the same day and a matching type", () => {
    expect(matchSentWorkout(run, candidates)).toBe("b");
    expect(matchSentWorkout({ ...run, activity_type: "hiit" }, candidates)).toBe("a");
    expect(matchSentWorkout({ ...run, localDate: "2026-11-06" }, candidates)).toBeNull();
    expect(matchSentWorkout({ ...run, activity_type: "yoga" }, candidates)).toBeNull();
  });

  it("ignores a short accidental recording", () => {
    expect(matchSentWorkout({ ...run, durationSeconds: 30 }, candidates)).toBeNull();
  });
});

describe("garminSportForName with the app's sport names", () => {
  it("covers the sports Garmin can take", () => {
    expect(garminSportForName("Run")).toBe("RUNNING");
    expect(garminSportForName("jogging")).toBe("RUNNING");
    expect(garminSportForName("Trail Run")).toBe("RUNNING");
    expect(garminSportForName("Mountain Bike")).toBe("CYCLING");
    expect(garminSportForName("Weight Training")).toBe("STRENGTH_TRAINING");
    expect(garminSportForName("CrossFit")).toBe("CARDIO_TRAINING");
    expect(garminSportForName("Swim")).toBe("LAP_SWIMMING");
  });

  it("leaves the rest to the start-on-your-watch card", () => {
    for (const sport of ["Walk", "Hike", "Tennis", "Kayak", "Skiing"]) {
      expect(garminSportForName(sport)).toBeNull();
    }
  });
});
