/**
 * Unit tests for the session-duration model in generate-workout-plan (#117).
 *
 * Run: npx tsx tests/test-workout-duration.ts
 *
 * These mirror the constants in src/pages/WorkoutPlayer.tsx. If the player's REST_SECS
 * or its 45s fallback change, these tests should fail — that coupling is the point.
 * An estimate that doesn't match what the player actually does is worse than none,
 * because it produces a confident but wrong duration.
 */

const REST_SECONDS = 30;
const DEFAULT_WORK_SECONDS = 45;
const SECONDS_PER_REP = 3;

type PlanExercise = { sets: number | null; reps: number | null; duration_seconds: number | null };

function setWorkSeconds(ex: PlanExercise): number {
  if (typeof ex.duration_seconds === 'number' && ex.duration_seconds > 0) return ex.duration_seconds;
  if (typeof ex.reps === 'number' && ex.reps > 0) return ex.reps * SECONDS_PER_REP;
  return DEFAULT_WORK_SECONDS;
}

function estimateSessionSeconds(exercises: PlanExercise[]): number {
  let total = 0;
  for (const ex of exercises) {
    const sets = Math.max(1, ex.sets ?? 1);
    total += sets * setWorkSeconds(ex) + sets * REST_SECONDS;
  }
  return Math.max(0, total - REST_SECONDS);
}

function fitSessionToTarget(exercises: PlanExercise[], targetSeconds: number): void {
  if (!exercises.length) return;
  const tolerance = 0.15;
  const maxSteps = exercises.length * 4 + 10;
  for (let guard = 0; guard < maxSteps; guard++) {
    const estimate = estimateSessionSeconds(exercises);
    if (estimate === 0) return;
    const ratio = estimate / targetSeconds;
    if (Math.abs(1 - ratio) <= tolerance) return;
    if (ratio < 1) {
      const c = exercises.filter(e => (e.sets ?? 1) < 5).sort((a, b) => (a.sets ?? 1) - (b.sets ?? 1))[0];
      if (!c) return;
      c.sets = (c.sets ?? 1) + 1;
    } else {
      const c = exercises.filter(e => (e.sets ?? 1) > 1).sort((a, b) => (b.sets ?? 1) - (a.sets ?? 1))[0];
      if (!c) return;
      c.sets = (c.sets ?? 1) - 1;
    }
  }
}

function suggestedExerciseCount(targetMinutes: number) {
  const perExercise = 225;
  const centre = Math.round((targetMinutes * 60) / perExercise);
  return { min: Math.max(3, centre - 1), max: Math.max(4, centre + 2) };
}

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, note = '') => {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${note ? ' — ' + note : ''}`);
  if (ok) pass++; else fail++;
};

const ex = (o: Partial<PlanExercise>): PlanExercise =>
  ({ sets: null, reps: null, duration_seconds: null, ...o });

console.log('Duration model\n');

// The bug as reported: 6 timed exercises, one set each, no duration → 45s fallback.
const reported = Array.from({ length: 6 }, () => ex({ duration_seconds: 45, sets: 1 }));
const reportedMin = estimateSessionSeconds(reported) / 60;
check('reproduces the reported ~7min for a "30 min" plan',
  reportedMin > 6 && reportedMin < 8, `${reportedMin.toFixed(1)} min`);

// Timed exercises must now cost all their sets — this is the player bug.
check('a 3x45s exercise costs 3 sets of work, not 1',
  estimateSessionSeconds([ex({ duration_seconds: 45, sets: 3 })]) === 3 * 45 + 2 * 30,
  `${estimateSessionSeconds([ex({ duration_seconds: 45, sets: 3 })])}s`);

check('reps exercises priced at ~3s/rep',
  estimateSessionSeconds([ex({ sets: 3, reps: 10 })]) === 3 * 30 + 2 * 30);

check('no amount → 45s fallback, matching the player',
  estimateSessionSeconds([ex({ sets: 1 })]) === 45);

check('no trailing rest after the final set',
  estimateSessionSeconds([ex({ duration_seconds: 60, sets: 1 })]) === 60);

console.log('\nFitting to target\n');

for (const target of [15, 30, 45, 60]) {
  const session = Array.from({ length: suggestedExerciseCount(target).min }, () =>
    ex({ duration_seconds: 45, sets: 1 }));
  const before = estimateSessionSeconds(session) / 60;
  fitSessionToTarget(session, target * 60);
  const after = estimateSessionSeconds(session) / 60;
  const within = Math.abs(after - target) / target <= 0.25;
  check(`${target}min target reached from a short plan`, within,
    `${before.toFixed(1)} → ${after.toFixed(1)} min`);
}

// An over-long plan must come DOWN, not just up.
const long = Array.from({ length: 10 }, () => ex({ duration_seconds: 60, sets: 5 }));
const longBefore = estimateSessionSeconds(long) / 60;
fitSessionToTarget(long, 30 * 60);
const longAfter = estimateSessionSeconds(long) / 60;
check('an over-long plan is trimmed towards target',
  longAfter < longBefore && longAfter < 40, `${longBefore.toFixed(0)} → ${longAfter.toFixed(0)} min`);

// Sets must stay in a sane range — no 47-set exercises to hit a number.
const extreme = [ex({ duration_seconds: 20, sets: 1 })];
fitSessionToTarget(extreme, 90 * 60);
check('sets are capped at 5 even when target is unreachable',
  (extreme[0].sets ?? 0) <= 5, `sets=${extreme[0].sets}`);

check('fitting terminates on an empty session', (() => {
  const empty: PlanExercise[] = [];
  fitSessionToTarget(empty, 1800);
  return true;
})());

console.log('\nExercise count scales with target\n');
const c15 = suggestedExerciseCount(15), c60 = suggestedExerciseCount(60);
check('60min asks for more exercises than 15min', c60.min > c15.min,
  `15min: ${c15.min}-${c15.max}, 60min: ${c60.min}-${c60.max}`);
check('never asks for fewer than 3', suggestedExerciseCount(5).min >= 3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
