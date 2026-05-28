# Sub-task 5E: Workout schema for AI-generated workouts

**Type:** Database schema migration (three tables) + TypeScript type updates + completion snapshot logic
**Files affected:**
- `supabase/migrations/<timestamp>_ai_generated_workouts.sql` (new migration)
- TypeScript types (Supabase-generated types file — regenerate or hand-edit)
- `src/components/workout/WorkoutPlayer.tsx` (completion snapshot logic)
- Read patterns on Schedule and History views (handle both workout sources)
**Estimated effort:** A focused day. The migration is the careful part; the code changes are contained.
**Risk:** Highest of the refactor — schema migration on a live database. Requires the pre-implementation review cycle.
**Unblocks:** 5F (AI workout generation), the schedule mechanic, the Workout Planner in the Coach tab

---

## Why

Today, the only way to reference a workout is a foreign key to the `workouts` catalogue. AI-generated workouts don't exist in the catalogue — they're invented on the fly. So the schedule, the completion records, and the multi-day plans all need to hold a workout that has no catalogue row.

This mirrors a pattern the codebase already uses on the meal side: `user_meal_plan_items.meal_id` is nullable, and ad-hoc meals are stored inline (name + macros). The original schema author deliberately made workouts catalogue-only ("the LLM picks from what actually exists"), but that assumption is now changing — we're moving to AI-generated workouts.

5E makes the schema able to hold AI-generated workouts. 5F (next) does the actual generation.

---

## Decisions already made (do not re-open)

These were settled in planning. The spec implements them; don't relitigate:

1. **Inline fields on consumer tables** (Option B), matching the meal-side ad-hoc pattern. Not a separate ai_workouts table, not materialising into the catalogue.
2. **Three tables get the treatment:** `scheduled_workouts`, `workout_progress`, `user_workout_plan_items`.
3. **Full exercise snapshot on completion** for BOTH catalogue and AI workouts — so history is durable even if the catalogue changes.
4. **Both surfaces:** AI workouts work as single schedule entries AND in multi-day plans.
5. **FK orphaning handled:** change `workout_id` FKs from `ON DELETE CASCADE` to `ON DELETE SET NULL`, so deleting a catalogue workout doesn't wipe a user's history — the inline snapshot survives.

The one open item — **backfill of existing rows** — is addressed in this spec with a default; confirm before deploying.

---

## The new column set (each of the three tables)

Add these columns to `scheduled_workouts`, `workout_progress`, and `user_workout_plan_items`:

| Column | Type | Notes |
|---|---|---|
| `workout_source` | text | NOT NULL, DEFAULT 'catalogue'. Values: 'catalogue' \| 'ai_generated'. The discriminator. |
| `workout_title` | text | nullable. The workout name (for AI workouts; for catalogue, can mirror the catalogue title via snapshot). |
| `workout_description` | text | nullable. Short description. |
| `exercises_snapshot` | jsonb | nullable. Array of exercise objects (see shape below). |
| `estimated_duration_minutes` | integer | nullable. For AI workouts; catalogue workouts have this in the catalogue. |
| `estimated_calories` | integer | nullable. Same. |

### The exercises_snapshot JSONB shape

An array of objects matching the existing `workout_exercises` row shape so the rendering code can treat them uniformly:

```json
[
  {
    "name": "Goblet Squat",
    "description": "Hold a weight at chest height, squat to parallel",
    "duration_seconds": 45,
    "rest_seconds": 15,
    "sets": 3,
    "reps": 12,
    "exercise_order": 1
  },
  {
    "name": "Push-ups",
    "description": "Standard or knee push-ups",
    "duration_seconds": 30,
    "rest_seconds": 15,
    "sets": 3,
    "reps": null,
    "exercise_order": 2
  }
]
```

Fields nullable where they don't apply (reps null for timed exercises, etc.). The shape should match what `workout_exercises` rows expose so the UI renders both identically.

---

## Migration ordering — CRITICAL

The migration must run in this exact order. Out-of-order steps risk invalid states or bad table locks.

```sql
-- =============================================
-- Migration: AI-generated workout support
-- Adds inline workout content to scheduled_workouts,
-- workout_progress, and user_workout_plan_items so
-- workouts no longer must reference the catalogue.
-- Mirrors the existing meal-side ad-hoc pattern.
-- =============================================

BEGIN;

-- ---------- scheduled_workouts ----------

-- Step 1: Add new columns as nullable (existing rows unaffected)
ALTER TABLE scheduled_workouts
  ADD COLUMN workout_source text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN workout_title text,
  ADD COLUMN workout_description text,
  ADD COLUMN exercises_snapshot jsonb,
  ADD COLUMN estimated_duration_minutes integer,
  ADD COLUMN estimated_calories integer;

-- Step 2: (existing rows already got workout_source='catalogue' via DEFAULT)

-- Step 3: Change FK from CASCADE to SET NULL
ALTER TABLE scheduled_workouts
  DROP CONSTRAINT scheduled_workouts_workout_id_fkey,
  ADD CONSTRAINT scheduled_workouts_workout_id_fkey
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

-- Step 4: Drop NOT NULL on workout_id (AI workouts have no catalogue id)
ALTER TABLE scheduled_workouts
  ALTER COLUMN workout_id DROP NOT NULL;

-- Step 5: Add CHECK — must have either a catalogue ref OR inline content
ALTER TABLE scheduled_workouts
  ADD CONSTRAINT scheduled_workouts_source_check
    CHECK (
      (workout_source = 'catalogue' AND workout_id IS NOT NULL)
      OR
      (workout_source = 'ai_generated' AND workout_title IS NOT NULL AND exercises_snapshot IS NOT NULL)
    );

-- ---------- workout_progress ----------
-- (identical pattern)

ALTER TABLE workout_progress
  ADD COLUMN workout_source text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN workout_title text,
  ADD COLUMN workout_description text,
  ADD COLUMN exercises_snapshot jsonb,
  ADD COLUMN estimated_duration_minutes integer,
  ADD COLUMN estimated_calories integer;

ALTER TABLE workout_progress
  DROP CONSTRAINT workout_progress_workout_id_fkey,
  ADD CONSTRAINT workout_progress_workout_id_fkey
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

ALTER TABLE workout_progress
  ALTER COLUMN workout_id DROP NOT NULL;

ALTER TABLE workout_progress
  ADD CONSTRAINT workout_progress_source_check
    CHECK (
      (workout_source = 'catalogue' AND workout_id IS NOT NULL)
      OR
      (workout_source = 'ai_generated' AND workout_title IS NOT NULL AND exercises_snapshot IS NOT NULL)
    );

-- ---------- user_workout_plan_items ----------
-- (was FK RESTRICT, not CASCADE)

ALTER TABLE user_workout_plan_items
  ADD COLUMN workout_source text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN workout_title text,
  ADD COLUMN workout_description text,
  ADD COLUMN exercises_snapshot jsonb,
  ADD COLUMN estimated_duration_minutes integer,
  ADD COLUMN estimated_calories integer;

ALTER TABLE user_workout_plan_items
  DROP CONSTRAINT user_workout_plan_items_workout_id_fkey,
  ADD CONSTRAINT user_workout_plan_items_workout_id_fkey
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE SET NULL;

ALTER TABLE user_workout_plan_items
  ALTER COLUMN workout_id DROP NOT NULL;

ALTER TABLE user_workout_plan_items
  ADD CONSTRAINT user_workout_plan_items_source_check
    CHECK (
      (workout_source = 'catalogue' AND workout_id IS NOT NULL)
      OR
      (workout_source = 'ai_generated' AND workout_title IS NOT NULL AND exercises_snapshot IS NOT NULL)
    );

COMMIT;
```

**Verify the actual FK constraint names before running** — the names above (`scheduled_workouts_workout_id_fkey` etc.) are the Postgres default convention, but confirm against the live schema. Query:

```sql
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN ('scheduled_workouts', 'workout_progress', 'user_workout_plan_items');
```

Use the actual names returned. A wrong constraint name fails the migration.

---

## Backfill — DECISION NEEDED

The migration above leaves existing rows with `workout_source='catalogue'`, valid `workout_id`, and NULL inline fields. That's a valid state (the CHECK passes because catalogue rows only need workout_id).

The question: do we backfill `exercises_snapshot` for existing rows by joining to `workout_exercises`?

**Option A — Backfill now (recommended).** A one-off UPDATE that populates exercises_snapshot for existing catalogue rows from their current workout_exercises. Pro: every row has a snapshot, rendering code can rely on it. Con: a slightly bigger migration.

**Option B — Don't backfill.** Existing rows keep NULL snapshot; rendering falls back to the FK join for catalogue rows. Pro: simpler migration. Con: rendering code must handle "catalogue row without snapshot → join to catalogue" AND "AI row with snapshot → read inline" — two code paths.

**Recommendation: Option A** — there's little existing data (pre-launch), so the backfill is cheap, and it lets the rendering code have one path ("read exercises_snapshot") instead of two. But confirm with Vanessa, since she deferred this decision earlier.

If Option A, the backfill UPDATE (run after the columns exist, before declaring done):

```sql
-- Backfill exercises_snapshot for existing catalogue scheduled_workouts
UPDATE scheduled_workouts sw
SET exercises_snapshot = (
  SELECT jsonb_agg(jsonb_build_object(
    'name', we.name,
    'description', we.description,
    'duration_seconds', we.duration_seconds,
    'sets', we.sets,
    'reps', we.reps,
    'exercise_order', we.exercise_order
  ) ORDER BY we.exercise_order)
  FROM workout_exercises we
  WHERE we.workout_id = sw.workout_id
)
WHERE sw.workout_source = 'catalogue' AND sw.workout_id IS NOT NULL;
```

(Adjust column names to match the actual `workout_exercises` schema. Repeat for the other two tables if they hold completed/planned items worth snapshotting.)

---

## RLS policies

The existing RLS policies on all three tables are user-scoped (users can only touch their own rows). The new columns don't change the ownership model — they're just more columns on rows the user already owns. So existing RLS policies should cover them automatically.

**Verify:** confirm the RLS policies are column-agnostic (they typically gate on `user_id = auth.uid()`, not specific columns). If any policy enumerates columns explicitly, the new columns need adding. Most Supabase RLS is row-level not column-level, so this is likely a no-op — but check.

---

## TypeScript types

The Supabase-generated types file needs the new columns. Either:
- Regenerate via `supabase gen types typescript` (cleanest), or
- Hand-add the columns to the relevant Row/Insert/Update types

The new fields on each table's types:
```ts
workout_source: 'catalogue' | 'ai_generated';
workout_title: string | null;
workout_description: string | null;
exercises_snapshot: ExerciseSnapshot[] | null;
estimated_duration_minutes: number | null;
estimated_calories: number | null;
```

Define `ExerciseSnapshot` as a shared type matching the JSONB shape.

---

## Completion snapshot logic (WorkoutPlayer.tsx)

Per the decision: snapshot exercises on completion for BOTH catalogue and AI workouts.

In `WorkoutPlayer.tsx`'s `completeWorkout()` (around line 310 per the diagnostic), when inserting the `workout_progress` row:

**For catalogue workouts:** populate `exercises_snapshot` from the workout's current exercises (so the completion record captures what they actually did, even if the catalogue changes later).

**For AI workouts:** the `exercises_snapshot` comes from the scheduled_workout that was being performed — carry it through.

```tsx
// On completion, build the snapshot
const snapshot = workout.exercises.map(ex => ({
  name: ex.name,
  description: ex.description,
  duration_seconds: ex.duration_seconds,
  sets: ex.sets,
  reps: ex.reps,
  exercise_order: ex.exercise_order,
}));

await supabase.from('workout_progress').insert({
  user_id: user.id,
  workout_id: workout.source === 'ai_generated' ? null : workout.id,
  workout_source: workout.source ?? 'catalogue',
  workout_title: workout.title,
  workout_description: workout.description,
  exercises_snapshot: snapshot,
  estimated_duration_minutes: workout.duration_minutes,
  estimated_calories: workout.calories,
  duration_seconds: totalElapsed,
});
```

Adjust to match the actual workout object shape in WorkoutPlayer.

---

## Read patterns (Schedule & History views)

Wherever the Schedule or History views render a workout, they currently join to the `workouts` catalogue via `workout_id`. After 5E, they should:

- If `workout_source === 'catalogue'`: behaviour unchanged (or read from snapshot if backfilled)
- If `workout_source === 'ai_generated'`: read `workout_title`, `workout_description`, `exercises_snapshot` directly

If Option A backfill is done, the cleanest approach is: **always read from the inline fields** (snapshot, title, etc.), regardless of source. The FK becomes just a link back to the catalogue for "view original" purposes, not the primary content source. This is the simplest rendering code — one path.

Flag any view that breaks when `workout_id` is null — those are the spots that assumed a catalogue join always works.

---

## Out of scope

- The actual AI generation of workouts (that's 5F)
- Rewriting generate-workout-plan (5F)
- Any change to the workouts catalogue table itself
- Removing the catalogue (it stays; AI workouts coexist with it)
- The Workout Planner guided flow UI (6D)
- Touching the meal-side tables (they already have their ad-hoc pattern)
- Changing how completed workouts are scored/rated

---

## Acceptance criteria

1. Migration runs cleanly on the live database with no errors.
2. All three tables have the six new columns.
3. Existing rows are unaffected — `workout_source='catalogue'`, valid workout_id, queries still work.
4. The FK on all three is now `ON DELETE SET NULL` (verify: delete a test catalogue workout, confirm referencing rows survive with workout_id nulled and snapshot intact — only if backfill done).
5. The CHECK constraint rejects invalid rows (test: try inserting a row with source='ai_generated' but no title — should fail).
6. A row with `workout_source='ai_generated'`, null workout_id, populated title + exercises_snapshot inserts successfully.
7. TypeScript types updated; no type errors.
8. WorkoutPlayer snapshots exercises on completion for catalogue workouts (verify: complete a workout, check workout_progress row has exercises_snapshot populated).
9. Schedule and History views render existing catalogue workouts correctly (no regression).
10. RLS still enforces user-scoping on all three tables.

---

## Verification (real device + SQL)

### Migration verification (SQL, before app testing)
- [ ] Run the migration. No errors.
- [ ] `\d scheduled_workouts` (or equivalent) shows the new columns.
- [ ] Insert a test AI-workout row manually via SQL — succeeds.
- [ ] Insert an invalid row (ai_generated, no title) — fails with CHECK violation.
- [ ] If backfill done: existing rows have exercises_snapshot populated.

### App verification (real device, Vanessa's account)
- [ ] Open the Schedule. Existing catalogue workouts (if any) render correctly.
- [ ] Complete a catalogue workout via WorkoutPlayer. Check workout_progress: exercises_snapshot populated.
- [ ] History view shows the completed workout correctly.

(Note: full AI-workout flow can't be tested until 5F generates them. 5E's verification is "schema works, catalogue path doesn't regress, manual AI-row insert succeeds".)

---

## Reporting back

1. Migration ran cleanly — confirm.
2. The actual FK constraint names found (vs the assumed defaults).
3. Backfill: which option chosen, and if A, how many rows backfilled.
4. RLS check result — were policies column-agnostic, or did they need updating?
5. TypeScript regeneration vs hand-edit — which, and clean?
6. WorkoutPlayer snapshot logic — confirmed working on a real completion.
7. Any view that broke on null workout_id — list them.
8. This is a DB migration — does it need an app rebuild, or is it backend-only? (The schema change is backend; the WorkoutPlayer + types changes need an app build. Confirm the split.)

---

## Rollback

Schema migrations are harder to roll back than code. Before running on the live DB:

1. **Confirm Supabase has a recent backup / point-in-time recovery available.** This is the safety net.
2. The migration is additive (new columns, relaxed constraints) — it doesn't drop data. Rollback would be: drop the new columns, restore the NOT NULL, restore the CASCADE FK. But relaxing-then-re-tightening NOT NULL fails if any AI-workout rows exist by then.
3. Practically: once AI workouts exist in these tables, rollback means data loss for those rows. So the point of no return is "first AI workout written" (which is 5F, not 5E). 5E alone is safely reversible.

---

## Notes for the implementer

1. **This is a live-DB migration — the most careful work in the refactor.** Verify constraint names, confirm a backup exists, run inside a transaction (the BEGIN/COMMIT is there for a reason — if any step fails, the whole thing rolls back).
2. **Confirm the backfill decision with Vanessa before running** — the spec recommends Option A but it was a deferred decision.
3. **Match the exercises_snapshot shape to the real workout_exercises columns.** The shape in this spec is illustrative — read the actual table and mirror its columns.
4. **The CHECK constraint is the data-integrity guardrail.** It enforces "either catalogue ref or inline content, never neither". Don't skip it — it's what prevents the invalid-state bug the migration ordering is designed to avoid.
5. **Pre-implementation review:** given the risk, confirm your migration plan with Vanessa before running it on the live database. Specifically: the constraint names you found, the backfill approach, and that a backup exists.
6. **Don't touch 5F territory** — no AI generation, no generate-workout-plan rewrite. 5E is purely the schema foundation.
