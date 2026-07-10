# Scope — post-Play-launch follow-ups (#107–#110)

**Status:** Scoping (2026-07-10)
**Total estimate:** ~1 sprint if we take all four back-to-back.

These four surfaced during Play Store screenshot prep. Two are cross-platform bugs (#107, #109), one is a naming/branding sweep (#108), one is a genuinely-missing feature path (#110).

Recommended order: **#109 → #107 → #108 → #110** — 109 and 107 are user-facing UX; 108 is quick copy sweep to align with the store listing (which says "AI coach", not "Jarvis"); 110 is server-side feature work that benefits from having the copy consistent first.

---

## #109 — Body Scan "Add these to my plan" (dead button)

**Estimated:** Small — 30 min.

**Root cause:** `src/pages/BodyScan.tsx:887-889` — the button has **no `onClick` handler at all.**

```tsx
<Button className="w-full mt-3 gap-1.5 h-11">
  <CalendarPlus className="w-4 h-4" /> Add these to my plan
</Button>
```

Not a broken handler; the handler never existed. That's why tapping does nothing on iOS **and** Android — no platform-specific investigation needed.

**Fix:**
1. Wire an `onClick` that takes the visible recommendations and either:
   - Adds them as `scheduled_workouts` rows over the next 3–7 days (best fit if recs are structured workouts), or
   - Sends them into Jarvis as a "plan me these workouts" seed and lets the existing plan-generator handle placement (better if recs are semantic, e.g. "focus on lower body this week")
2. Show a spinner while dispatching, then `toast.success` on completion.
3. Navigate to `/workout-schedule` on success so the user sees where they landed.

**Which route** depends on what `analysis.recommendations` contains at that point in the component — needs to be a quick read of the surrounding code before we choose. My lean: option 2 (route through Jarvis) — reuses the tested plan-placement path.

**Verify:** Complete a body scan on iOS TestFlight AND Android emulator, tap the button, confirm workouts appear on Schedule. Both platforms.

---

## #107 — Schedule empty state: copy + wrong "nothing scheduled" flag

**Estimated:** Small — 45 min.

**Two overlapping issues, both in `src/pages/WorkoutSchedule.tsx`:**

### 107a — Copy fix

Lines 481 + 487:

```tsx
<p className="text-muted-foreground text-sm mt-1">Ask Jarvis to build you a plan.</p>
...
Ask Jarvis
```

**Fix:** Rename to "Ask HIIT coach" — see #108 for the wider sweep this is one instance of. Do inline as part of 107.

### 107b — Wrong flag: shows on today/tomorrow despite completions

The `<p>Nothing scheduled yet.</p>` branch appears even when there ARE completed activities recorded for that day. Reproducer during screenshot prep: Casey had 15 seeded `activity_logs` including today and yesterday, and today's card still said "nothing scheduled".

**Root cause hypothesis (needs read):** the empty-state branch checks `scheduled_workouts` only. `activity_logs` completions are a separate table and aren't queried. So a day with a completed activity but no scheduled_workout row shows empty.

**Fix:** the "should we show the empty state?" predicate should account for **both**:
1. `scheduled_workouts` entries for that date (existing), OR
2. Any `activity_logs` row for that user on that date with `status='completed'`.

If either exists, hide the empty state.

**Verify:** Complete a workout that wasn't pre-scheduled (via Garmin push, Apple Watch sync, or a spontaneous GPS run in-app); Schedule should show a filled card for that date, not "nothing scheduled". Both platforms.

---

## #108 — User-facing "Jarvis" → "HIIT coach" sweep

**Estimated:** Small — 1 hour (mostly reading, verifying nothing user-facing is missed).

**Scope:** Every string a user could read, on any screen or toast, must say "HIIT coach" (or context-appropriate wording — "your coach", "the AI coach", "coach"). "Jarvis" is fine to keep as an internal codename for the subsystem.

**Do rename** — literal user strings:
- `WorkoutSchedule.tsx:481, 487` — "Ask Jarvis" (covered by #107)
- Any `toast()` messages with "Jarvis"
- Onboarding cards, empty states, headings
- Community post templates that reference the coach
- Sign-up / welcome copy

**Don't touch** — internal names:
- `JarvisMode.tsx` component and file name
- `ai-coach` edge function name
- Analytics event names
- Class and function names inside components
- Comments describing the subsystem

**Sweep method:**
```bash
grep -rin "Jarvis" src/ | grep -v -E "^\S+:[0-9]+:.*//|^\S+:[0-9]+:.*import" | grep -iE "'|\"|<h[1-6]|<p |>Jarvis<"
```
Then go through each hit; the fixture is "would a user reading the app see this exact string on screen?"

**Verify:** After the sweep, grep once more for `Jarvis` in the codebase and every remaining hit should be either (a) inside a code identifier / component name / file path, or (b) inside a comment. Nothing user-visible.

Also: **update `docs/play-store-listing.md` and `src/content/privacy-policy.md`** which currently reference "Jarvis" (privacy policy section 3.1 mentions the AI assistant by name). Rename those too so external documentation matches in-app copy.

---

## #110 — PB share reminder for external workouts (Garmin, HealthKit, direct-push)

**Estimated:** Medium — 4–6 hours.

**Root cause:** the PB share push fires from a client-side path only. When a workout is completed inside HIIT via `WorkoutPlayer.tsx:842`, `schedulePBShareReminder` writes `workout_progress.pb_share_reminder_at`, and the cron `fire_pb_share_reminders_5min` scans `workout_progress` for due rows.

External workouts (Garmin CIQ push, Apple Watch via HealthKit sync, other wearable syncs) never reach `WorkoutPlayer.tsx`. They land in `activity_logs` via `_shared/activity-upsert.ts`. No PB detection, no reminder scheduled.

**Fix:** Add server-side PB detection to `_shared/activity-upsert.ts` so **every** ingest path benefits — Garmin direct push, HealthKit sync, and any future direct-push paths — without each one re-implementing.

**Approach:**

1. In `_shared/activity-upsert.ts`, immediately after a successful insert into `activity_logs`:
   - Query the user's prior best in that canonical `activity_type` (longest `duration_seconds`, greatest `distance_km`, most reps, best pace).
   - If the new row beats any of them, it's a PB.
2. If a PB is detected, insert a row into `workout_progress` for the same user × activity, with:
   - `workout_title` derived from `activity_logs.activity_type` (or `notes` if richer)
   - `pb_share_reminder_at` = `now() + INTERVAL '5 min'`
   - `pb_share_notified_at` = NULL
3. Existing cron `fire_pb_share_reminders_5min` picks it up unchanged and fires the push.
4. Winner-selection interaction: if the same workout is being upgraded to a higher-priority source (e.g. HealthKit → hitt_garmin_watch direct push), PB detection should only fire on the FIRST insert, not on subsequent upgrades of the same underlying workout. The dedupe layer's `insertedRows` array is the safe hook — only scan those.

**Alternative** (cleaner but bigger change): rewrite the cron to also scan `activity_logs` for new PBs directly, cutting out the `workout_progress` mirror row. Better long-term but changes the shape of two other flows that read `workout_progress`. Do this ONLY if we're touching those flows for another reason.

**Verify:**
- Complete a Garmin ride that beats Casey's previous max distance. Wait 5 min. Push should arrive: "🏆 New PB! Your Cycling was a personal best. Share it with the community?"
- Same on HealthKit path — record an Apple Watch workout that beats a duration PB, wait, expect push.
- Don't send push if not a PB — a run that's shorter than Casey's best should NOT trigger a push.
- Verify no duplicate push if the same real-world workout lands twice via two paths (winner-selection dedupe).

Both platforms.

---

## Cross-cutting: no new tasks needed, but note

- Once #108's sweep completes, the audit test suite in `tests/run.ts` might warrant a new rule to catch any future user-facing "Jarvis" leak. Optional — the sweep itself is a one-time hygiene pass; a future violation is easy to catch by grep during code review.
- Both #107 and #109 are UI copy/handler bugs — no server changes needed. They'll go out with the next AAB v8 + iOS Build 325 alongside anything else queued.
- #110 needs a re-deploy of the shared upsert helper via `supabase functions deploy log-user-workout push-garmin-watch-workout sync-healthkit` — three functions, all in one deploy invocation.
