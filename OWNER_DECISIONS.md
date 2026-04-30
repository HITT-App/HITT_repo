# Owner Decisions — HIIT App

Design calls that need the owner's sign-off. Keep items open until decided, then link to the commit/PR that implemented the choice and move to "Resolved".

---

## Open

### RevenueCat account — subscription wiring

RevenueCat does not appear anywhere in the codebase. The subscription UI and admin panel are built, but no real IAP purchase can be made. The investor demo has no end-to-end monetisation flow without it.

**Decision needed:** create a RevenueCat account at revenuecat.com and supply the API key. Engineering (~2 days) can proceed immediately once the key exists.

### ✅ AI provider — Gemini direct (2026-04-29)

Switched all 10 edge functions from Lovable's shared Gemini gateway to the **Gemini API direct endpoint** (`generativelanguage.googleapis.com/v1beta/openai/`). Model: `gemini-2.0-flash`. API key stored in Supabase secret `AI_API_KEY` — currently under Vanessa's Google account, needs replacing at handoff (see HANDOFF.md).

### ✅ Community feed refactor (2026-04-29)

Realtime subscription now uses targeted state updates (INSERT/UPDATE/DELETE handled individually) instead of full re-fetch on every event. Cursor-based pagination with IntersectionObserver infinite scroll. Ready for App Store submission.

### ✅ HIIT Score — formula weighting
Current V1 (in `supabase/functions/compute-hiit-score/index.ts`):

| Component | Max | Signal |
|---|---|---|
| Baseline | 50 | — |
| Workouts completed (last 7d) | +15 | `scheduled_workouts` where `status = 'completed'`, 3 pts per session |
| Current streak | +5 | `user_streaks.current_streak`, 1 pt per day |
| Days hitting protein target | +10 | `meal_logs` summed per day vs `nutrition_goals.daily_protein_grams` (90% threshold), 2 pts per day |
| Days ≥7h sleep | +10 | `sleep_logs.duration_minutes ≥ 420`, 2 pts per day |
| Intensity | +10 | avg workout duration / 20 min, scaled |

Total clamped to `[0, 100]`. Truly inactive user → 50. Maxed → 100.

**Decided 2026-04-29:** Accept as-is. No changes to weights, thresholds, or signal sources.

### Broader engagement points system

Owner has asked that the points system extend beyond workouts/nutrition/sleep to reward **any meaningful app engagement**. Current `useStreaksAndBadges` hook defines:

```
WORKOUT_COMPLETE: 50
STREAK_DAY_BONUS: 10
BADGE_EARNED:    25
DAILY_CHECKIN:    5
MEAL_LOGGED:      5
```

Additional actions to reward (owner to confirm values):
- Sharing a workout externally (Instagram, TikTok, etc.)
- Posting to the community feed
- Commenting on / reacting to another user's post
- Uploading a progress photo
- Inviting a friend who signs up
- Completing a full AI-generated plan

**Decision needed:** point values for each, and whether any are one-time vs repeatable (e.g. "first post" bonus vs "every post").

### Account deletion flow (App Store blocker)

Apple App Store Guideline 5.1.1(v) requires in-app account deletion for any app with account creation. **The current app has none — submission will be rejected.**

Needs:
- A "Delete my account" destructive button in the Profile page
- A confirmation modal with friction (typed confirmation, plus an explainer of what happens)
- An edge function that cascades delete across: `auth.users`, and every user-scoped table (profiles, meal_logs, sleep_logs, workouts completed, subscriptions, community posts, etc.)
- Revocation of the session
- **30-day soft delete** with restore option (decided 2026-04-29)

**Still needed:**
- Copy for the confirmation modal — this is a last-touch moment with the user
- Anything beyond the core tables that should be wiped (e.g. ai_generation_log, error_logs, push subscriptions)?

Pure engineering is ready to go once modal copy is supplied.

### Privacy policy rewrite (ICO exposure)

Current `src/pages/Privacy.tsx` is a generic template. For a UK fitness app handling **Article 9 special-category health data** (heart rate, sleep, body composition), we need a real policy documenting:

- Named subprocessors (Supabase, the AI provider after swap, ElevenLabs if voice stays, Apple Health, Google Health Connect)
- Specific data categories collected and the legal basis for each (explicit consent for health data)
- Data retention periods — how long we hold `health_metrics`, `ai_generation_log`, `error_logs`, deleted accounts
- UK/EU data residency (Supabase project region: West EU London — confirm with Supabase plan)
- DPO / data-protection contact email
- Right to access / delete / export (Art. 15 / 17 / 20)
- International transfers (the AI provider may be in the US — SCCs needed)

**Decision needed:**
- Do you want to write this yourself / hire a template (e.g. Termly, Iubenda ~£100), or should I draft a first pass from the codebase facts for you to review?
- DPO contact — use your email, or set up a dedicated `privacy@hiitfitness.app` once the domain exists?
- Retention periods per category

### ✅ Error monitoring — Sentry wired up (2026-04-29)

`@sentry/react` installed. `Sentry.init()` in `main.tsx` with browser tracing (20% sample rate, production only). App wrapped in `Sentry.ErrorBoundary`. DSN stored in `.env` as `VITE_SENTRY_DSN` (EU ingest endpoint — GDPR compliant).

### ✅ Analytics — PostHog wired (2026-04-29)

`posthog-js` installed. EU endpoint (`eu.i.posthog.com`). Events live: `user_signed_up`, `workout_started`, `workout_completed` (with duration/distance/calories), `meal_logged` (source: manual/barcode/scanner), `plan_generated`, `premium_feature_viewed`, `subscription_checkout_started`. Users identified by Supabase UID on sign-in; reset on sign-out.

### Health-data sync — scope and defaults

HealthKit (iOS) and Health Connect (Android) wiring is live. The first iOS build after the founder opens the project in Xcode will prompt the user for permission to read heart rate, steps, resting heart rate, sleep, weight, body fat, oxygen saturation, calories, and workouts — and to write workouts back.

Open questions:

- **Default read scope.** Should we request all of the above at first prompt, or split it into two rounds (essentials now: heart rate / steps / sleep — advanced later: body fat / oxygen / etc.)? Progressive opt-in is generally better UX but adds flow complexity.
- **Write-back of in-app workouts.** When a user completes a workout inside HIIT, should it be automatically logged to HealthKit (so it counts toward Apple Watch Activity rings) or should we ask them first? Most fitness apps default to on; a small minority prefer read-only sync.
- **Android rollout timing.** The `android/` folder isn't scaffolded yet. Do we add Android support now (parallel with iOS) or wait until iOS is in TestFlight? Adding later is cheap but means launching iOS-only.
- **Direct wearable APIs.** Garmin Connect, Oura Ring, Whoop, and Fitbit have their own APIs with exclusive metrics (Garmin stress score, Oura readiness, Whoop recovery, Fitbit sleep stages). HealthKit captures the *basic* metrics these devices write but not the proprietary scores. Adding direct integrations per vendor is significant effort (1–2 weeks each, plus a vendor review process of days to weeks). Do we defer these indefinitely, or prioritise one (probably Whoop or Oura given they map well to our HIIT Score concept)?

**Decision needed on each of the four.** Non-urgent — default behaviour (sync all metrics, write workouts back, iOS-only, no direct wearable APIs) ships the app fine, but the owner should confirm before TestFlight.

### Leaderboard prizes and reward structure

Owner wants the leaderboard to be a real incentive: "prizes for best user / best workouts / sticking to goals". The current leaderboard ranks by accumulated points but has no tangible reward.

Open questions:
- What categories? (Top overall / Top HIIT / Longest streak / Best transformation / Most community engagement?)
- What prizes? (Premium subscription credits / branded merch / physical products / cash? This also has App Store policy implications — contests and sweepstakes have specific rules.)
- What cadence? (Weekly / monthly / quarterly?)
- Who runs it operationally? (Automated vs manual selection?)

**Decision needed:** prize structure and cadence before I can build the UI + automation.

---

### ✅ TestFlight — live as of 2026-04-30

App is on TestFlight. Current build: **5** (version 1.0). Add testers via App Store Connect → TestFlight → Internal Testing.

**Builds shipped:**
- Build 3: first build — monitoring, analytics, account deletion, GPS share cards, push notifications
- Build 4: uploaded during session gap
- Build 5: Google sign-in fix, keyboard navigation on signup, location permission string

### ✅ Google OAuth on iOS — fixed (2026-04-30)

Google sign-in now works on TestFlight. Uses `hiitfitness://` deep link scheme to route back into the app after Google authenticates. Supabase Auth redirect URL `hiitfitness://auth-callback` has been added to the allowed list. **Important:** this redirect URL must be kept in Supabase Auth → URL Configuration → Redirect URLs. Do not remove it.

### ✅ iOS permissions — all strings in place (2026-04-30)

Info.plist contains all required Apple privacy usage strings: camera, photo library, photo library save, location (when in use + always), microphone, HealthKit read + write. Push notifications entitlement set to `production`.

---

## Resolved

### ✅ Explainable score breakdown
**Decided:** Yes — tapping the HIIT Score badge opens a bottom sheet showing the breakdown (workouts, streak, nutrition, sleep, intensity), raw input counts, and a "how is this calculated?" explainer.

**Rationale from owner:** "the more they are tracking the better."

**Implementation:** `src/components/home/HIITScoreBreakdownSheet.tsx`. Ships in commit TBD.

### ⏸ Mental-health / mindfulness signal
**Decided:** Defer. Owner likes the *concept* of rewarding good mood / frame of mind via the points system, but wants to wait for real user data to see whether mindfulness tracking is something users actually engage with before baking it into the HIIT Score formula. Revisit once there's retention and daily-check-in data to analyse.

### ⏸ Nightly pg_cron job
**Decided:** Defer. Owner wants to wait for trend-analysis data before deciding whether covering dormant users is worth the infrastructure cost. Client-side recompute remains sufficient while the active-user base is the focus. SQL remains ready in `supabase/manual_setup/pg_cron_hiit_score.sql` for future enablement.
