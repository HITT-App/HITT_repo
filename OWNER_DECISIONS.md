# Owner Decisions — HIIT App

Design calls that need the owner's sign-off. Keep items open until decided, then link to the commit/PR that implemented the choice and move to "Resolved".

---

## Open

### 🔄 v1.0.6 / Build 332 submitted for App Store review (2026-07-30)

Submitted 2026-07-30. **This is the first submission since 1.0.2**, so it carries four
versions of change at once — 1.0.3, 1.0.4 and 1.0.5 all went to TestFlight and were never
submitted. Review notes and "What's New" should cover the whole span, not just the newest
build. See `CHANGELOG.md` for the per-version detail.

**Open compliance item — verify this was done before review completes:**

Build 332 is the **first build that can store body photos** (body-scan progress photos,
opt-in). Two declarations should have been updated to match:

1. **App Privacy questionnaire** in App Store Connect — needs to declare photo storage.
2. **Published privacy policy** (hiituk.com/privacy) — should state that body photos may be
   stored, that it's optional, and that they're deleted with the account.

Apple checks declarations against actual behaviour, so a mismatch is a plausible rejection.
If either was missed, expect a Guideline 5.1.1 flag and fix it in the review response
rather than resubmitting.

**Also worth knowing for the review:** the photo feature stores nothing by default. A
reviewer who runs a body scan without ticking the consent box will see the Progress tab's
slots stay empty — that's correct behaviour, not a bug, and the empty state says so.

### ✅ App transferred to Casey + App Store compliance decisions (2026-07-11, v1.0.2 / Build 328)

- **App Store + Apple Developer ownership transferred to Casey** (team `5933246NY5`). Backend (Supabase) + GitHub stay with Vanessa. Build pipeline re-pointed (see `CLAUDE.md` → Deploy → "iOS signing"). v1.0.2 / build 328 shipped to Casey's TestFlight.
- **In-app content reporting shipped** (App Store Guideline 1.2) so the app can honestly declare social media — report + auto-hide + block + moderation queue + contact.
- **DSA trader status = TRADER.** HIIT is distributed commercially in the EU, so Casey declares as a trader and provides a public **business** address + phone + `casey@hiituk.com` on the App Store page (display-only). Use a business/registered address, not a home address.
- **Age Rating questionnaire:** **Social Media = Yes**; **Social Media Disabled for Under-13 = No** (the app has no age gate and doesn't call the Declared Age Range API). Rating **16+ — accepted** (that was always the target), so the age-gate / Declared Age Range API feature is **not being built** unless Apple's rules force it later.
- **1.0.2 submitted and LIVE on the App Store** (ASC listing name corrected "HITT Fitness" → "HIIT Fitness").

### ✅ Calorie goal setting in Nutrition Dashboard (2026-06-01, Build 116)

A 2–5 step nutrition preferences flow now collects dietary requirements, allergens, and a daily calorie target — either calculated from weight/activity level/goal or entered manually. `nutrition_profiles` extended with `calorie_method`, `weight_goal`, `activity_level`, and `onboarding_skipped`. Dashboard reads from `nutrition_profiles` and the hardcoded 3320 default is gone.

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

### ⏸ "OK HIIT" wake word + voice — deferred to v1.0.1 (Build 102)

Voice responses and wake word detection have been switched off for v1.0 via a kill switch in `TTSContext` (`VOICE_FEATURE_ENABLED = false`). All TTS infrastructure stays deployed — one line restores it. The Settings toggle is hidden behind the flag. "OK HIIT" still opens Jarvis (it navigates to the AI surface) but does not speak.

**Decision needed before v1.0.1:**
- Wake word detection: on-device ML model (Picovoice Porcupine, ~1 week) vs foreground-only trigger only?
- Apple may scrutinise continuous microphone use in App Review — justify in privacy strings before re-enabling

Safe to ship v1.0 as-is.

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
| 72 | 2026-05-13 | Fix Jarvis onboarding edge cases; Watch workout persistence across restarts; activity pre-start screen |
| 74 | 2026-05-14 | Force Jarvis to emit schedule marker on verbal approval; navigate to Schedule on add |
| 75–79 | 2026-05-14 | Recommendation "why" reasons on every Jarvis suggestion; header padding polish; Jarvis voice echo fix |
| 80–83 | 2026-05-14 | Phase 3–4: RECOMMEND_WORKOUT + RECOMMEND_RECIPE markers; Jarvis renders rich workout and recipe cards; Phase 5: proactive greeting recommendations + post-workout share nudge |
| 84–87 | 2026-05-14 | Phase 6–7: Personal best detection (duration / calories / streak); PB share card gold treatment; 30-min push reminder; auto-cancel on share |
| 88–90 | 2026-05-14 | T2.5: Schedule card on Home with three states; QuickAddSheet replaces mega-menu; nav restructure B |
| 91–92 | 2026-05-14 | Visual polish: FAB size/position, avatar alignment, section spacing |
| 93 | 2026-05-20 | T14: Workouts/Sports tab switcher; triathlon renamed to Long Course / Middle Distance for trademark compliance |
| 94–95 | 2026-05-20 | SportsTab image-backed card redesign with sport illustrations; workout library import scripts |
| 96 | 2026-05-21 | YouTube video playback in WorkoutPlayer — inline video alongside exercise steps |
| 97 | 2026-05-21 | Workout filter normalisation — slugs, expanded categories and body areas now work |
| 98 | 2026-05-21 | Navigation fixes: Triathlon and Routes use navigate(-1) instead of Home arrow |
| 99 | 2026-05-26 | Fix Jarvis voice bugs — name injection, voice-off wiring, echo cancel, error toasts |
| 100–101 | 2026-05-26 | Unify TTS into single service; fix voice name bug; fix iOS TTS gesture binding, name flicker, chat contamination |
| 102 | 2026-05-26 | Voice deferred to v1.0.1 — VOICE_FEATURE_ENABLED kill switch; all TTS surfaces hidden |
| 103–105 | 2026-05-27 | HIITMenu from Sheet to Drawer (swipe-dismiss); nav polish |
| 106 | 2026-05-27 | 5A+5B: New `useAI` hook; structured response branch in ai-coach edge function (tool calling, typed Action SSE chunks) |
| 107 | 2026-05-27 | 5C: JarvisMode refactored to pure UI over `useAI`; ~500 lines deleted; synthetic message architecture |
| 108 | 2026-05-28 | 5E: AI-generated workout schema — inline exercises on `scheduled_workouts`, `workout_progress`, `user_workout_plan_items` |
| 109 | 2026-05-29 | 5F: AI workout + plan generation via Jarvis (`generate-ai-workout`, `generate-ai-workout-plan` edge functions); A1: workout catalogue hidden from v1.0 surfaces |
| 110 | 2026-05-29 | A2: Three-tab AI surface (/ai — Chat, Coach, Settings); bottom nav restructured to Home \| Quick Add \| HIIT \| Schedule \| Social |
| 111 | 2026-05-31 | A5: 24-hour rolling chat history — messages older than 24 h purged; AI context window trimmed to same window |
| 112–113 | 2026-06-01 | A18: Nutrition preferences flow (allergens, dietary requirements, calorie target); recommended meals carousel on Home |
| 114–116 | 2026-06-01 | A18 patches: keyboard avoidance, ingredient fix, carousel polish; A18.4: Home nutrition card reads live data |
| 117 | 2026-06-01 | BUG1: Fix nutrition double-logging on page reload — LOG_FOOD actions deduplicated by ID in useAI |
| 118 | 2026-06-01 | A21: Edit and delete logged food diary entries — three-dot action sheet, pre-filled edit drawer, soft delete |
| 119 | 2026-06-01 | A21 fixes: numeric field clear/retype; keyboard avoidance in edit drawer |
| 120 | 2026-06-01 | A23: Jarvis food-diary reads live meal_logs; TODAY'S FOOD DIARY context block in ai-coach; double-counting guard |
| 121 | 2026-06-02 | A23 fix: chat receipts excluded from AI context; no more yesterday's meals or double-logging on reload |
| 122 | 2026-06-02 | MD Stage 1a: full body-scan analysis (body type, muscle, symmetry, posture, observations) persisted to new `body_scans` table |
| 123 | 2026-06-02 | MD Stage 1b: `set_goals` tool in ai-coach — Jarvis saves stated fitness goals durably; activity goals upsert conflict fixed |
| 124 | 2026-06-03 | A24: text input for Jarvis (keyboard path alongside mic); BUG1 synthetic stopgap — LOG_FOOD user-turn marked synthetic to prevent AI re-reading |
| 125 | 2026-06-03 | Fix: set_goals blank response + surface write error handling |
| 126 | 2026-06-03 | A25: unified logging confirmation pop-up — durable BUG1 fix; single confirmation regardless of logging path |
| 127 | 2026-06-03 | A26: deterministic food-recall — "what have I eaten today?" answered directly from meal_logs, bypasses LLM entirely |
| 128 | 2026-06-04 | A27: greet() no longer volunteers stale food-recall answers; food-recall Q&A marked synthetic on both sides |
| 129 | 2026-06-04 | Branded share templates — 6 SVG designs (duration, full-stats, personal-bests, first-route, triathlon, challenge) × post + story formats; template picker with live SVG previews; auto-fill from session stats |

### ✅ Google OAuth on iOS — rebuilt with native plugin (2026-05-01, build 24)

Google sign-in works end-to-end using `@capgo/capacitor-social-login` v8.3.20. The native Google Sign-In SDK returns an ID token which is exchanged with Supabase via `signInWithIdToken` — no browser redirect or deep link needed. Google OAuth credentials (iOS + web client IDs) configured in Google Cloud Console project `hiit-fitness-oauth` (currently under Vanessa's Google account — see HANDOFF.md). Web client ID stored in `.env` as `VITE_GOOGLE_WEB_CLIENT_ID`. Supabase Auth → URL Configuration → Redirect URLs still contains `hiitfitness://auth-callback` — **do not remove**, it is used for email confirmation and password reset flows.

### ✅ iOS permissions — all strings in place (2026-04-30)

Info.plist contains all required Apple privacy usage strings: camera, photo library, photo library save, location (when in use + always), microphone, HealthKit read + write. Push notifications entitlement set to `production`.

---

## Coming Soon Website — Full Build List (added 2026-06-01)

Everything needed to make the app match the promises on the coming soon website before public launch. Derived from a full audit of `HIIT Coming Soon.html` against the codebase and product spec.

### Website copy — changes that must happen regardless of engineering

These claims cannot be substantiated and must be updated on the website before it goes live:

- **Remove "DEXA-grade" / "millimeter-accurate 3D model" / "±2% accuracy vs DEXA"** — would require a DXA validation study. Replace with: *"AI body composition analysis, accurate to ±3–5% — comparable to skinfold calipers. Designed for tracking trends, not clinical measurement."*
- **Remove "Avatar morphs as your composition changes"** from the body scanner bullet list — months of 3D engineering, not a launch feature.
- **Remove "bar speed"** from the AI coach description — requires hardware velocity sensors, not possible on phone alone.
- **Remove "Trained on 500M+ real workouts"** stat — this is Gemini's training data, not a claim we can make.
- **Change "25M+ food database"** — Open Food Facts has ~3M products. Change to *"millions of foods"* or remove the number.
- **Remove Samsung Health from integrations** on the iOS version of the page — it's Android-only. Add it back with an "Android" label in the unified page.
- **Update platform copy** throughout — *"iPhone & Apple Watch"* → *"iPhone, Android & Apple Watch"*. Apple Watch remains iOS-only; add a small "iOS" badge to that integration tile.

---

### Owner actions — required before engineering can complete these items

| Action | Blocks |
|---|---|
| Create Google Play Console account (play.google.com/console, $25 one-time) | All Android publishing |
| Generate Android signing keystore; upload to Codemagic → Code Signing → Android | Android builds signing |
| Create Google Play service account in GCP; download JSON; add as `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` in Codemagic | Codemagic → Play Store publishing |
| Submit Health Connect privacy declaration in Play Console | Google Play distribution approval |
| In Google Cloud Console project `hiit-fitness-oauth`, add Android OAuth 2.0 client (needs SHA-1 from keystore) | Google sign-in on Android |
| Create Firebase project; register app with package name `com.hiitfitness.app`; download `google-services.json` | Push notifications on Android |
| Enable Family Sharing on the Pro subscription product in App Store Connect (one checkbox) | Family sharing on iOS — zero engineering needed |
| Apply to Garmin Connect Developer Program (developer.garmin.com/gc-developer-program) — approval ~2 days | Garmin integration |
| Apply to Google Health API (Restricted scope review via Google Cloud Console) — approval weeks, not days | Fitbit/Google Health integration |
| RevenueCat account + API key (already listed above — still open) | All subscription tiers |

---

### Engineering build list — pre-launch

**Android platform (new)**

| Feature | Effort | Notes |
|---|---|---|
| Google OAuth Android client ID | 1 day | Add `androidClientId` to `useAuth.tsx` once owner creates credential in GCP |
| FCM push notifications | 1–2 days | Current VAPID implementation is web push. Android Capacitor needs FCM. Add `google-services.json` to build, update Supabase push edge functions to send FCM tokens on Android |
| Samsung Health SDK | 1–3 weeks | Android-only. Register at developer.samsung.com/health. Exclusive data: Galaxy Watch BIA body composition (body fat %, skeletal muscle mass, body water). Some data types need additional Samsung approval |
| Android QA on device | Ongoing | No local `android/` folder — Codemagic scaffolds it per build. QA must be done via the internal Play Store testing track |

**Wearable integrations**

| Feature | Effort | Notes |
|---|---|---|
| Whoop API | 1–2 weeks | Self-service dev access at developer.whoop.com — no pre-approval gatekeeping. Brings Strain score (0–21), Recovery % (HRV + RHR + sleep + respiratory rate), and RMSSD HRV — none of which come through HealthKit |
| Garmin Connect API | 2–4 weeks | Push/webhook architecture — Garmin sends data to a Supabase Edge Function endpoint. Brings Body Battery (0–100), granular stress scores (0–100 with calm/balanced/stressful/very_stressful qualifiers), and epoch-level summaries not available in HealthKit. The "stress index" shown on the website is this Garmin stress score — only available once Garmin integration is live |
| Google Health API / Fitbit | 3–6 weeks | Apply immediately — Google's privacy review is the uncontrollable delay. Intraday HR (1-second), Active Zone Minutes, breathing rate. Note: legacy Fitbit Web API deprecated Sept 2026; target Google Health API directly |

**Nutrition**

| Feature | Effort | Notes |
|---|---|---|
| Restaurant menu scanner | 1 day | Extend existing Gemini food analysis edge function with `mode: 'menu-scan'`. Returns `dishes[]` array. UI adds a picker step before logging. UK 2022 calorie labelling law means printed calorie counts on chain menus are readable by vision model — improves accuracy |
| Micronutrient tracking | 2–3 days | Open Food Facts already returns vitamin/mineral data in `nutriments` — currently not captured. Add nullable JSONB `micros` column to `meal_logs`. Supplement with USDA FoodData Central API (free, no auth) for better coverage on staples. AI photo logs can estimate micros but accuracy is lower |
| AI meal plan completion | 2–3 days | `generate-meal-plan` edge function is scaffolded but incomplete. Finish generation flow to produce a full weekly plan |
| Weekly grocery list | 1–2 days | Extension of meal plan output — aggregate ingredients across the week's recipes, deduplicate quantities, return a structured list |
| Macro auto-adjustment to training load | 3–5 days | Cross-pillar logic: if today's scheduled workout is high-intensity, nutrition dashboard and Jarvis adjust calorie/protein targets upward. New signal into nutrition goals calculation |

**AI Fitness**

| Feature | Effort | Notes |
|---|---|---|
| RPE input per set | 1–2 days | Add RPE slider (1–10) to workout player set completion flow. Store in workout logs table |
| Progressive overload from previous session | 2–3 days | `generate-workout-plan` edge function currently ignores prior performance. Wire it to read the last session's actual weights/reps and suggest appropriate progression |
| Auto-deload when recovery trends down | 2–3 days | Before generating a plan, query `health_metrics` for 5–7 day HRV/sleep trend. If trending down, inject a deload week into the plan output |

**Health Monitor**

| Feature | Effort | Notes |
|---|---|---|
| Daily recovery score | 2–3 days | Synthesise day's HRV + sleep data into a 0–100 recovery score. Surface on home dashboard. Jarvis references it when suggesting today's workout intensity |
| Recovery score → informs tomorrow's plan | Included above | Same feature — recovery score feeds `generate-workout-plan` as an additional signal |
| Sleep stages | 1 day | HealthKit exposes Core, Deep, REM, Awake sleep stages. Read these in `useHealthSync`; add a `stages` column (JSONB) to `sleep_logs` |
| 90-day health export / clinician PDF | 3–4 days | Supabase edge function queries 90-day trend data, renders via pdfmake, streams PDF binary to Capacitor share sheet. Elite tier feature |

**Subscriptions & Tiers**

| Feature | Effort | Notes |
|---|---|---|
| RevenueCat wiring | 2 days | Owner must create RevenueCat account and supply API key. Already listed — still the blocker for everything below |
| Free tier gating | 1–2 days | Limit to 3 manual-entry-only workouts per week; gate AI adaptive programming and body scanner behind Pro |
| Elite tier definition and gating | 2–3 days | Define entitlement in RevenueCat. Gate: clinician PDFs, grocery lists, family sharing, AI meal planning behind Elite |
| Annual billing option | ½ day | RevenueCat product config only — no code changes |
| Family sharing (up to 5 accounts) | 15 min | Enable "Family Sharing" on the Pro subscription in App Store Connect. RevenueCat handles the rest automatically. Zero engineering |

**Body Scanner**

| Feature | Effort | Notes |
|---|---|---|
| Side-by-side progress comparison | ✅ Already built | `BodyScan.tsx` has `compareMode` and `previousScans` — done |

---

### Effort summary

| Category | Estimated engineering time |
|---|---|
| Android platform | 3–5 weeks |
| Wearable integrations (Whoop + Garmin + Google Health) | 6–12 weeks |
| Nutrition features | 2–3 weeks |
| AI fitness intelligence | 1–2 weeks |
| Health monitor features | 1–2 weeks |
| Subscriptions & tiers | 1–2 weeks |
| **Total** | **~14–26 weeks** |

The wide range is driven by the Google Health API review timeline (uncontrollable) and Samsung Health approval process. Whoop is the fastest wearable win — start there. Apply to Garmin and Google Health API this week; both have external review processes that run in parallel with other engineering.

---

## Resolved

### ✅ TODAY'S FOOD DIARY in Jarvis context (2026-06-01, A23 / edge function)

Jarvis now sees everything the user has eaten today — foods logged via the diary, barcode scanner, or meal scanner all appear as a structured context block in every ai-coach call. Jarvis answers "what have I eaten today?" from the live `meal_logs` query rather than reconstructing intake from chat history (which caused double-counting). Deleted entries are excluded. Running daily totals (cal / protein / carbs / fat) included. Edge-function-only change — no app rebuild needed.

### ✅ AI-generated workouts via Jarvis — v1.0 feature (2026-05-29, Build 109, 5F)

Jarvis can now generate a single custom workout or a multi-day plan on demand. Two new edge functions: `generate-ai-workout` (single session with full exercise detail) and `generate-ai-workout-plan` (multi-day, uses catalogue workouts as building blocks). AI workouts can be started immediately (GymTimer integration) or added to the schedule. Schema extended on `scheduled_workouts`, `workout_progress`, and `user_workout_plan_items` to hold inline exercise content alongside optional catalogue FK.

**Decided:** ship for v1.0, but the workout catalogue is hidden from all user surfaces (A1) — users can only get workouts via Jarvis or the schedule. Catalogue routes preserved for v2.

### ✅ Structured AI response architecture (2026-05-27, Builds 106–107, 5A–5C)

`ai-coach` edge function now supports a structured response branch (`X-Response-Format: structured-v1`) using tool calling. Emits typed SSE chunks (`{type: text | action | done}`) rather than regex markers. New `useAI` hook is the single source of truth for conversation state, streaming, history, and action dispatch. JarvisMode refactored to a pure UI surface over the hook (~500 lines deleted). Marker path remains for backwards compatibility.

### ✅ Jarvis workout and recipe recommendation cards (2026-05-14, Builds 80–83)

Phase 3–5: Jarvis feeds the workouts and recipes catalogues into its context, emits `[RECOMMEND_WORKOUT]` and `[RECOMMEND_RECIPE]` markers, and renders rich cards in chat (thumbnail / name / macros / duration / difficulty). Three-button actions: Start now / Add to schedule / Skip (workouts); View recipe / Log it / Skip (recipes). Every recommendation includes a named reason. Proactive workout suggestions on days with nothing scheduled.

### ✅ Personal best detection and share nudge (2026-05-14, Builds 84–87)

Three PB types: longest duration, biggest calorie burn, longest streak. Gold share card treatment on PB. 30-minute push reminder if user backgrounds the app without sharing. Auto-cancel if they share inside Jarvis first.

### ✅ Workout catalogue — owner-provided videos (2026-05-15)

The YouTube API approach is no longer needed. The owner is providing video files directly for each workout. Videos should be uploaded and their URLs added to the `video_url` column on the `workouts` table directly. The `scripts/populate_videos.py` script (YouTube auto-search) can be ignored.

### ✅ Explainable score breakdown
**Decided:** Yes — tapping the HIIT Score badge opens a bottom sheet showing the breakdown (workouts, streak, nutrition, sleep, intensity), raw input counts, and a "how is this calculated?" explainer.

**Rationale from owner:** "the more they are tracking the better."

**Implementation:** `src/components/home/HIITScoreBreakdownSheet.tsx`. Ships in commit TBD.

### ⏸ Mental-health / mindfulness signal
**Decided:** Defer. Owner likes the *concept* of rewarding good mood / frame of mind via the points system, but wants to wait for real user data to see whether mindfulness tracking is something users actually engage with before baking it into the HIIT Score formula. Revisit once there's retention and daily-check-in data to analyse.

### ⏸ Nightly pg_cron job
**Decided:** Defer. Owner wants to wait for trend-analysis data before deciding whether covering dormant users is worth the infrastructure cost. Client-side recompute remains sufficient while the active-user base is the focus. SQL remains ready in `supabase/manual_setup/pg_cron_hiit_score.sql` for future enablement.
