# Owner Decisions — HIIT App

Design calls that need the owner's sign-off. Keep items open until decided, then link to the commit/PR that implemented the choice and move to "Resolved".

---

## Open

### HIIT Score — formula weighting
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

**Decision needed:** accept as-is, or adjust weights / thresholds / signal sources?

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
- Optional: grace period (30-day soft delete) before hard purge — gives users a window to undo an accidental delete and is also a light retention lever

**Decision needed:**
- Hard delete immediately, or 30-day soft delete with restore option?
- Copy for the confirmation modal — this is a last-touch moment with the user
- Anything beyond the core tables that should be wiped (e.g. ai_generation_log, error_logs, push subscriptions)?

Pure engineering is ready to go once these are answered.

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

### Error monitoring upgrade path

We've shipped a Supabase-native error log (`error_logs` table, `log-error` edge function, `ErrorBoundary` wired up). That's enough for MVP debugging — new errors land in a queryable table visible to admins.

**Decision needed:** upgrade to Sentry (or equivalent like Bugsnag, Rollbar) before TestFlight, or stay on the native log until real volume requires it?

Sentry's free tier covers 5K events/month — easily enough for TestFlight. If yes, you create the Sentry project and give me the DSN; I wire it up in ~1 hour and keep the native log as a backup.

### Analytics provider

We don't have product analytics yet. The architect flagged this as important before a £150K investor TestFlight — can't show D1/D7/D30 retention, feature adoption, funnel dropoffs without it.

Options in order of fit:
- **PostHog** (free tier: 1M events/mo, open source, self-hostable later)
- **Mixpanel** (fitness apps use it a lot, free tier: 20M events/mo but limited features)
- **Amplitude** (most polished for investor-facing dashboards, free: 10M events/mo)

**Decision needed:** which one, and what events should we instrument? Baseline events I'd suggest: user_signed_up, workout_started, workout_completed, meal_logged, plan_generated, subscription_checkout_started, premium_feature_viewed.

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

## Resolved

### ✅ Explainable score breakdown
**Decided:** Yes — tapping the HIIT Score badge opens a bottom sheet showing the breakdown (workouts, streak, nutrition, sleep, intensity), raw input counts, and a "how is this calculated?" explainer.

**Rationale from owner:** "the more they are tracking the better."

**Implementation:** `src/components/home/HIITScoreBreakdownSheet.tsx`. Ships in commit TBD.

### ⏸ Mental-health / mindfulness signal
**Decided:** Defer. Owner likes the *concept* of rewarding good mood / frame of mind via the points system, but wants to wait for real user data to see whether mindfulness tracking is something users actually engage with before baking it into the HIIT Score formula. Revisit once there's retention and daily-check-in data to analyse.

### ⏸ Nightly pg_cron job
**Decided:** Defer. Owner wants to wait for trend-analysis data before deciding whether covering dormant users is worth the infrastructure cost. Client-side recompute remains sufficient while the active-user base is the focus. SQL remains ready in `supabase/manual_setup/pg_cron_hiit_score.sql` for future enablement.
