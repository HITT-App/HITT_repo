# Scope — Body Scan "Add these to my plan" (task #109, expanded)

**Status:** Scoping (2026-07-10)
**Estimated:** Medium — 6–8 hours across two paths.
**Supersedes:** #109's original scope in `scope-android-launch-followups.md`, which assumed a single path.

Vanessa flagged that this button should behave differently depending on entry point:

- **Path A — Onboarding**: goal → body scan → workout plan. Body-scan recs get *held* and fed into the plan-generation prompt when the user reaches that step.
- **Path B — Home screen**: returning user. Body-scan recs go into Jarvis, which reads them, compares to previous scans (from `body_scans` table history), inspects the user's current schedule, and offers either a new plan or "stick with current" if the delta doesn't warrant a change.

Same button, two flows. First step is knowing which flow we're in.

---

## What's already in place

- **`body_scans` table** (`supabase/migrations/20260602100000_body_scans.sql`) stores full analysis JSONB per scan, indexed by `user_id + scanned_at DESC`. History comparison is queryable.
- **`BodyScan.tsx:451`** already writes to `body_scans` after every scan completes.
- **`BodyScan.tsx:472`** upserts a body-scan summary to `user_memory` via `upsert_user_memory_key` — Jarvis reads this automatically for context on subsequent conversations.
- **`JarvisMode` has a `prefillMessage` prop** — accepts a text seed to start a conversation. Used successfully by the post-wizard flow.
- **`JarvisMode` detects onboarding state** via `hasGoal`, `hasSchedule`, `hasDietaryPrefs` flags around line 758–770.

Nothing new to model or persist. The work is entirely in wiring + prompts.

---

## Detecting the entry-point

BodyScan.tsx needs to know at click time: onboarding or home screen? Two options:

1. **Query param on the route** — `/body-scan?flow=onboarding` from OnboardingFlow, plain `/body-scan` from Home. BodyScan reads `useSearchParams()`.
2. **Detect from user state** — if `!hasSchedule` and body-scan is the first-time scan (0 prior rows in `body_scans`), assume onboarding.

Option 1 is more explicit; scales cleanly if we add other entry points later (e.g. Settings → Body scan). **Go with option 1.**

Update every caller that navigates to `/body-scan`:
- `src/pages/Index.tsx:252` → `/body-scan` (Home path, no flag)
- OnboardingFlow → `/body-scan?flow=onboarding`

BodyScan.tsx reads: `const flow = searchParams.get('flow') ?? 'home';`

---

## Path A — Onboarding flow

**Entry:** `/body-scan?flow=onboarding`
**User has already:** answered the goal question in Jarvis.
**User has not yet:** received a workout plan.

**On tap "Add these to my plan":**

1. Persist the fresh body-scan analysis (already happens on scan completion, no change).
2. Set `sessionStorage.setItem('hiit-body-scan-pending-for-plan', 'true')` — a one-shot flag that the next Jarvis plan-generation step reads.
3. Navigate back into JarvisMode (or the OnboardingFlow's next step if that's a separate component).
4. **JarvisMode / OnboardingFlow reads the flag** on mount, fetches the latest `body_scans` row, and appends its `analysis.recommendations` to the workout-plan-generation prompt as extra context:

   > "The user just completed a body scan. Their AI-generated recommendations were: [rec 1]; [rec 2]; [rec 3]. Factor these into the workout plan you build."

5. `generate-workout-plan` edge function returns workouts that honour the recs.
6. User confirms the plan → workouts land in `scheduled_workouts` → navigate to `/workout-schedule` (same terminal as current plan flow).
7. Clear the flag: `sessionStorage.removeItem('hiit-body-scan-pending-for-plan')`.

No new Jarvis dialogue — the coach doesn't discuss the scan with the user, it just uses the recs silently. Rationale: user is already in a plan-building flow; interrupting for a scan-review conversation adds a step. If we later want that conversation, it's the Path B experience; onboarding stays fast.

---

## Path B — Home screen entry (returning user with a plan)

**Entry:** `/body-scan` (no flow param).
**User has:** a goal, an active schedule, potentially prior body scans.

**On tap "Add these to my plan":**

1. Persist the fresh body-scan analysis (already happens).
2. Fetch:
   - The **new scan** we just completed.
   - The **most recent prior scan** for this user (if any) from `body_scans` ORDER BY `scanned_at` DESC LIMIT 1 OFFSET 1.
   - The user's **current schedule** — count of upcoming `scheduled_workouts` entries with their body-area focus tags, from now to +14 days.
3. Open JarvisMode with a `prefillMessage` that hands all three chunks of context to the coach:

   > "The user just completed a body scan. Latest scan: [body-fat, muscle balance, top 3 recommendations]. Previous scan from [date]: [same summary]. Their current 14-day schedule: [X strength sessions, Y cardio, Z mobility, focused on {body_areas}]. Compare the two scans, tell the user what's changed, and offer a choice: refresh the plan to act on the new recs, or stick with the current plan if it already addresses them. Be honest — if the current plan is a good fit, say so."

4. Jarvis responds with a comparison + a recommendation + a two-button choice card (existing card pattern from JarvisMode):
   - **[Update my plan]** — triggers the standard `open_workout_plan_wizard` action; existing plan-generation flow takes over.
   - **[Stick with current]** — sends a confirmation reply "Sounds good — I'll check in next scan"; no state change.

5. Whichever the user picks lands in the same terminal state as today (either new plan generated + navigate to schedule, OR just close Jarvis).

Optional polish: if there's no prior scan (user's very first from Home), skip the comparison and just offer plan refresh.

---

## Edge cases

- **No prior body_scans row** (very first scan on Home): drop the "compared to previous" section; the prefill just includes the new scan + current schedule.
- **No current schedule** (returning user hit Home before ever setting up a plan — rare but possible via Settings → Delete plan): treat like Path A even though we're on Home. Prompt the user to build their first plan directly.
- **Multiple scans same day** — take the most recent as "new"; look at the second-most-recent's scanned_at to decide whether to include it in comparison (skip if <24h old; too noisy).
- **Scan analysis missing recommendations** — if `analysis.recommendations` is empty or null (rare AI failure mode), disable the button with tooltip "Analysis unavailable, try scanning again". Don't send Jarvis an empty prompt.

---

## Files to touch

Read + edit:
- `src/pages/BodyScan.tsx` — add flow param handling, wire onClick, add the fetch-and-prefill logic for Path B.
- `src/components/home/BodyScanCard.tsx` — no change (already links to `/body-scan`).
- `src/pages/Index.tsx` — no change; the Home entry link already omits the flow param.
- `src/components/coach/OnboardingFlow.tsx` — update the body-scan navigation to include `?flow=onboarding`.
- `src/components/coach/JarvisMode.tsx` — read the `hiit-body-scan-pending-for-plan` sessionStorage flag on mount, fetch latest body_scans row if flag set, append to the workout-plan-generation prompt in the appropriate branch.

New (small):
- `src/lib/body-scan-context.ts` (~30 lines) — small helper that fetches the latest scan + prior scan + upcoming scheduled_workouts summary. Reused by both paths.

No new tables, no new edge functions, no new migrations.

---

## Verification

**Path A:**
1. Fresh test user, no schedule yet.
2. Ask Jarvis to build a plan → get the goal question → set a goal.
3. Jarvis prompts body-scan → navigate through the scan.
4. Tap "Add these to my plan" → return to Jarvis → confirm the plan generated includes exercises addressing scan recs.
5. Confirm the sessionStorage flag was cleared (open devtools; flag should be gone after plan lands).

**Path B:**
1. Existing test user with a plan.
2. Home → Body scan → complete a fresh scan.
3. Tap "Add these to my plan" → JarvisMode opens with a comparison message.
4. Verify Jarvis references the previous scan date and specific muscle-development / recommendation changes.
5. Verify the [Update my plan] / [Stick with current] card renders.
6. Test both buttons — Update should launch the plan wizard; Stick should just close cleanly.

Cross-platform (iOS + Android): the whole flow is React code + one edge function that already runs on both. If the UX works on the Android emulator, it works on iOS TestFlight.

---

## Rollout

1. Ship Path A first (simplest — just a flag and a prompt append). Can go alone.
2. Ship Path B second — the comparison prompt needs a couple of prompt-tuning passes to make Jarvis' comparison text feel natural, not robotic.
3. Add analytics events `body_scan.rec_dispatched_onboarding` and `body_scan.rec_dispatched_home_new_plan` / `body_scan.rec_dispatched_home_stick` so we can measure whether the "stick with current plan" answer ever wins (indicates the AI is good at comparing) or if every user always taps Update (indicates the comparison is undervalued and we should hide the option).
