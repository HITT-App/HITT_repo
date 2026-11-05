// HIIT workout → Training API V2. Only names and steps go to Garmin, which may reuse whatever
// it receives with no duty to remove it. Exercise and workout descriptions stay here.

export type HiitExercise = {
  title: string;
  duration_seconds?: number | null;
  sets?: number | null;
  reps?: number | null;
  order_index?: number | null;
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
  isSessionTransitionEnabled: false;
  segments: { segmentOrder: 1; sport: string; steps: Step[] }[];
};

export type MapResult =
  | { ok: true; workout: GarminWorkout }
  | { ok: false; reason: "too_long" | "unsupported" };

const PROVIDER = "HIIT Fitness";
const MAX_SINGLE_SPORT_STEPS = 100;
const MAX_STEP_TEXT = 512;
// Matches the rest used by HIIT's own workout player.
const REST_SECONDS = 30;
const DEFAULT_EXERCISE_SECONDS = 45;

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
  if (c.includes("swim")) return null; // Garmin needs pool lengths and distances HIIT doesn't hold
  if (c.includes("triathlon") || c.includes("multi")) return null;
  if (c.includes("strength")) return "STRENGTH_TRAINING";
  if (c.includes("yoga")) return "YOGA";
  if (c.includes("pilates")) return "PILATES";
  if (c.includes("run")) return "RUNNING";
  if (c.includes("cycl") || c.includes("bik")) return "CYCLING";
  // Garmin's list has no HIIT sport value. Asked in the email to Garmin.
  return "CARDIO_TRAINING";
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
  const sport = garminSport(workout.category);
  if (!sport || !workout.exercises.length) return { ok: false, reason: "unsupported" };

  const exercises = [...workout.exercises].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
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
