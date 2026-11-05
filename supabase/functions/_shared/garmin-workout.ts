// HIIT workout → Training API V2. Only names and steps go to Garmin, which may reuse whatever
// it receives with no duty to remove it. Exercise and workout descriptions stay here.

export type HiitExercise = {
  title: string;
  duration_seconds?: number | null;
  sets?: number | null;
  reps?: number | null;
  order_index?: number | null;
  distance_m?: number | null;
};

export type HiitWorkout = {
  title: string | null;
  category?: string | null;
  exercises: HiitExercise[];
};

type Step = Record<string, unknown>;

export type GarminWorkout = {
  workoutName: string;
  sport: string;
  workoutProvider: string;
  workoutSourceId: string;
  isSessionTransitionEnabled: boolean;
  poolLength?: null;
  poolLengthUnit?: null;
  segments: { segmentOrder: number; sport: string; steps: Step[]; poolLength?: null; poolLengthUnit?: null }[];
};

export type MapResult =
  | { ok: true; workout: GarminWorkout }
  | { ok: false; reason: "too_long" | "unsupported" | "needs_distance" };

const PROVIDER = "HIIT Fitness";
const MAX_SINGLE_SPORT_STEPS = 100;
const MAX_STEP_TEXT = 512;
// Matches the rest used by HIIT's own workout player.
const REST_SECONDS = 30;
const DEFAULT_EXERCISE_SECONDS = 45;
// Garmin's range for timed swim steps.
const MIN_SWIM_SECONDS = 60;
const MAX_SWIM_SECONDS = 59 * 60;

// Only pairs checked against Garmin's Appendix B. Anything else is sent as text.
const EXERCISES: Record<string, [string, string]> = {
  "push up": ["PUSH_UP", "PUSH_UP"],
  "pull up": ["PULL_UP", "PULL_UP"],
  "squat": ["SQUAT", "SQUAT"],
  "jump squat": ["PLYO", "JUMP_SQUAT"],
  "lunge": ["LUNGE", "LUNGE"],
  "plank": ["PLANK", "PLANK"],
  "side plank": ["PLANK", "SIDE_PLANK"],
  "mountain climber": ["PLANK", "MOUNTAIN_CLIMBER"],
  "burpee": ["TOTAL_BODY", "BURPEE"],
  "box jump": ["PLYO", "BOX_JUMP"],
  "crunch": ["CRUNCH", "CRUNCH"],
  "bicycle crunch": ["CRUNCH", "BICYCLE_CRUNCH"],
  "sit up": ["SIT_UP", "SIT_UP"],
  "russian twist": ["CORE", "RUSSIAN_TWIST"],
  "jumping jack": ["CARDIO", "JUMPING_JACKS"],
  "kettlebell swing": ["HIP_RAISE", "KETTLEBELL_SWING"],
};

export function garminSport(category: string | null | undefined): string | null {
  const c = (category ?? "").toLowerCase();
  if (c.includes("swim")) return "LAP_SWIMMING";
  if (c.includes("triathlon") || c.includes("multi")) return null;
  if (c.includes("strength")) return "STRENGTH_TRAINING";
  if (c.includes("yoga")) return "YOGA";
  if (c.includes("pilates")) return "PILATES";
  if (c.includes("run")) return "RUNNING";
  if (c.includes("cycl") || c.includes("bik")) return "CYCLING";
  // Garmin's list has no HIIT sport value. Asked in the email to Garmin.
  return "CARDIO_TRAINING";
}

// Jarvis and uploaded workouts have no catalogue category, so the sport comes from the text.
export function inferCategory(workout: HiitWorkout): string | null {
  if (workout.category) return workout.category;
  const title = (workout.title ?? "").toLowerCase();
  const exercises = workout.exercises.map(e => e.title.toLowerCase()).join(" ");
  if (/\b(triathlon|brick)\b/.test(title)) return "triathlon";
  if (/\b(hiit|tabata|cardio|circuit)\b/.test(title)) return "cardio";
  if (/\bswim|\b(freestyle|backstroke|breaststroke)\b/.test(`${title} ${exercises}`)) return "swimming";
  if (/\byoga\b/.test(title)) return "yoga";
  if (/\bpilates\b/.test(title)) return "pilates";
  if (/\b(run|running|jog|tempo|5k|10k)\b/.test(title)) return "running";
  if (/\b(cycle|cycling|bike|ride|spin)\b/.test(title)) return "cycling";
  if (/\b(strength|weights?|lifting|upper body|lower body|push|pull|legs)\b/.test(title)) return "strength";
  if (workout.exercises.length && workout.exercises.every(e => e.sets && e.reps)) return "strength";
  return null;
}

// Uploaded plans often only have the distance in the wording: "4 x 100m freestyle", "1.5 km swim".
export function parseDistanceMetres(text: string): number | null {
  const km = text.match(/(\d+(?:\.\d+)?)\s*(?:km|kilomet)/i);
  if (km) return Math.round(Number(km[1]) * 1000);
  const m = text.match(/(\d+)\s*(?:m\b|met(?:er|re)s?\b)/i);
  return m ? Number(m[1]) : null;
}

function swimStroke(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("back")) return "BACKSTROKE";
  if (t.includes("breast")) return "BREASTSTROKE";
  if (t.includes("butterfly") || /\bfly\b/.test(t)) return "BUTTERFLY";
  if (t.includes("free")) return "FREESTYLE";
  return "CHOICE";
}

// Returns null if it has neither a distance nor a duration Garmin accepts.
function swimStep(ex: HiitExercise): Step | null {
  const distance = ex.distance_m ?? parseDistanceMetres(ex.title);
  const seconds = ex.duration_seconds ?? 0;
  const base = {
    type: "WorkoutStep",
    intensity: "MAIN",
    description: ex.title.slice(0, MAX_STEP_TEXT),
    targetType: null,
    strokeType: swimStroke(ex.title),
  };
  if (distance && distance > 0) {
    return { ...base, durationType: "DISTANCE", durationValue: distance, durationValueType: "METER" };
  }
  if (seconds >= MIN_SWIM_SECONDS && seconds <= MAX_SWIM_SECONDS) {
    return { ...base, durationType: "TIME", durationValue: seconds };
  }
  return null;
}

function swimRestStep(): Step {
  return {
    type: "WorkoutStep",
    intensity: "REST",
    description: "Rest",
    durationType: "FIXED_REST",
    durationValue: REST_SECONDS,
    targetType: null,
  };
}

function mapSwim(workout: HiitWorkout, exercises: HiitExercise[]): MapResult {
  const steps: Step[] = [];
  for (const [i, ex] of exercises.entries()) {
    const step = swimStep(ex);
    if (!step) return { ok: false, reason: "needs_distance" };
    const sets = ex.sets ?? 1;
    if (sets > 1) {
      steps.push({
        type: "WorkoutRepeatStep",
        repeatType: "REPEAT_UNTIL_STEPS_CMPLT",
        repeatValue: sets,
        skipLastRestStep: true,
        steps: [step, swimRestStep()],
      });
    } else {
      steps.push(step);
    }
    if (i < exercises.length - 1) steps.push(swimRestStep());
  }
  if (countSteps(steps) > MAX_SINGLE_SPORT_STEPS) return { ok: false, reason: "too_long" };
  return {
    ok: true,
    workout: {
      workoutName: workout.title?.trim() || "Swim",
      sport: "LAP_SWIMMING",
      workoutProvider: PROVIDER,
      workoutSourceId: PROVIDER,
      isSessionTransitionEnabled: false,
      // Unspecified, so it can be done in any pool.
      poolLength: null,
      poolLengthUnit: null,
      segments: [{ segmentOrder: 1, sport: "LAP_SWIMMING", steps: numberSteps(steps) }],
    },
  };
}

export function exerciseEnum(title: string): [string, string] | null {
  const key = title.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim().replace(/s$/, "");
  return EXERCISES[key] ?? null;
}

// A set counts as reps only when it has both, matching the workout player.
function exerciseStep(ex: HiitExercise, sport: string): Step {
  const byReps = !!ex.sets && !!ex.reps;
  const enums = sport === "STRENGTH_TRAINING" || sport === "CARDIO_TRAINING" ? exerciseEnum(ex.title) : null;
  return {
    type: "WorkoutStep",
    intensity: "INTERVAL",
    description: ex.title.slice(0, MAX_STEP_TEXT),
    durationType: byReps ? "REPS" : "TIME",
    durationValue: byReps ? ex.reps : (ex.duration_seconds || DEFAULT_EXERCISE_SECONDS),
    targetType: "OPEN",
    ...(enums ? { exerciseCategory: enums[0], exerciseName: enums[1] } : {}),
  };
}

function restStep(): Step {
  return {
    type: "WorkoutStep",
    intensity: "REST",
    description: "Rest",
    durationType: "TIME",
    durationValue: REST_SECONDS,
    targetType: "OPEN",
  };
}

function numberSteps(steps: Step[], next = { order: 1 }): Step[] {
  return steps.map(step => {
    const numbered: Step = { ...step, stepOrder: next.order++ };
    if (Array.isArray(step.steps)) numbered.steps = numberSteps(step.steps as Step[], next);
    return numbered;
  });
}

function countSteps(steps: Step[]): number {
  return steps.reduce((n, s) => n + 1 + (Array.isArray(s.steps) ? countSteps(s.steps as Step[]) : 0), 0);
}

export function mapWorkout(workout: HiitWorkout): MapResult {
  const sport = garminSport(inferCategory(workout));
  if (!sport || !workout.exercises.length) return { ok: false, reason: "unsupported" };

  const exercises = [...workout.exercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  if (sport === "LAP_SWIMMING") return mapSwim(workout, exercises);

  const steps: Step[] = [];
  exercises.forEach((ex, i) => {
    const sets = ex.sets ?? 1;
    if (sets > 1) {
      steps.push({
        type: "WorkoutRepeatStep",
        repeatType: "REPEAT_UNTIL_STEPS_CMPLT",
        repeatValue: sets,
        skipLastRestStep: true,
        steps: [exerciseStep(ex, sport), restStep()],
      });
    } else {
      steps.push(exerciseStep(ex, sport));
    }
    if (i < exercises.length - 1) steps.push(restStep());
  });

  // Never truncated: a shorter workout on the watch would be a different workout.
  if (countSteps(steps) > MAX_SINGLE_SPORT_STEPS) return { ok: false, reason: "too_long" };

  return {
    ok: true,
    workout: {
      workoutName: workout.title?.trim() || "HIIT workout",
      sport,
      workoutProvider: PROVIDER,
      workoutSourceId: PROVIDER,
      isSessionTransitionEnabled: false,
      segments: [{ segmentOrder: 1, sport, steps: numberSteps(steps) }],
    },
  };
}

export type Due = { id: string; date: string; hash: string };
export type Link = { id: string; hash: string | null; hasRow: boolean; date: string | null; garminWorkoutId: number | null };

// What to change at Garmin. A link whose row still exists in the past is left alone, because
// that workout has been and gone. A link beyond the window goes, and returns when it's due.
export function planSync(due: Due[], links: Link[], windowEnd: string) {
  const byId = new Map(links.map(l => [l.id, l]));
  const dueIds = new Set(due.map(d => d.id));

  const create = due.filter(d => !byId.has(d.id));
  const replace = due.filter(d => {
    const link = byId.get(d.id);
    return !!link && link.hash !== d.hash;
  });
  const remove = links.filter(l => {
    if (dueIds.has(l.id)) return false;
    if (!l.hasRow) return true;
    return !!l.date && l.date > windowEnd;
  });
  return { create, replace, remove };
}

export type OneOffPayload =
  | { kind: "sport"; sport: string; distance_m?: number | null }
  | { kind: "triathlon"; name?: string | null; swim_km: number; bike_km: number; run_km: number };

// Only sports Garmin's workout list has. Anything else starts on the watch and comes back on its own.
const SPORT_NAMES: Record<string, string> = {
  run: "RUNNING",
  running: "RUNNING",
  bike: "CYCLING",
  cycle: "CYCLING",
  cycling: "CYCLING",
  swim: "LAP_SWIMMING",
  swimming: "LAP_SWIMMING",
  strength: "STRENGTH_TRAINING",
  gym: "STRENGTH_TRAINING",
  yoga: "YOGA",
  pilates: "PILATES",
  hiit: "CARDIO_TRAINING",
  cardio: "CARDIO_TRAINING",
};

export function garminSportForName(name: string): string | null {
  return SPORT_NAMES[name.trim().toLowerCase()] ?? null;
}

function distanceStep(metres: number): Step {
  return {
    type: "WorkoutStep",
    intensity: "ACTIVE",
    durationType: "DISTANCE",
    durationValue: metres,
    durationValueType: "METER",
    targetType: "OPEN",
  };
}

export function mapOneOff(payload: OneOffPayload): MapResult {
  if (payload.kind === "triathlon") {
    const legs: [string, number][] = [
      ["LAP_SWIMMING", payload.swim_km],
      ["CYCLING", payload.bike_km],
      ["RUNNING", payload.run_km],
    ];
    if (legs.some(([, km]) => !(km > 0))) return { ok: false, reason: "needs_distance" };
    const next = { order: 1 };
    return {
      ok: true,
      workout: {
        workoutName: `${payload.name?.trim() || "Custom"} Triathlon`,
        sport: "MULTI_SPORT",
        workoutProvider: PROVIDER,
        workoutSourceId: PROVIDER,
        isSessionTransitionEnabled: true,
        poolLength: null,
        poolLengthUnit: null,
        segments: legs.map(([sport, km], i) => {
          const step = distanceStep(Math.round(km * 1000));
          return {
            segmentOrder: i + 1,
            sport,
            poolLength: null,
            poolLengthUnit: null,
            steps: numberSteps(
              [sport === "LAP_SWIMMING" ? { ...step, intensity: "MAIN", targetType: null, strokeType: "CHOICE" } : step],
              next,
            ),
          };
        }),
      },
    };
  }

  const sport = garminSportForName(payload.sport);
  if (!sport) return { ok: false, reason: "unsupported" };
  if (sport === "LAP_SWIMMING") {
    if (!payload.distance_m) return { ok: false, reason: "needs_distance" };
    return mapSwim({ title: "Swim", exercises: [] }, [{ title: "Swim", distance_m: payload.distance_m }]);
  }
  return {
    ok: true,
    workout: {
      workoutName: payload.sport.trim(),
      sport,
      workoutProvider: PROVIDER,
      workoutSourceId: PROVIDER,
      isSessionTransitionEnabled: false,
      segments: [{
        segmentOrder: 1,
        sport,
        steps: numberSteps([{ type: "WorkoutStep", intensity: "ACTIVE", durationType: "OPEN", targetType: "OPEN" }]),
      }],
    },
  };
}

const SPORT_ACTIVITY_TYPES: Record<string, string[]> = {
  RUNNING: ["running"],
  CYCLING: ["cycling"],
  LAP_SWIMMING: ["swimming"],
  STRENGTH_TRAINING: ["strength", "cross_training"],
  CARDIO_TRAINING: ["hiit", "cardio", "cross_training", "other"],
  YOGA: ["yoga"],
  PILATES: ["pilates"],
};

export type TickCandidate = { id: string; date: string; sport: string | null };

// A short accidental recording doesn't count. Earliest of the day first, so a day with
// two planned workouts ticks them in order as each comes back.
export function matchSentWorkout(
  activity: { activity_type: string; localDate: string; durationSeconds: number },
  candidates: TickCandidate[],
): string | null {
  if (activity.durationSeconds < 60) return null;
  const match = candidates.find(c =>
    c.date === activity.localDate && !!c.sport && (SPORT_ACTIVITY_TYPES[c.sport] ?? []).includes(activity.activity_type)
  );
  return match?.id ?? null;
}
