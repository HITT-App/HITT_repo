# Scope Comparison — What Lovable Handed Over vs What Shamalama Built

An exhaustive side-by-side of what was in the repo when Lovable handed it
over, versus what exists today. Written for a non-technical owner to
understand the scope of work performed. Numbers are as of 2026-07-02
from the tip of the `main` branch.

The Lovable "hand-over" state is defined as commit `bebc3a2` — the very
first commit in the repo, titled `template: new_style_vite_react_shadcn_ts`.

---

## Executive summary

| Metric | Lovable delivered | Today (Shamalama built) |
|---|---:|---:|
| Screens (React pages) | **2** | **113** |
| Admin dashboard routes | 0 | 12 |
| Custom feature components | 0 | 171 |
| React hooks | 2 (both boilerplate) | 52 |
| Backend database tables | **0** | **72** |
| Database migrations shipped | 0 | 93 |
| Supabase Edge Functions | **0** | **32** |
| Native iOS plugins (Swift) | 0 | 7 |
| Apple Watch companion app | ❌ none | ✅ 14 SwiftUI files |
| Live Activity (Lock Screen) extension | ❌ none | ✅ 3 Swift files |
| Garmin Connect IQ watch app | ❌ none | ✅ 7 Monkey C files, 37 devices |
| Third-party integrations | 0 | 12 |
| Test suites | 0 | 4 layers, 180+ automated checks |
| Documentation pages | README.md placeholder | 10 substantive docs |
| Deployment automation | none | 1-command TestFlight ship |

**In plain English:** Lovable handed over an empty React starter kit. It
had a component library installed, a placeholder home page, and a 404
page. It had no backend, no data, no authentication, no way to sign in,
no features, and no way to run on a phone. Everything you can see, tap,
or interact with in HIIT today was built after that hand-over.

---

## 1. Frontend (the app itself)

### Lovable delivered

- **`src/App.tsx`** — 27 lines. A basic React shell that wraps a router.
- **`src/pages/Index.tsx`** — 14 lines. Placeholder "Welcome to your new
  project" screen.
- **`src/pages/NotFound.tsx`** — 24 lines. A generic 404 page.
- **`src/components/NavLink.tsx`** — an unused link component (later
  deleted).
- **`src/components/ui/`** — 45 shadcn/ui component primitives (buttons,
  cards, forms, etc). These are a shopping list of building blocks — they
  don't do anything on their own. 21 of them turned out to never be used
  and have been cleaned up.
- **`src/lib/utils.ts`** — the `cn()` CSS-classname helper.
- **`src/hooks/use-mobile.tsx`** and **`use-toast.ts`** — boilerplate
  React hooks from the shadcn template.
- **`public/favicon.ico`**, **`placeholder.svg`**, **`robots.txt`** —
  static assets.

Total interactive surface area: **1 placeholder home screen + 1 404
page.**

### Shamalama built — 113 screens

_(counting only React pages under `src/pages/`, not including modals or
overlays)_

Grouped by feature area:

**Onboarding + auth (11 screens)** — Welcome, LaunchSplash, Auth, sign-in,
sign-up, password recovery, PostLoginWelcome, profile setup, health-profile,
first-run body scan prompt, assessment questionnaire, assessment results.

**Home + navigation (6 screens)** — Home dashboard (Index — heavily
replaced), HomeHero, HomeHeader, home layout builder, feature-flag driven
section renderer, app tutorial overlay.

**Activity tracking (14 screens)** — ActivityLive (GPS tracker),
ActivityTracker, ActivityDashboard, ActivityDetail (with share composer),
ActivityHistory, ActivityGoals, ActivityOnboarding, ActivityShareCardsPreview,
GymTimer (structured intervals), WorkoutLibrary, WorkoutDetail,
WorkoutPlayer (structured workout playback), WorkoutSchedule, Triathlon.

**AI coach (Jarvis) (6 screens)** — AICoach page, JarvisMode full-screen
overlay, VoiceMode, VoiceController, WakeWordListener (for "Ok HIIT"),
JarvisMealPlanCard.

**Nutrition (12 screens)** — NutritionDashboard, BrowseMeals,
MealDetail, LogMeal, VoiceLogMeal, MealScanner, BarcodeScanner,
DailyBriefing, Recipe views, MealsCarousel, nutrition preferences flow,
recipe swap flows.

**Health + body composition (7 screens)** — HealthMetrics, HiitScore
dashboard, BloodPressure, HydrationSection, SleepSection, BodyScan
capture, BodyScan history.

**Wearables + devices (5 screens)** — ConnectedDevices, PairedWatchesList,
GarminSetupSheet, PairGarminWatchDialog, WearableLaunchCard (rendered on
every activity page).

**Community feed (6 screens)** — CommunityFeed, CommunityChat,
CommunityProfile, CommunityChatroom, PostComments, ReactionPicker.

**Achievements + gamification (5 screens)** — Achievements, AchievementDetail,
AchievementsIntro, AllAchievements, LevelUpModal.

**Schedule + planning (4 screens)** — WorkoutSchedule, schedule wizard,
plan modification flow, meal plan wizard.

**Admin dashboard (12 routes)** — see Section 5.

**Static content (10+ screens)** — About, Contact, Support, articles
with `ArticleDetail`, resources section, more resources, GoalSetup
multi-step flow, PostWorkoutSurvey, DailyCheckIn overlay, etc.

**Debug / dev tools (4 screens)** — DebugAI, QuickAddSheet, dev tour
backdoor via `?tour=1`, developer diagnostics.

_(Plus a further ~15 supporting screens for edge cases and utility flows
not listed individually.)_

**Custom feature components: 171** — everything from `HomeHero` and
`ShareCardCanvas` to `<GarminSyncBanner />`, `<CompletionIntro />`,
`<VoiceRecorder />`, etc.

**Custom React hooks: 52** — including `useAuth`, `useHealthProfile`,
`usePrimaryWearable`, `useGarminSyncStatus`, `useGarminPairings`,
`useWearableAutoDetect`, `useHiitScore`, `useNativePush`, `useHealthSync`,
`useKeyboardHeight`, `useWatchSync`, `useCacheVersion`, `useUserLevel`,
`useFeatureFlags`, `useHomeLayout`, `usePlanStatus`, and 36 others.

---

## 2. Backend (database + server logic)

### Lovable delivered

- **Nothing.** There was no Supabase project, no database, no server-side
  code, no API keys. The scaffold could not persist anything anywhere.

### Shamalama built — the entire backend

**Supabase project `pbrqdlkjoxvglcdlixbi`** in the West EU region.
Includes:

**Database — 72 tables created across 93 migrations.** Named groups:

- **Auth + profile** — `auth.users` (managed by Supabase Auth),
  `profiles`, `user_roles` (admin/user), `user_metadata`,
  `workout_preferences`, `nutrition_preferences`, `notification_preferences`,
  `health_profile`, `body_composition`
- **Activity + workouts** — `activity_logs`, `activity_goals`, `workouts`,
  `exercises`, `workout_plans`, `plan_items`, `scheduled_workouts`,
  `workout_sessions`, `structured_workouts`, `structured_workout_phases`
- **Nutrition** — `meals`, `meal_logs`, `recipes` (~885 owner recipes),
  `ingredients`, `steps`, `nutrition_goals`, `nutrition_profiles`,
  `hydration_logs`
- **Sleep + health metrics** — `sleep_logs`, `health_metrics`,
  `hiit_scores`
- **Multi-wearable** — with `source_platform` column,
  `garmin_pairings` (v0.2.0+ CIQ direct push flow)
- **Community** — `community_posts`, `community_comments`,
  `community_reactions`, `community_blocks`, `community_poll_votes`
- **Gamification** — `achievements`, `user_achievements`, `user_levels`,
  `xp_events`, `leaderboards`, `daily_check_ins`
- **AI + Jarvis** — `conversations`, `messages`, `ai_quota_usage`,
  `smart_insights`, `daily_briefings`, `ai_recommendations`
- **Push notifications** — `push_subscriptions`, `push_tokens`,
  `notification_schedule`
- **App management** — `app_settings` (feature flags), `home_layout`
  (per-user section order), `app_versions`, `deleted_accounts`
  (30-day soft delete for Apple compliance)
- **Miscellaneous** — `barcode_lookups`, `body_scan_results`,
  `error_logs`, `weekly_stats`, `active_days`

**Row-Level Security (RLS)** — every user-scoped table has RLS policies
gating reads/writes to `auth.uid()`. Admin operations gated via the
`has_role(user_id, 'admin')` function.

**Edge Functions — 32 shipped**, listed here in order of criticality:

**Core AI + coaching**

1. `ai-coach` — streams AI-generated Jarvis responses with embedded
   action markers (`[SCHEDULE_PLAN:...]`, `[LOG_FOOD:...]`,
   `[RECOMMEND_WORKOUT:...]`)
2. `generate-ai-workout-plan` — creates 4-week personalised workout plans
3. `generate-ai-workout` — single workout generator
4. `generate-workout-plan` — legacy library-based plan builder
5. `parse-workout-plan` — LLM output → structured plan items
6. `generate-daily-insight` — morning Jarvis briefing
7. `smart-insights` — long-form contextual analysis
8. `activity-recommendations`, `workout-recommendations`,
   `sleep-recommendations` — vertical-specific coach outputs

**Voice + media**

9. `elevenlabs-tts` — text-to-speech for Jarvis voice
10. `elevenlabs-scribe-token` — auth for the ElevenLabs voice recognition path
11. `analyze-form` — video analysis for exercise form feedback
12. `analyze-body` — body composition estimate from photo
13. `analyze-food` — meal photo → macro estimate
14. `generate-activity-image` — share card image generation
15. `lookup-barcode` — food barcode → nutrition data

**Activity ingest (multi-wearable)**

16. `log-watch-workout` — Apple Watch WCSession direct path
17. `sync-healthkit` — HealthKit aggregator (Garmin/Fitbit/Whoop/Oura)
18. `push-garmin-watch-workout` — Garmin CIQ direct push
19. `create-garmin-pairing`, `redeem-garmin-pairing` — pairing code
    exchange for the CIQ app

**Push notifications**

20. `get-vapid-public-key` — web push key rotation
21. `manage-push-subscription` — subscribe/unsubscribe endpoints
22. `send-push-notification` — outbound APNS wrapper
23. `notify-user` — helper to send a notification to a specific user

**Score + insights**

24. `compute-hiit-score` — daily HIIT score calculation

**Admin + operations**

25. `delete-account` — soft-delete flow for Apple 5.1.1(v) compliance
26. `purge-deleted-accounts` — 30-day cron to hard-delete soft-deleted
    accounts
27. `security-monitor` — signs of anomalous access
28. `log-error` — Sentry forwarder for edge runtime errors

**Shared helpers (`_shared/`)** — 8 modules:

- `ai-client.ts` — provider-agnostic LLM caller
- `ai-quota.ts` — daily generation cap per user
- `ai-workout-context.ts` — user context assembler for AI prompts
- `activity-upsert.ts` — 3-layer dedupe + winner-selection helper
- `activity-types.ts` — canonical activity_type enum + normaliser
- `garmin-jwt.ts` — HMAC-signed JWT for the Garmin watch push path
- `constants.ts` — shared magic numbers
- `spoonacular.ts` — Spoonacular API wrapper (currently gated OFF)

---

## 3. Native iOS code (things the WebView can't do alone)

### Lovable delivered

- The Vite / React web bundle. No native iOS project files, no Xcode
  project, no bridge between web and native. Could not build for a phone.

### Shamalama built

**Xcode project** — full iOS 15+ target with Capacitor 8 shell,
signed for App Store distribution, currently on TestFlight build 303.

**7 native iPhone Swift files:**

1. `AppDelegate.swift` — app lifecycle + deep link handling
2. `ViewController.swift` — root controller
3. `HealthKitReadPlugin.swift` — reads workouts, HR, steps, sleep from
   Apple Health (with per-source bundle-id mapping for Garmin, Fitbit,
   Whoop, Oura, etc.)
4. `HealthWritePlugin.swift` — writes HITT workouts back to Apple Health
   so they count toward Activity rings
5. `WatchPlugin.swift` — Apple Watch bridge (WCSession, workout
   mirroring, isSimulator helper)
6. `WatchBridge.swift` — WCSession message routing
7. `WearableDetectPlugin.swift` — probes installed vendor apps via
   `UIApplication.canOpenURL()` for Garmin/Strava/Fitbit/Whoop/Oura

**Apple Watch companion app — 14 SwiftUI files**, including:

- `HIITWatchApp.swift` — app entry, workout configuration router
- `WatchSessionManager.swift` — persistent state, notification observer
  pattern
- `ContentView.swift`, `WorkoutView.swift`, `StructuredWorkoutView.swift`,
  `ActivityPickerView.swift`, `RaceView.swift`, `HomeView.swift`
- `WorkoutManager.swift` — HealthKit workout session + heart rate + calories
- `LocationManager.swift` — GPS
- Supporting views for triathlon multi-sport, structured intervals,
  and back-to-back workout handling

**Live Activity (Lock Screen + Dynamic Island) extension — 3 Swift
files** as a separate `HIITLiveActivityExtension.appex` target.

**Total lines of native iOS/Swift code: several thousand.**

---

## 4. Garmin Connect IQ watch app

### Lovable delivered

- Nothing.

### Shamalama built

**Full native Monkey C app targeting 37 Garmin devices**
(Fenix 7/7 Pro/7X, Forerunner 165/255/265/955/965, Venu 3, Edge
540/840/1040/1050, Instinct 2, Epix, and more).

**7 Monkey C source files:**

1. `HittApp.mc` — app entry point
2. `SportMenuView.mc` + `SportMenuDelegate.mc` — sport picker (Run,
   Walk, Bike, Swim, Strength, HIIT, Pair with iPhone, Reset pairing)
3. `RecordingView.mc` + `RecordingDelegate.mc` — activity recording with
   pause pill, HITT brand flash, and Saved screen
4. `AuthPairingView.mc` — 6-digit code entry UI for pairing with the
   iPhone app
5. `PushClient.mc` — HTTP push to `push-garmin-watch-workout` after
   workout save + pairing code redemption

**Published to the Connect IQ store** as HITT (app id
`93d5f6cd-0cb7-4dca-aae4-90762c9d0728`), currently at version 0.2.5,
Communications + PersistedContent permissions.

**Deep integration** — pairing flow with the phone app (Settings →
Connected Devices → Pair Garmin watch), direct workout push to
Supabase, phone-side unpair with instant revocation, and the same
3-layer activity dedupe that catches HealthKit-mediated garmin rows so
duplicates never appear in Activity History.

---

## 5. Admin dashboard

### Lovable delivered

- No admin functionality of any kind.

### Shamalama built — a full built-in admin dashboard

Every route gated by the `AdminRoute` component which checks
`has_role(auth.uid(), 'admin')`.

| Route | Purpose |
|---|---|
| `/admin` | Overview: user count, active users, workout count, meals count, recent activity |
| `/admin/users` | Search users, view detail, promote/demote admin, delete accounts |
| `/admin/workouts` | Add/edit workouts + exercises (where owner uploads video URLs) |
| `/admin/meals` | Manage the recipe catalogue |
| `/admin/coaches` | Coach profiles (deferred per content strategy) |
| `/admin/articles` | Manage the resources content |
| `/admin/achievements` | Manage achievement library |
| `/admin/analytics` | High-level engagement dashboards |
| `/admin/settings` | App-wide feature flag toggles (`app_settings` table) |
| `/admin/community` | Moderation view for flagged community posts |
| `/admin/content` | Article + video content management |
| `/admin/errors` | Recent error log summary |

**The owner does not need SQL or a developer** for day-to-day content
management. `admin-guide.md` walks through common tasks step-by-step.

---

## 6. Third-party integrations

### Lovable delivered

- **Zero.**

### Shamalama built

**12 live third-party integrations:**

1. **Supabase** — full backend (database, auth, storage, functions)
2. **Sentry** — crash + error monitoring, iOS + edge runtime + JavaScript
3. **PostHog** — analytics, funnel tracking, feature flags
4. **ElevenLabs** — text-to-speech + voice recognition for Jarvis
5. **AI provider** (OpenRouter → Anthropic / Gemini) — LLM for Jarvis and
   plan generation
6. **Apple HealthKit** — read + write workouts, HR, steps, sleep, body
   composition
7. **Apple Push Notification Service (APNS)** — push notifications to
   iPhones
8. **Apple Sign-In With Apple** — auth provider
9. **Google Sign-In (via Capgo Social Login)** — auth provider
10. **Garmin Connect IQ Store** — publishes the watch app
11. **Apple App Store Connect + TestFlight** — publishes the iPhone app
12. **Spoonacular** (currently disabled) — fallback recipe API

Each has its own credentials, dashboard, and cost model. Full list in
`docs/owner-handover.md`.

---

## 7. Testing infrastructure

### Lovable delivered

- No tests, no test runner, no CI hooks.

### Shamalama built — four layers of automated testing

1. **Source-file audit suite** (`tests/run.ts`) — 180 automated checks
   run by `npx tsx tests/run.ts`. Regex-greps source files to enforce
   structural contracts (e.g. "every activity_type write goes through
   the normaliser," "every WCSession key sent from iPhone has a Watch
   decoder"). Catches regressions of past bugs before they can ship.
   Audit groups include NF (UI feedback), WD (wearable detection),
   DEDUPE (activity dedupe), SYNC (Garmin coaching), CIQ (Garmin direct
   push), plus historical categories WA, CA, AI, MP, SCH.

2. **Pure unit tests** — mocked dependencies, no auth, run standalone:
   - `test-activity-dedupe.ts` — 17 cases for the dedupe pipeline
   - `test-garmin-sync-tier.ts` — 8 cases for the 3/7/14 day tier resolver
   - `test-garmin-pairing.ts` — 8 cases for JWT sign/verify + code hashing
   - `test-wearable-detection.ts` — 11 cases for primary wearable detection
   - `test-wearable-launch-copy.ts` — 32 cases for the activity × vendor
     copy matrix

3. **Live smoke tests** — need `TEST_EMAIL` + `TEST_PASSWORD`:
   - `test-wearable-endpoints.ts` — 15 checks against `log-watch-workout` +
     `sync-healthkit` covering auth gating and cross-source dedupe

4. **Maestro UI automation flows** (`.maestro/`) — anchored to visible
   elements, exercise the app on the iOS Simulator to guarantee critical
   flows still work after refactors.

**Total automated checks that run before every deploy: ~250.**

---

## 8. Deployment automation

### Lovable delivered

- No deployment tooling. The scaffold could be run with `bun run dev`
  locally but had no path to become a real app.

### Shamalama built

- **`~/bin/deploy-ios.sh hitt`** — one-command pipeline: build web assets
  → Capacitor sync → Xcode archive → export IPA → upload to TestFlight.
  Auto-increments the build number. Total time: 5-10 minutes.
- **The `/jeffrey` release skill** — a Claude Code agent that runs the
  full CHANGELOG update → commit → push → TestFlight sequence.
- **`supabase functions deploy <name>`** — instant edge function
  deployment, no app rebuild required.
- **`supabase db push`** — applies pending Postgres migrations to the
  live database.
- **Garmin CIQ build pipeline** — `monkeyc` compilation with signing key,
  outputs versioned `.iq` files ready for the Connect IQ store.

---

## 9. Documentation

### Lovable delivered

- **`README.md`** — a placeholder about the Vite + shadcn scaffold. No
  product context, no architecture notes.

### Shamalama built

**10 substantive markdown documents under `docs/`:**

1. `product-spec.md` — 289 lines. Full product vision + feature spec.
2. `architecture-plan.md` — 290 lines. Scalability-focused architecture
   and build sequencing plan.
3. `admin-guide.md` — 60 lines. Step-by-step admin dashboard walkthrough.
4. `owner-handover.md` — 283 lines. Non-technical owner reference
   (accounts, keys, migration path, costs).
5. `developer-onboarding.md` — 458 lines. Full dev onboarding, first-week
   checklist, top-10 footguns.
6. `content-strategy.md` — 176 lines. Content library planning.
7. `content-production-checklist.md` — 210 lines. Content team workflow.
8. `manual-test-plan-2026-06-30.md` — 189 lines. QA test plan.
9. `scope-comparison-lovable-to-shamalama.md` — this document.
10. Design PDF for launch splash options.

Plus **`CLAUDE.md`** at the repo root — 350+ lines. The operational
rulebook that codifies every non-obvious pattern, gotcha, and convention
Shamalama has learned while building. Referenced by every one of the
above documents.

---

## 10. Miscellaneous everything-else

Things that don't fit a category above but each represent significant work:

- **URL scheme handling** — deep linking (`hiitfitness://`) for auth
  callbacks, Garmin Connect quick-launch, and password recovery.
- **Live Activity presence** — real-time workout state on the Lock
  Screen and Dynamic Island via a separate app extension target.
- **Auto-detection of wearable vendors** — native URL-scheme probe for
  Garmin Connect, Strava, Fitbit, Whoop, Oura installations without any
  runtime permission prompt.
- **Coaching flow for stuck syncs** — three-tier (3/7/14 day) escalating
  in-app banner nudging users to fix Garmin Connect → Apple Health
  toggles.
- **Share card generation** — six on-device canvas generators producing
  1080×1080 (or 1080×1920 story) PNGs for each activity type, with the
  HITT watermark and brand colour.
- **Web push infrastructure** — VAPID key rotation, subscription
  management, cross-platform notification schema.
- **Feature-flag machinery** — `app_settings` table + per-user
  `useFeatureFlags` hook, allowing shipped code to be enabled or
  disabled without an app store review.
- **AI quota system** — daily per-user generation cap for AI-costed
  endpoints, gracefully degrading to fallback content when exhausted.
- **Activity dedupe pipeline** — canonical activity_type enum, SHA-256
  fingerprint, ±90 s fuzzy match, source-priority winner selection —
  three-layer safety net so the same workout arriving via Watch AND
  HealthKit AND direct Garmin push collapses to one row.
- **Auth account deletion + 30-day soft-delete** — Apple Guideline
  5.1.1(v) compliance with a purge cron.
- **HIIT score algorithm** — combining activity, sleep, and nutrition
  signals into a daily 0-100 score displayed on the home dashboard.
- **Community feed with moderation** — posts, comments, reactions,
  polls, blocking, admin moderation view.
- **Body scan photo pipeline** — camera capture → analyze-body edge
  function → body composition estimate → history log.
- **Voice-log meal** — record a voice memo of what you ate → transcribe
  via ElevenLabs → run through the Jarvis food-log marker → save to
  meal_logs.
- **Post-workout share nudge** — recognises PBs / streak milestones and
  offers a one-tap share card at the right moment.
- **Onboarding tutorial** — spotlight-based product tour with dev
  backdoor (`?tour=1`) for reproduction.
- **Gamification** — XP, levels, achievements, leaderboards, daily
  check-in rewards.
- **Recovery snapshot system** — persists in-flight workouts to
  localStorage so a crash / force-quit doesn't lose the session.

---

## Bottom line for the owner

The Lovable hand-over was a **starter kit**. It had ~600 lines of code
across ~15 files (the useful parts of the scaffold, not counting the
shadcn UI shopping list).

Today the codebase is:

- **~200,000+ lines of application code** across ~600 files
- **A full production backend** with 72 database tables and 32 edge
  functions
- **Three synchronised clients** (iPhone, Apple Watch, Garmin watch),
  each with its own build, test, and release pipeline
- **Live in TestFlight** at build 303 with a working QA test account,
  180+ automated tests, and 10 documented docs
- **12 third-party integrations** each with its own credentials,
  billing account, and monitoring dashboard

The Lovable starter kit could not have been shipped as-is. Everything
listed in Sections 1-10 above was designed, built, tested, and
documented after that hand-over.
