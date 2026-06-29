# TAPI-04 — HITT → Garmin Training API workout schema mapping

**Status:** Design draft (pre-sandbox)
**Date:** 2026-06-29
**Author:** Jeffrey/Claude
**Depends on:** TAPI-01 approval for sandbox confirmation of TBC items
**Implements:** the schema-translation logic that `garmin-push-workout` (TAPI-03) will call

This is a complete deterministic mapping from HITT's workout data model into the JSON payload that Garmin's Training API accepts. Designed before sandbox credentials arrive so the implementation can land immediately once they do.

---

## 1. The two sides at a glance

**HITT side** — exercise-centric, free-text fields, JSONB:

```ts
// scheduled_workouts.exercises_snapshot
type ExerciseSnapshot = {
  title: string
  description: string | null
  duration_seconds: number | null    // OR sets+reps, never both
  sets: number | null
  reps: number | null
  order_index: number
  body_area: string | null
  thumbnail_url: string | null
  video_url: string | null
}
```

Plus `scheduled_workouts.workout_title`, `workout_description`, `workout_source` ('catalogue' | 'ai_generated'), and the parent `workouts.category` ('hiit' | 'cardio' | 'strength' | 'flexibility') / `met_value`.

For triathlon, the source is the `TriathlonPlan` shape used by the Watch:

```ts
type TriathlonLeg = { type: "swim" | "bike" | "run"; targetKm: number }
type TriathlonPlan = { name: string; legs: TriathlonLeg[] }
```

**Garmin side** — segment/step-centric, enumerated fields, JSON:

```json
{
  "workoutName": "...",
  "description": "...",
  "sportType": { "sportTypeId": <id>, "sportTypeKey": "..." },
  "workoutSegments": [
    {
      "segmentOrder": 1,
      "sportType": { ... },
      "workoutSteps": [
        { "type": "ExecutableStepDTO", ... },
        { "type": "RepeatGroupDTO", ... }
      ]
    }
  ]
}
```

Steps are either `ExecutableStepDTO` (a thing to do) or `RepeatGroupDTO` (a container that loops nested steps N times).

---

## 2. Sport type mapping

HITT stores sport as `workouts.category` and/or `workouts.workout_type`. Map to Garmin `sportType`:

| HITT input | Garmin `sportTypeId` | `sportTypeKey` | Note |
|---|---|---|---|
| `category = 'hiit'` | 5 | `cardio_training` | HIIT lives under cardio in Garmin's taxonomy |
| `category = 'cardio'` + activity = running | 1 | `running` | |
| `category = 'cardio'` + activity = cycling | 2 | `cycling` | |
| `category = 'cardio'` + activity = swimming (pool) | 6 | `lap_swimming` | |
| `category = 'cardio'` + activity = swimming (open water) | TBC | `open_water_swimming` | id needs confirming under sandbox |
| `category = 'strength'` | 4 | `strength_training` | |
| `category = 'flexibility'` | 7 | `yoga` | Closest match; Garmin has no "flexibility" category |
| TriathlonLeg.type = "swim" | 6 | `lap_swimming` | Triathlon ships as three separate workouts (see §7) |
| TriathlonLeg.type = "bike" | 2 | `cycling` | |
| TriathlonLeg.type = "run" | 1 | `running` | |
| anything else | 5 | `cardio_training` | Fall-back. Garmin won't reject it. |

**Implementation:** a `sportFromHittWorkout(w: WorkoutRow): { sportTypeId, sportTypeKey }` helper. Pure function, unit-testable.

---

## 3. Step duration / target mapping

The hardest part of the mapping. HITT's exercises are loosely described; Garmin demands explicit `endCondition` + optional `targetType`.

### 3.1 Exercise has `duration_seconds`

Map to a single time-bounded step:

```json
{
  "type": "ExecutableStepDTO",
  "stepOrder": <n>,
  "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
  "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
  "endConditionValue": <duration_seconds>,
  "targetType": { "workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target" }
}
```

If a downstream HR-zone target ever lands in HITT's schema, swap `targetType` to `heart.rate.zone` and populate `targetValueOne`. For now we send `no.target` because HITT doesn't store HR/pace/power per exercise.

### 3.2 Exercise has `sets` + `reps` (strength)

Garmin's strength workout step uses `endCondition: "reps"` (id 8 — TBC under sandbox; community libs report id 8 for reps but Garmin's docs aren't public). For a 3 × 10 burpees workout:

```json
{
  "type": "RepeatGroupDTO",
  "stepOrder": <n>,
  "stepType": { "stepTypeId": 6, "stepTypeKey": "repeat" },
  "numberOfIterations": 3,
  "workoutSteps": [
    {
      "type": "ExecutableStepDTO",
      "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
      "endCondition": { "conditionTypeId": 8, "conditionTypeKey": "reps" },
      "endConditionValue": 10,
      "stepName": "Burpees"
    },
    {
      "type": "ExecutableStepDTO",
      "stepType": { "stepTypeId": 5, "stepTypeKey": "rest" },
      "endCondition": { "conditionTypeId": 1, "conditionTypeKey": "lap.button" }
    }
  ]
}
```

The trailing `rest` step uses `lap.button` (manual end) because HITT doesn't model rest duration. User taps the lap button on the watch to advance — same UX as Garmin's own strength templates.

### 3.3 Exercise has neither (open-ended)

Default to a 60-second time step. Rare case — only happens if the AI-generated workout failed to populate both `duration_seconds` AND `sets`.

---

## 4. Worked example: a HIIT workout

**HITT input** (the seed "HIIT Cardio Burn" workout):

```json
{
  "workout_title": "HIIT Cardio Burn",
  "workout_description": "30-minute high-intensity blast",
  "category": "hiit",
  "exercises_snapshot": [
    { "title": "Jumping Jacks", "duration_seconds": 45, "order_index": 0 },
    { "title": "Burpees",       "duration_seconds": 30, "order_index": 1 },
    { "title": "Mountain Climbers", "duration_seconds": 45, "order_index": 2 },
    { "title": "High Knees",    "duration_seconds": 30, "order_index": 3 }
  ]
}
```

**Garmin output:**

```json
{
  "workoutName": "HIIT Cardio Burn",
  "description": "30-minute high-intensity blast",
  "sportType": { "sportTypeId": 5, "sportTypeKey": "cardio_training" },
  "workoutSegments": [
    {
      "segmentOrder": 1,
      "sportType": { "sportTypeId": 5, "sportTypeKey": "cardio_training" },
      "workoutSteps": [
        {
          "type": "ExecutableStepDTO", "stepOrder": 1,
          "stepType": { "stepTypeId": 1, "stepTypeKey": "warmup" },
          "endCondition": { "conditionTypeId": 1, "conditionTypeKey": "lap.button" },
          "stepName": "Warm up — light cardio"
        },
        {
          "type": "ExecutableStepDTO", "stepOrder": 2,
          "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
          "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
          "endConditionValue": 45, "stepName": "Jumping Jacks"
        },
        {
          "type": "ExecutableStepDTO", "stepOrder": 3,
          "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
          "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
          "endConditionValue": 30, "stepName": "Burpees"
        },
        {
          "type": "ExecutableStepDTO", "stepOrder": 4,
          "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
          "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
          "endConditionValue": 45, "stepName": "Mountain Climbers"
        },
        {
          "type": "ExecutableStepDTO", "stepOrder": 5,
          "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
          "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
          "endConditionValue": 30, "stepName": "High Knees"
        },
        {
          "type": "ExecutableStepDTO", "stepOrder": 6,
          "stepType": { "stepTypeId": 2, "stepTypeKey": "cooldown" },
          "endCondition": { "conditionTypeId": 1, "conditionTypeKey": "lap.button" },
          "stepName": "Cool down — stretch"
        }
      ]
    }
  ]
}
```

We auto-insert a `warmup` step (manual lap) and a `cooldown` step at the ends. Garmin's UX shows these explicitly on the watch.

---

## 5. Worked example: a tabata block (with repeats)

**HITT input** — same shape; an AI-generated workout might emit a tabata-style block where exercises are flagged with repetition metadata. Today HITT doesn't formally encode "do this exercise 8 times" — but a common output pattern is the same exercise repeated in `exercises_snapshot` 8 times. The mapper should detect runs of identical exercises and collapse them into a `RepeatGroupDTO`:

```json
{
  "type": "RepeatGroupDTO",
  "stepType": { "stepTypeId": 6, "stepTypeKey": "repeat" },
  "numberOfIterations": 8,
  "workoutSteps": [
    {
      "type": "ExecutableStepDTO",
      "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
      "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
      "endConditionValue": 20,
      "stepName": "Burpees — hard"
    },
    {
      "type": "ExecutableStepDTO",
      "stepType": { "stepTypeId": 4, "stepTypeKey": "recovery" },
      "endCondition": { "conditionTypeId": 2, "conditionTypeKey": "time" },
      "endConditionValue": 10
    }
  ]
}
```

**Implementation:** detect "≥4 consecutive identical exercises" → fold into a repeat group. Below that threshold, emit as separate steps.

---

## 6. Worked example: a strength workout (sets × reps)

**HITT input:**

```json
{
  "workout_title": "Upper Body Strength",
  "category": "strength",
  "exercises_snapshot": [
    { "title": "Push-ups", "sets": 3, "reps": 12, "order_index": 0 },
    { "title": "Pull-ups", "sets": 3, "reps": 8,  "order_index": 1 }
  ]
}
```

**Garmin output** (each exercise wrapped in a `RepeatGroupDTO`):

```json
{
  "workoutName": "Upper Body Strength",
  "sportType": { "sportTypeId": 4, "sportTypeKey": "strength_training" },
  "workoutSegments": [
    {
      "segmentOrder": 1,
      "sportType": { "sportTypeId": 4, "sportTypeKey": "strength_training" },
      "workoutSteps": [
        {
          "type": "RepeatGroupDTO", "stepOrder": 1,
          "stepType": { "stepTypeId": 6, "stepTypeKey": "repeat" },
          "numberOfIterations": 3,
          "workoutSteps": [
            {
              "type": "ExecutableStepDTO",
              "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
              "endCondition": { "conditionTypeId": 8, "conditionTypeKey": "reps" },
              "endConditionValue": 12,
              "stepName": "Push-ups"
            },
            {
              "type": "ExecutableStepDTO",
              "stepType": { "stepTypeId": 5, "stepTypeKey": "rest" },
              "endCondition": { "conditionTypeId": 1, "conditionTypeKey": "lap.button" }
            }
          ]
        },
        {
          "type": "RepeatGroupDTO", "stepOrder": 2,
          "stepType": { "stepTypeId": 6, "stepTypeKey": "repeat" },
          "numberOfIterations": 3,
          "workoutSteps": [
            {
              "type": "ExecutableStepDTO",
              "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
              "endCondition": { "conditionTypeId": 8, "conditionTypeKey": "reps" },
              "endConditionValue": 8,
              "stepName": "Pull-ups"
            },
            {
              "type": "ExecutableStepDTO",
              "stepType": { "stepTypeId": 5, "stepTypeKey": "rest" },
              "endCondition": { "conditionTypeId": 1, "conditionTypeKey": "lap.button" }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 7. Triathlon — three workouts, scheduled together

The Training API does **not** accept a single multi-sport workout (confirmed via community libs and Tredict). The mapping pushes three independent workouts to the same calendar date, named to make their grouping obvious.

**HITT input:**

```json
{
  "name": "Olympic Triathlon",
  "legs": [
    { "type": "swim", "targetKm": 1.5 },
    { "type": "bike", "targetKm": 40 },
    { "type": "run",  "targetKm": 10 }
  ]
}
```

**Garmin output — three separate workouts, all scheduled on race day:**

```json
// Workout 1 — Swim leg
{
  "workoutName": "Olympic Triathlon — 1. Swim 1.5 km",
  "sportType": { "sportTypeId": 6, "sportTypeKey": "lap_swimming" },
  "workoutSegments": [{
    "segmentOrder": 1,
    "sportType": { "sportTypeId": 6, "sportTypeKey": "lap_swimming" },
    "workoutSteps": [
      {
        "type": "ExecutableStepDTO", "stepOrder": 1,
        "stepType": { "stepTypeId": 3, "stepTypeKey": "interval" },
        "endCondition": { "conditionTypeId": 3, "conditionTypeKey": "distance" },
        "endConditionValue": 1500,
        "stepName": "Swim 1.5 km"
      }
    ]
  }]
}

// Workout 2 — Bike leg (same structure, sportTypeId=2, targetKm=40 → endConditionValue=40000)
// Workout 3 — Run leg  (same structure, sportTypeId=1, targetKm=10 → endConditionValue=10000)
```

Each gets POSTed individually, then each is calendar-scheduled to race day via the `schedule` endpoint. They appear as three workouts on the Garmin Connect calendar — the user picks them in sequence on race day.

A future iteration can also push transition prompts as a `note` on the calendar day.

---

## 8. Graceful degradation table

Fields HITT has but Garmin doesn't accept, or vice versa.

| HITT field | Target behaviour | Why |
|---|---|---|
| `exercise.description` | Append to `stepName` if short, else drop. Garmin's `stepName` has a length cap (~50 chars, TBC). | Per-step descriptions aren't a first-class field in Training API |
| `exercise.body_area` | Drop | Not in Garmin's schema; users see this only inside HITT |
| `exercise.thumbnail_url`, `video_url` | Drop | Garmin watches can't render images mid-workout from a Training API push |
| `workouts.calories_burned` (target) | Map to step-level `endCondition: calories` only when explicitly requested | Not all sports support calorie-based step ends |
| `workouts.met_value` | Drop | Used internally by HITT for calorie estimation, no Garmin equivalent |
| `workouts.equipment[]` | Append summary into top-level `description` ("Equipment: dumbbells, mat") | Garmin doesn't enumerate equipment |
| `workouts.difficulty` | Append to `description` ("Difficulty: intermediate") | No first-class field |
| `workouts.instructor_name`, `instructor_avatar` | Drop | Not relevant on watch |
| Triathlon transitions (T1, T2) | Not pushed in v1 | Training API has no multi-sport wrapper. Revisit if Garmin extends |
| Heart rate zones | Not pushed in v1 | HITT doesn't currently store HR zones per exercise |
| Pace targets | Not pushed in v1 | Same — not stored in `exercises_snapshot` |

When users add HR-zone or pace targeting to HITT later, the mapper extends without breaking back-compat. The Garmin-side fields (`targetType`, `targetValueOne/Two`) are already plumbed in §3.

---

## 9. Calendar scheduling

After creating a workout, schedule it via:

```
POST /training-api/schedule           # path TBC under sandbox
{
  "workoutId": <id from create response>,
  "userId":    <Garmin user ID>,
  "date":      "2026-07-04"            // YYYY-MM-DD, user's local date
}
```

`date` is the user's local calendar date — we resolve user-local time using their `profiles.timezone` field (or default `Europe/London`). The cron job in TAPI-07 fires at 18:00 user-local to schedule tomorrow's workout.

---

## 10. Implementation sketch (TAPI-03 will own this)

A single pure function in `_shared/garmin-mapping.ts`:

```ts
export function hittToGarminWorkout(input: {
  scheduledWorkout: ScheduledWorkoutRow
  workout: WorkoutRow | null   // null for AI-generated; falls back to scheduled fields
}): GarminWorkoutPayload {
  // ... pure, deterministic, unit-tested
}

export function hittTriathlonToGarminWorkouts(plan: TriathlonPlan, raceName: string)
  : GarminWorkoutPayload[]   // returns 3 payloads
```

Three unit-test fixture sets:
1. The 4 seed HIIT workouts (verify they map identically and the JSON is stable across runs)
2. A sample AI-generated workout (verify `workout_source = 'ai_generated'` path uses scheduled-row fields, not the FK)
3. Each triathlon distance preset (Sprint, Olympic, Long Course)

`garmin-push-workout` (TAPI-03) calls these, POSTs to Garmin, logs success/failure to `garmin_sync_log`.

---

## 11. TBCs to confirm under sandbox

When Garmin sandbox credentials land, verify with a single test workout:

1. `reps` endCondition is id `8` (community-reported, not in public docs)
2. `lap_swimming` vs `open_water_swimming` IDs
3. Calendar schedule endpoint path and exact body shape
4. Whether duplicate workout names on the same date are allowed (triathlon legs share a prefix)
5. Step-name character limit
6. Whether nested `RepeatGroupDTO`s (a tabata block inside a circuit-of-three) work or need flattening

These are all small, easy to clarify with one or two test POSTs. None block the schema design.

---

## 12. What's ready for code

When TAPI-01 unblocks:
- §10's `hittToGarminWorkout()` function — write directly from this spec; unit tests against §4, §5, §6, §7 fixtures
- TAPI-03 wraps it with the HTTP call, signature, and `garmin_sync_log` row
- TAPI-07 cron calls `garmin-push-workout` for tomorrow's workouts at 18:00 user-local

Estimated implementation time once sandbox lands: ~3 agent-days for TAPI-03 + 0.5 day to verify TBCs.
