# Recovery Day — Epic Scope

**Status:** Scoping (2026-07-04)
**Estimated size:** Medium — 1–2 days of focused work
**Owner decision needed on:** the reminder-copy question in §7 before implementation starts.

---

## Why we're doing this

Right now the app models today as one of two states — **workout day** (a `scheduled_workouts` row exists) or **rest day** (no row). But high-intensity training benefits from a third state: **recovery day** — light active recovery (mobility, walking, foam-rolling), not passive rest and not a full workout.

Three concrete signals it's needed:

1. The Watch app *already* has a three-way enum `WatchDayType { open, recovery, rest }` (`WatchSessionManager.swift:41`), and `TodayView` already renders three visual variants — the iPhone just doesn't tell it which day it is (surfaced by audit CA-49).
2. The workout library already lists `Recovery` as a filter category (`WorkoutLibrary.tsx:45`) — content exists, discovery works, but there's no scheduling flow for it.
3. Users on 3-day/week plans currently get "Rest day" copy on their light-mobility days, which reads wrong.

---

## What we're not doing

- No new schema table.
- No Jarvis rewrite. Jarvis already reasons about workout categories; recovery is just another category value.
- No changes to the reminder cron model established in migration `20260703200000_workout_reminder_daily_not_timed.sql` — the same morning + evening reminder applies, only the copy varies.

---

## Model

The cleanest fit for the existing code:

> **A recovery day is a `scheduled_workouts` row pointing at a workout whose `category = 'recovery'`.**
> **A rest day is the absence of any row for that date.**
> **A workout day is any other `scheduled_workouts` row.**

No new columns. No new table. `dayType` is a derived value, computed anywhere we need it:

```ts
async function computeDayType(userId, date): Promise<'workout' | 'recovery' | 'rest'> {
  const { data } = await supabase
    .from('scheduled_workouts')
    .select('workout_id, workouts!inner(category)')
    .eq('user_id', userId)
    .eq('scheduled_date', date)
    .maybeSingle()
  if (!data) return 'rest'
  return data.workouts.category === 'recovery' ? 'recovery' : 'workout'
}
```

(The Watch enum uses `open` for what the iPhone side would call `workout` — mapping is 1:1 with a rename at the WCSession boundary.)

---

## Work items

### 1. Content — seed the recovery workouts
- Confirm we have at least 3–4 workouts with `category = 'recovery'` in the `workouts` library. Suggested seeds: 10-min mobility flow, foam-rolling routine, 20-min walk, gentle yoga.
- If missing: seed via a data migration.

### 2. Schedule UI — recovery is a first-class option
Files: `src/pages/WorkoutDetail.tsx`, `src/pages/WorkoutSchedule.tsx`, `src/hooks/useOnboardingPlan.ts`.
- The onboarding plan generator should distribute recovery days into 6–7 day/week plans (currently it only schedules workout + rest).
- The schedule list should show a distinct visual for recovery days (colour, icon) — mirror how rest days already differ from workouts.
- Users can manually schedule a recovery workout from the library the same way they schedule any workout — no separate flow needed.

### 3. `usePlanStatus` hook — return today's dayType
Files: `src/hooks/usePlanStatus.ts`, plus consumers on Home and Jarvis.
- Extend the hook's return shape to include `todayDayType: 'workout' | 'recovery' | 'rest' | null`.
- Home cards and Jarvis prompts can then vary copy on it (e.g. Jarvis wouldn't push a hard workout on a recovery day).

### 4. WCSession → Watch dayType send
Files: `ios/App/App/WatchBridge.swift`, `ios/App/App/WatchPlugin.swift`, `src/plugins/WatchPlugin.ts`.
- Add `sendTodayDayType(_ type: String)` to `WatchBridge` — routes through the existing `sendRawMessage` path (`dayType` is already in the `stateKeys` array at line 65, so `updateApplicationContext` mirroring is already wired).
- Wrap in `WatchPlugin.swift`; export `sendTodayDayTypeToWatch(dayType)` from the TS plugin.
- Call from React on: schedule mount, app foreground, and after any `scheduled_workouts` mutation (create/delete/update). Day-rollover we take on the next foreground — no cron on the phone.
- Map: `workout → 'open'` (matches WatchDayType enum), `recovery → 'recovery'`, `rest → 'rest'`.

Closes audit CA-49.

### 5. Reminder cron — copy variants for recovery days
File: `supabase/migrations/YYYYMMDD_recovery_day_reminder_copy.sql`.
- The current morning/evening cron (`fire_workout_reminder_morning`, `fire_workout_reminder_evening`) reads `workouts.title` and composes copy. Add a branch on `workouts.category = 'recovery'` that uses softer copy:
  - Morning: "Recovery day today — take it easy. {title} if you feel like moving."
  - Evening: "Recovery day nudge — {title} if you haven't already. No pressure."
- Evening still skips if `workout_progress` shows a completion for that user × local day.

### 6. Onboarding + plan-generator prompt
File: `supabase/functions/generate-workout-plan/index.ts`.
- Extend the AI system prompt so the plan generator can slot recovery days into higher-frequency plans (5–7 days/week). Currently it emits only workouts and rest.
- Add a validator so a valid plan never puts back-to-back hard workouts of the same body area without a recovery buffer (soft heuristic, not a hard rule).

### 7. Reminder cadence & copy tone — DECIDED

**Owner decision (Vanessa, 2026-07-04): option A.**
Recovery days get the same morning + evening cadence as workout days, just softer copy. Same model, only the copy varies on `workouts.category = 'recovery'`.

---

## Rollout

1. Content seed (§1) → merge alone; no user-visible change.
2. WCSession send + `usePlanStatus` extension (§3, §4) → ship together; closes CA-49; Watch starts rendering the right day.
3. Schedule UI variants (§2) → ship in the next release after user testing on 2.
4. Reminder copy (§5) → ship with UI variants.
5. Plan-generator prompt (§6) → last; requires a couple of week's plans to eyeball for reasonableness.

Estimated as one PR each. Total: 5 PRs, roughly one working day plus review cycles.

---

## Audit closure

- **CA-49 dayType** — closed by §4.
- No new audit rules needed; the WCSession contract test already covers the send.

---

## Open questions

- **Recovery ≠ mobility?** Do we treat mobility as a workout (category = `mobility`) that reasonably lands on a workout day, and recovery as strictly the low-intensity slot? Or fold them together and only use `recovery`?
- **Streak counting.** Currently completing a workout on a scheduled day increments the streak. Should completing a recovery workout do the same? Argument for: yes, reinforces the good behaviour. Argument against: it dilutes what a "workout streak" means.
- **Skip vs complete.** If a user manually marks a recovery day as "skipped", does that break their streak? Probably no — recovery days are optional.

None of these block starting; flag them if they come up during implementation.
