# Owner Decisions — HIIT App

Design calls that need the owner's sign-off. Keep items open until decided, then link to the commit/PR that implemented the choice and move to "Resolved".

---

## Open

### Calorie goal setting in Nutrition Dashboard

Users currently have no way to set their daily calorie target from within the app. The dashboard shows "X / 3320 kcal" but 3320 is a hardcoded default. A "Set goal" button or editable field on the Nutrition Dashboard (or in Profile/Settings) should let users enter their own daily calorie, protein, carbs, and fat targets, which would save to `nutrition_goals`.

**Action needed:** confirm where this should live (inline on dashboard, or in a settings screen?) and whether the values should be manually entered or calculated from age/weight/activity level.

### V2: Fitness Coach Sessions

Removed from v1 at owner request. The full infrastructure (BrowseCoaches, BookCoach, CoachAppointments pages, coach profiles, session booking DB tables) is preserved in the codebase but hidden from navigation.

**For v2, decide:**
- Will coaches be internal HIIT staff, or can external coaches list themselves?
- Free to browse, paid to book — or subscription unlocks sessions?
- Video calls (integrate Zoom/Daily.co) or in-app messaging only?
- Should session history appear in user profiles?

### V2: AI Cinematic / Jarvis Mode

Removed from v1 at owner request (not working reliably). Suggestions for a better replacement:

1. **AI Workout Camera** — use the phone camera during a workout to count reps via pose detection and give real-time form feedback
2. **AI Voice Coach mid-workout** — press a button during a workout and speak naturally; AI responds with motivation, form tips, and adjusts difficulty
3. **Workout Highlight Reel** — after completing a workout, AI generates a 15-second shareable video summary with stats overlaid
4. **Live AI Session** — scheduled 1:1 live AI coaching session (like a call, but with the AI avatar) using a proper real-time API

**Action needed:** Pick one (or rank them) to build for v2.

### App Icon

Current icon is an orange gradient placeholder. Replace with final branded artwork before App Store submission.

**Action needed:** Provide a 1024×1024 PNG of the final icon. Drop it into `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` and rebuild.

### Apple Watch companion app

Framework is built and registered in the Xcode project (`ios/App/HIITWatch/`). The Watch app shows today's workout, tracks live HR/calories during an active session, and sends workout events back to the iPhone. One manual Xcode step is required before it can be built and deployed.

**Action needed:** Follow `ios/App/WATCH_SETUP.md` to add the watchOS target in Xcode (File → New → Target → Watch App, ~5 minutes). After that, the Watch app will appear in the same TestFlight build automatically.

### "OK HIIT" wake word feature

The app has a "Say OK HIIT" toggle in Settings (backed by `WakeWordListener.tsx`). The intent is that saying "OK HIIT" activates the AI coach voice mode hands-free — similar to "Hey Siri". The scaffold is in place but the feature is not fully implemented.

**Decision needed before enabling:**
- Does the owner want continuous microphone listening as a feature? (Apple may scrutinise this during App Review — requires clear justification in the privacy usage string)
- Should wake word detection run entirely on-device (requires a local ML model e.g. Picovoice Porcupine — ~1 week engineering) or trigger only when the app is in the foreground?
- Alternatively: defer entirely and remove the toggle until post-launch when voice is a confirmed priority

Currently the toggle is visible in Settings but has no active effect. It is safe to leave as-is for TestFlight.

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

### ✅ Account deletion flow — shipped (2026-04-29, build 3)

App Store Guideline 5.1.1(v) satisfied. "Delete my account" button in Profile → confirmation modal with typed "DELETE" confirmation → `delete-account` edge function soft-deletes across 12 user tables and revokes the session. 30-day restore window. Ships in build 3.

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

### ✅ Goals button in Jarvis (2026-05-13, build 71)

**Decision confirmed 2026-05-13.**

A "Goals" button (Target icon, labelled "Goals") sits to the left of the mic button inside Jarvis. Tapping it:
- If the user has `workout_preferences` set: Jarvis summarises their current goal, days/week, and session length, then asks if they want to adjust anything
- If no goals are set: Jarvis runs the full onboarding intake (goal → days → session length → schedule proposal)

**For future consideration:** add a second small button on the right side (e.g. "Today" to pull up today's schedule, or "Progress" to show recent stats) to balance the layout.

---

### ✅ Navigation restructure (2026-05-13, build 69)

**Decision confirmed 2026-05-13.**

- The centre HIIT logo button in the bottom nav now opens Jarvis directly (same as saying "Ok HIIT")
- The AI tab has been replaced with an "Add" tab (Plus icon) which opens the full navigation menu
- "Ok HIIT" wake word, the HIIT button, and the `hitt:open-jarvis` custom event all use the same code path in VoiceController

**For future consideration:**
- Simplify the "Add" sheet to just the most common actions (add workout, log meal, log activity)?
- Remove or repurpose the `/ai-coach` route entirely?

---

### ✅ TestFlight — live as of 2026-04-30

App is on TestFlight. Current build: **24** (version 1.0). Add testers via App Store Connect → TestFlight → Internal Testing.

**Build history:**
| Build | Date | Notes |
|---|---|---|
| 3 | 2026-04-29 | First build — monitoring, analytics, account deletion, GPS share cards, push notifications |
| 4 | 2026-04-30 | Uploaded during session gap |
| 5 | 2026-04-30 | Google sign-in redirect, keyboard nav on signup, location permission string |
| 6 | 2026-04-30 | Deep link handler + `hiitfitness://` URL scheme registered in Info.plist |
| 7 | 2026-04-30 | OAuth handler covers both PKCE and implicit flow; Supabase client hardened for Capacitor |
| 8 | 2026-04-30 | Google sign-in spinner fixed — session explicitly refreshed after OAuth completes |
| 9–19 | 2026-04-30 – 2026-05-01 | Iterative Google OAuth debugging — custom OAuthPlugin built, registered, debugged across multiple approaches |
| 20 | 2026-05-01 | OAuthPlugin conforms to CAPBridgedPlugin — Google sign-in working with custom plugin |
| 21 | 2026-05-01 | Welcome screen UX fixed; tutorial no longer navigates away |
| 22–23 | 2026-05-01 | Build number collisions in ASC (skipped) |
| 24 | 2026-05-01 | Custom OAuthPlugin replaced with `@capgo/capacitor-social-login`; cleaner native ID token flow |
| 25 | 2026-05-01 | Watch sync step count fixed — window now runs from midnight today, matching Apple Health |
| 26 | 2026-05-01 | Black camera screen in meal scanner fixed |
| 27 | 2026-05-01 | Barcode scanner fixed on iOS (ZXing fallback); AI chat auto-scrolls to latest message |
| 28 | 2026-05-01 | Community feed fixed; all AI features upgraded to Gemini 2.5 Flash |
| 29 | 2026-05-01 | Profile screen locked to vertical scroll; redundant back arrow removed |
| 30 | 2026-05-01 | Bottom nav bar repositioned closer to screen edge |
| 31 | 2026-05-03 | Browse Meals shows full 30-recipe library with photos, macros, allergens |
| 32 | 2026-05-03 | Body scan photos resized before upload (6 MB limit fix); story keyboard fix; duplicate greeting removed |
| 33 | 2026-05-03 | Body scan: second-person AI output, camera flip button, AI disclaimer visible above nav |
| 34 | 2026-05-03 | Body scan rear-camera fix (capture gate); workout library seeded (175 exercises, 28 thumbnails) |
| 35 | 2026-05-03 | Body scan "expecting ; or )" error fixed; session token fetched safely before request |
| 36 | 2026-05-03 | Body scan camera flip works in one tap; Watch health data syncs automatically on app open |
| 37 | 2026-05-03 | Home workouts section spacing fixed; category filters work; workout detail sticky header; player controls fixed |
| 38 | 2026-05-04 | Ironman triathlon Watch integration — race setup screen, send plan to Watch, Race tab, leg transitions |
| 45 | 2026-05-05 | AI coach speaks responses (ElevenLabs TTS); 6 voice choices; mute toggle in chat; voice preference saved |
| 57 | 2026-05-08 | All 9 missing Watch screens added; persistent Jarvis chat history; welcome back greeting; streaming fix |
| 58 | 2026-05-08 | Jarvis hardened — 5 bugs: response bleed, rapid speech, duplicate message, mute toggle, single conversation |
| 59 | 2026-05-08 | Jarvis builds real schedules from workout library; schedule confirmation in chat; welcome greeting fixed; Watch icon |
| 60 | 2026-05-08 | HealthKit refreshes on every app open; voice food logging (log what you ate to Jarvis) |
| 61 | 2026-05-08 | Voice picker redesigned with preview cards; HIIT pronunciation fixed (now sounds like "hit") |
| 62 | 2026-05-09 | Interrupt coach mid-speech; voice preview fixed on iOS; schedule updates live when Jarvis creates plan |
| 63 | 2026-05-09 | Jarvis shows confirmation card before saving schedule; nothing saved without user tapping "Add to schedule" |
| 64 | 2026-05-09 | Watch navigates to Race screen automatically when plan arrives; reliable delivery when Watch is out of range |
| 65 | 2026-05-09 | WebSocket not connected Sentry error fixed; voice mic stability improved |
| 66 | 2026-05-09 | AI coach TTS fixed (speaks every response); schedule date picker extended to 14 days; Add to Schedule button |
| 67 | 2026-05-08 | Watch triathlon plan persists across app restarts; plan-arrival observer moved to top level |
| 68 | 2026-05-09 | Jarvis onboarding flow — goal intake on first open, auto schedule proposal, body scan offer |
| 69 | 2026-05-13 | Welcome message reliability + echo fix; nav restructure; social sticky headers; onboarding flow; mic chime fix |
| 70 | 2026-05-13 | Hotfix: missing useEffect import in VoiceController caused startup crash on build 69 |
| 71 | 2026-05-13 | Goals button added to Jarvis — reviews current goals or runs full onboarding if none set |

### ✅ Google OAuth on iOS — rebuilt with native plugin (2026-05-01, build 24)

Google sign-in works end-to-end using `@capgo/capacitor-social-login` v8.3.20. The native Google Sign-In SDK returns an ID token which is exchanged with Supabase via `signInWithIdToken` — no browser redirect or deep link needed. Google OAuth credentials (iOS + web client IDs) configured in Google Cloud Console project `hiit-fitness-oauth` (currently under Vanessa's Google account — see HANDOFF.md). Web client ID stored in `.env` as `VITE_GOOGLE_WEB_CLIENT_ID`. Supabase Auth → URL Configuration → Redirect URLs still contains `hiitfitness://auth-callback` — **do not remove**, it is used for email confirmation and password reset flows.

### ✅ iOS permissions — all strings in place (2026-04-30)

Info.plist contains all required Apple privacy usage strings: camera, photo library, photo library save, location (when in use + always), microphone, HealthKit read + write. Push notifications entitlement set to `production`.

---

## Resolved

### ✅ Workout video links — owner-provided (2026-05-15)

The YouTube API approach is no longer needed. The owner is providing video files directly for each workout. Videos should be uploaded and their URLs added to the `video_url` column on the `workouts` table directly. The `scripts/populate_videos.py` script (YouTube auto-search) can be ignored.

### ✅ Explainable score breakdown
**Decided:** Yes — tapping the HIIT Score badge opens a bottom sheet showing the breakdown (workouts, streak, nutrition, sleep, intensity), raw input counts, and a "how is this calculated?" explainer.

**Rationale from owner:** "the more they are tracking the better."

**Implementation:** `src/components/home/HIITScoreBreakdownSheet.tsx`. Ships in commit TBD.

### ⏸ Mental-health / mindfulness signal
**Decided:** Defer. Owner likes the *concept* of rewarding good mood / frame of mind via the points system, but wants to wait for real user data to see whether mindfulness tracking is something users actually engage with before baking it into the HIIT Score formula. Revisit once there's retention and daily-check-in data to analyse.

### ⏸ Nightly pg_cron job
**Decided:** Defer. Owner wants to wait for trend-analysis data before deciding whether covering dormant users is worth the infrastructure cost. Client-side recompute remains sufficient while the active-user base is the focus. SQL remains ready in `supabase/manual_setup/pg_cron_hiit_score.sql` for future enablement.
