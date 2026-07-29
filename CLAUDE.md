# HITT App — Claude Code Rules

Capacitor 8 + React 18 + TypeScript iOS + Android app. Supabase backend. Apple Watch companion (SwiftUI/watchOS). Android platform added 2026-07-06 (see docs/scope-google-play-launch.md).

## Deploy

```bash
~/bin/deploy-ios.sh hitt        # web build → cap sync → xcodebuild → TestFlight
~/bin/deploy-android.sh hitt    # web build → cap sync → gradle bundleRelease → prints AAB path for manual Play upload
git push origin main             # always push before deploying
```

- **iOS build number** auto-increments inside deploy-ios.sh. Watch build number matches the iOS app.
- **Android versionCode** auto-increments inside deploy-android.sh (edits `android/app/build.gradle`).
- **Android release signing** — deploy-android.sh reads the keystore password from macOS Keychain (service name `hitt-android-keystore`). Prompts + offers to save on first run. Keystore lives at `~/hitt-keys/hitt-upload-key.jks` (outside repo, alias `hitt-upload`). Google holds the app signing key via Play App Signing; we only manage the upload key.
- **Android Gradle uses JDK 21** (pinned in `android/gradle.properties`). System default stays openjdk@17 so Maestro keeps working.
- **AAB upload is manual for now** — deploy-android.sh opens Finder at the AAB, then you upload via Play Console → Internal testing → Create new release. Wire in the Play Developer API when we've done this a few times.

### iOS signing — app transferred to Casey's account (2026-07-11)

The App Store app + Apple Developer ownership were **transferred to Casey's account (team `5933246NY5`)**. This is baked into the repo/deploy:

- **All 3 targets (App, Watch, Live Activity) use Automatic signing** under team `5933246NY5`. The old manual named profiles ("HIIT App/Watch/LiveActivity Distribution Manual", team 9VH3JDWRMF) are gone — do NOT reintroduce them. Release configs sign as **"Apple Development"** (automatic swaps to distribution at archive/export).
- **deploy-ios.sh has a per-project override** (keyed on `hitt`): Casey's `TEAM_ID=5933246NY5`, `ASC_KEY_ID=W49C5L34UA`, issuer `63b081ef-…`; every other app keeps Vanessa's `FWYNXS9TG6`/`9VH3JDWRMF`.
- **The archive uses the Xcode account session, NOT the API key.** Casey's Apple ID must be signed into Xcode → Settings → Accounts. (API-key `-allowProvisioningUpdates` forced *development* profiles needing devices and failed with "Authentication failed"; the account session does device-free distribution correctly.) The API key is still used for `-exportArchive` + altool upload.
- **One-time transfer gotchas** (already done, documented for the next transfer): the app transfer moved `com.hiitfitness.app` but **left the child identifiers behind** in Vanessa's account — the Watch + Live Activity **bundle IDs** and the **App Group `group.com.hiitfitness.app.liveactivity`** had to be deleted from her account so Xcode could recreate them under Casey's. Also **≥1 device must be registered** in Casey's account (archive builds dev profiles first). The `com.hiitfitness.signin` Services ID is not needed for the build.
- **ITMS-90076 keychain warning** on the first post-transfer build is **benign + one-time** (team-prefix change). HIIT keeps its auth session in `localStorage` (not the keychain) and uses no secure-storage plugin, so users stay logged in. Ignore it.

## Discord

**Never print responses to the terminal — they don't reach the user.**
Always use the Discord reply tool: `mcp__plugin_discord_discord__reply` with `chat_id`.

## Project structure

```
src/
  components/coach/JarvisMode.tsx     # AI coach full-screen overlay — the central feature
  components/coach/VoiceController.tsx # wake word + opens JarvisMode
  components/workout/ShareCardCanvas.ts # 7 share card generators (incl. triathlon)
  components/wearable/WearableLaunchCard.tsx  # vendor-aware launch UI (all 4 activity types)
  pages/                              # one file per screen
  hooks/usePrimaryWearable.ts         # React Query + localStorage-cached wearable detection
  lib/pending-share.ts                # external-share record (localStorage + IndexedDB) → feed prompt
  components/share/ShareToFeedPrompt.tsx  # restores route on return, offers a feed post
  lib/native-gps.ts                   # Capacitor GPS abstraction
  lib/gps-filter.ts                   # Kalman filter for GPS smoothing
  lib/wearable-detection.ts           # pure getPrimaryWearable(supabase, userId) function
  lib/wearable-launch-copy.ts         # activity × wearable copy matrix
  lib/healthkit-sync.ts               # foreground HealthKit → Supabase syncer
  lib/live-activity.ts                # Live Activity wrapper (skips on iOS Simulator)
  plugins/HealthKitReadPlugin.ts      # native HealthKit read bridge
  plugins/WatchPlugin.ts              # iPhone ↔ Watch bridge + isSimulator helper
supabase/functions/
  ai-coach/          # streams responses, reads markers from AI output
  generate-workout-plan/  # AI picks workouts from library; returns { items: [...] }
  elevenlabs-tts/    # text-to-speech
  log-watch-workout/ # Watch direct WCSession path → activity_logs
  sync-healthkit/    # HealthKit aggregator → activity_logs / health_metrics / sleep_logs
  _shared/activity-upsert.ts  # shared upsert helper with 3-layer dedupe (see below)
  _shared/activity-types.ts   # canonical activity_type enum + SOURCE_PRIORITY table
ios/App/
  App/                          # iPhone Capacitor host + native plugins
    HealthKitReadPlugin.swift   # workouts / HR / steps / sleep reads
    WatchPlugin.swift           # mirroring + isSimulator + Watch bridge
  HIITWatch Watch App/          # watchOS companion (SwiftUI)
  HIITLiveActivity/             # Lock Screen + Dynamic Island widget extension
tests/
  run.ts                            # main audit runner (~119 tests)
  test-wearable-detection.ts        # pure unit tests for getPrimaryWearable (mocked supabase)
  test-wearable-launch-copy.ts      # unit tests for activity × wearable copy matrix
  test-wearable-endpoints.ts        # live smoke tests for log-watch-workout + sync-healthkit
  test-workout-duration.ts          # session-duration model; mirrors WorkoutPlayer constants
  smoke-like-notification.ts        # splits like → in-app row → device push, to isolate failures
scripts/
  recipe-nutrition/                 # recipe macros derived from ingredients; USDA-reconciled
  gen-splash.py                     # regenerates all 14 launch splashes from the app icon
.maestro/                       # UI automation flows (see Maestro section below)
```

## Jarvis — action markers

The AI embeds silent markers in its response text. `parseAIResponse()` in `JarvisMode.tsx` strips them
from display and triggers app behaviour. The exact regex patterns:

```typescript
/\[SCHEDULE_PLAN:({.*?})\]/s   // → shows confirm card → createScheduleFromJarvis()
/\[LOG_FOOD:({.*?})\]/gs       // → inserts into meal_logs immediately
/\[BODY_SCAN_PROMPT\]/          // → shows "Open Body Scan" CTA card
// Phase 4 (Build 72):
/\[RECOMMEND_WORKOUT:({.*?})\]/s  // → renders rich workout card → Start now / Add to schedule / Skip
/\[RECOMMEND_RECIPE:({.*?})\]/s   // → renders rich recipe card → View recipe (/meal/:id) / Log it / Skip
```

SCHEDULE_PLAN JSON shape: `{"goal":"fat loss","daysPerWeek":3,"selectedDays":[1,3,5],"sessionMinutes":30}`
- selectedDays: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
- goal must be one of: "fat loss" | "muscle gain" | "endurance" | "general fitness" | "strength"

After schedule is created, `createScheduleFromJarvis` navigates to `/schedule` automatically.

## AI coach meal flow — converse-first + informed-autonomy safety gate

Decided 2026-07-05 (edge-only, deployed; no rebuild). All logic lives in
`supabase/functions/ai-coach/index.ts`. Two hard invariants:

1. **The LLM never generates a meal plan itself.** Meal plans come ONLY from the wizard →
   food database (`fetchOwnerMealPlan` / Spoonacular) → server-emitted `recommend_meal_plan`
   action. `recommend_meal_plan` is NOT a callable tool — the LLM only ever calls
   `open_meal_plan_wizard`. This is deliberate: it removed the old "spinning / dropped
   request" failure where Gemini wavered between calling a tool and writing meals inline.
   Do not re-add meal generation to the LLM's tools.
2. **Converse first, then offer the wizard.** The coach discusses targets/approach in words,
   then calls `open_meal_plan_wizard` in the same turn so the builder card renders *below*
   the message (not a bare popup). The prompt must NOT say "output only the tool call, no text".

**Deterministic wizard backstop** (`buildStructuredStream`): if the user clearly asked for a
plan (`mealPlanExpected`, conversation-scoped over the last 3 user turns) but the model coached
without attaching the wizard, the server appends the `open_meal_plan_wizard` action so the
builder button never silently drops. Suppressed by `suppressMealWizard` (see below).

**Four-state gate for explicit-number meal requests** (priority top-down):
1. **safety-hold** — ED / self-harm keywords in last ~6 user turns → no plan, no wizard, no
   fast-path; supportive reply. Sets `suppressMealWizard` (strips any wizard the LLM emits).
2. **context-hold** — explicit `< 1200 kcal` (`CALORIE_FLOOR`) with no fasting/medical reason
   in the conversation → don't serve, don't open wizard; coach asks ONE context question.
3. **serve** — explicit numbers, `≥ 1200` OR `< 1200` *with* a sensible reason
   (fasting/5:2/OMAD/supervised) → fast-path serves; sub-floor gets a caveat lead-in via
   `sseTextThenAction`.
4. **converse + offer** — vague request → coach + wizard (backstop armed).

`extractExplicitMealTargets` gates the whole cascade — it MUST parse the calorie phrasing or
every state is bypassed. Unit-relevant: it matches `cal|cals|calorie|calories|kcal|kcals`
(the singular "calorie" was a real bug — "500 calorie meal plan" silently skipped the gate).

Live smoke test: `tests/smoke-meal-safety.ts` (5 cases, needs QA `TEST_EMAIL`/`TEST_PASSWORD`).
Full decision record + deferred Phase-2 work: `docs/scope-conversational-wizards.md`.
ED handling is currently a keyword suppressor only — deeper detection + crisis resources is a
tracked follow-up.

## AI coach — user data must be in the "memory recall" turn, not just a system block

Gemini **deflects user-specific data** ("I don't have access… check the app") when the value only
appears in an injected **system** message. `ai-coach` defeats this for goal / activities / diet /
body-scan by ALSO pushing the value into a synthetic **assistant** turn at position 1
(`memoryParts` → `userMemoryTurn`) that the model treats as its own recall, not as cautious
injected data. **When you add a new user-data field the coach must state on request, push it into
`memoryParts` — not only `userMD`.** (2026-07-11: the body-fat % from `body_scans` was only in
`userMD`, so the coach denied having it despite the value being in the prompt. Fix added it to the
recall turn. Regression test: `tests/smoke-body-scan-prompt.ts`.)

## Community content reporting (App Store Guideline 1.2)

UGC surfaces — posts, comments, stories, DMs, chatroom messages, profiles — each have a **Report**
action wired to the shared `src/components/community/ReportSheet.tsx` (reason picker) →
`useReports()` in `useCommunityExtras.ts` → `content_reports` table (RLS: reporter inserts/reads/
retracts own; admin/moderator via `has_role` reads + updates all).

- **Auto-hide**: an `AFTER INSERT` trigger (`auto_hide_reported_content`) sets `moderation_hidden = true`
  on the content once **≥3 distinct users** report the same item. List queries in `useCommunity.ts`
  (posts, comments) and `useStories.ts` filter `moderation_hidden = false`.
- **Moderation queue**: Admin → Community → **Reports** tab (`pages/admin/AdminCommunity.tsx`) —
  staff **Remove** (hides content) or **Dismiss**; actions logged to `moderation_logs`.
- **notify-report** edge function emails `casey@hiituk.com` per report (reuses analytics-digest SMTP
  secrets). Blocking (`useBlockedUsers`) + the Community Guidelines onboarding pre-date this.
- The complete Guideline 1.2 toolkit is now: filter/auto-hide + report + block + published contact +
  guidelines + moderation queue. Smoke test: `tests/smoke-content-reports.ts` (the 3-reporter
  auto-hide needs 3 users / service role — verify manually).

## Sticky header pattern (Build 71)

Every scrollable page must use this exact pattern on its header element:

```tsx
<header
  className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center ... px-4 py-3"
  style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
>
```

**Never use ScrollArea to wrap an entire page** — it breaks sticky positioning and adds unnecessary overhead.
Native browser scroll is better for Capacitor on iOS.

Pages confirmed with sticky headers: WorkoutDetail, WorkoutSchedule, ChatSettings, HealthMetrics,
NutritionDashboard, WorkoutLibrary, Profile, BodyScan.

## Android 15 edge-to-edge — do NOT re-add the deprecated StatusBar calls

Android 15 (target SDK 35+) forces every app edge-to-edge — system bars are transparent and the
WebView draws underneath them. HITT targets SDK 36. Layout is handled by:

1. **`MainActivity.java` calls `androidx.activity.EdgeToEdge.enable(this)`** in `onCreate()` — the
   backward-compat path Google explicitly recommends. Do not remove.
2. **`src/lib/native.ts` does NOT call `StatusBar.setOverlaysWebView` or `StatusBar.setBackgroundColor`
   on Android.** Both plugin methods wrap `Window.setStatusBarColor()` / `setDecorFitsSystemWindows()`
   which are deprecated in SDK 35. Play Console's pre-launch scan flags every use. `setStyle` is fine
   — it uses the modern `WindowInsetsController` under the hood. iOS still calls
   `setBackgroundColor` (harmless there).
3. **`env(safe-area-inset-*)` handles the padding** via `--safe-area-inset-top` / `-bottom` CSS vars
   and the `.platform-android .fixed.inset-0.bg-background` / `.min-h-screen.bg-background`
   `padding-top` rule in `index.css`. Under edge-to-edge these values are reliable — before, we were
   compensating for `setOverlaysWebView(false)` inconsistency.
4. **`AppTheme.NoActionBarLaunch` inherits from `AppTheme.NoActionBar`, NOT `Theme.SplashScreen`.**
   Theme.SplashScreen needs `installSplashScreen()` called from `onCreate` to transition to a
   post-splash theme. Capacitor's `BridgeActivity` doesn't call it, so the theme silently fell back
   to the AppCompat default (with an action bar), which was previously hidden by the
   now-removed `setOverlaysWebView(false)`. Under edge-to-edge that action bar surfaces as a white
   strip with the truncated activity label. If you swap the launch theme parent, keep it under an
   `AppTheme.NoActionBar` ancestor.

If someone re-adds `overlay: false` because "the status bar is white / content is under the notch",
they're diagnosing wrong. The fix is a missing `env(safe-area-inset-top)` on the offending element,
not fighting the system window.

## Live Activity widget extension

**Location:** `ios/App/HIITLiveActivity/`. Runs as a separate `HIITLiveActivityExtension.appex`
process, shows the Lock Screen + Dynamic Island card during active workouts. The main app uses
`src/lib/live-activity.ts` — a wrapper around the third-party `capacitor-live-activity` plugin.

**Info.plist must be explicit — same rule as the Watch app.** The extension target uses
`GENERATE_INFOPLIST_FILE = NO` + a self-contained `HIITLiveActivity/Info.plist` with
`CFBundleIdentifier`, `CFBundleExecutable`, `CFBundleName`, `CFBundleVersion`, `CFBundlePackageType = XPC!`,
and the `NSExtension` dict. **Don't set `GENERATE_INFOPLIST_FILE = YES` alongside an explicit
INFOPLIST_FILE** — you get a Frankenstein plist where required keys can end up unset, and iOS crashes
the extension at startup with `xpc_connection_copy_bundle_id` fault, taking the parent app with it.

**iOS Simulator quirk — Live Activities are skipped on sim.** iOS 26 sim has an unrelated widget
extension XPC regression that crashes the extension regardless of plist correctness. `LiveActivity.start()`
calls `isIOSSimulator()` (from `plugins/WatchPlugin.ts`, backed by a native `#if targetEnvironment(simulator)`
check) and returns null on sim. Real-device TestFlight builds unaffected. **If you're testing Live
Activity UX, you must use a real iPhone, not the sim.**

## Apple Watch

**PBXFileSystemSynchronizedRootGroup** — the Watch target uses a synchronized root group.
New `.swift` files placed in the Watch App directory are included automatically. Do NOT add them
manually to the Xcode project file.

**Explicit `Info.plist`, not synthesised `INFOPLIST_KEY_*`** — the Watch target uses an explicit
`HIITWatch Watch App/Info.plist` and `GENERATE_INFOPLIST_FILE = NO`. This is deliberate. The Xcode
`INFOPLIST_KEY_*` build-setting synthesis path does NOT cleanly handle keys whose value must be an
array. We hit this hard with `WKBackgroundModes` — `INFOPLIST_KEY_WKBackgroundModes =
"workout-processing"` (the only syntax the synthesis supports) was silently dropped from the built
plist entirely, which made watchOS treat the app as ineligible for workout launches via
`HKHealthStore.startWatchApp(with:)`. The iPhone side reported `success=yes` because it had no way
to know the Watch hadn't accepted the launch. Lesson: **for any plist key that must be an array,
use an explicit Info.plist and verify with `plutil -p` on the BUILT binary, not the source**. If a
key is missing from the built plist, that's where the bug is. Because the Watch group is
file-system-synchronized, the new `Info.plist` is excluded from the Resources phase via a
`PBXFileSystemSynchronizedBuildFileExceptionSet` (mirrors the HIITLiveActivity widget pattern).

**Triathlon Watch auto-launch** — call chain is iPhone `HKHealthStore.startWatchApp(with:)` →
watchOS launches Watch app → `WatchAppDelegate.handle(_:)` fires (declared in
`ios/App/HIITWatch Watch App/HIITWatchApp.swift`) → routes to Race tab for
`.swimBikeRun` configurations. The iPhone Info.plist also needs `LSApplicationCategoryType =
public.app-category.healthcare-fitness` — `startWatchApp` is gated to apps in that category.

**UserDefaults persistence** — any data the Watch needs to survive app restarts must be saved to
`UserDefaults.standard` when received. Pattern established for `todayWorkout` and `triathlonPlan`
in `WatchSessionManager.swift`. Add the same for any new persisted data.

**Notification observer pattern** — SwiftUI views must use `@State` + `onReceive` + `onAppear` to
read from `WatchSessionManager`. Computed properties that read from the singleton do NOT trigger
re-renders. Always use the `@State` + `onReceive(.notificationName)` + `onAppear { state = manager.value }` pattern.

**Exception: WorkoutCoordinator @Published proxy** — for structured workouts we intentionally
route the `.watchStructuredWorkoutReceived` notification through `WorkoutCoordinator.shared`, which
exposes a `@Published var pendingStructuredWorkout` that `ContentView` observes. This avoids the
classic onReceive-during-onAppear race — the notification can fire before a fresh view's observer
attaches, and the coordinator's @Published fills that gap. This is a working exception, not a bug
worth "fixing" back to strict onReceive. If you add another launch-critical notification, prefer
this same coordinator-proxy shape and skip the direct onReceive on the destination view.

**WCSession delivery** — use `sendMessage` when Watch is reachable; fall back to `transferUserInfo`
(NOT `updateApplicationContext`) for reliable queued delivery. `updateApplicationContext` overwrites;
`transferUserInfo` queues in order. Watch receives `transferUserInfo` via `session(_:didReceiveUserInfo:)`.

## Supabase edge functions

All LLM calls go through `aiChatCompletion()` from `_shared/ai-client.ts` — never fetch the AI
gateway directly. This allows provider switching (Gemini / OpenAI / Anthropic) via Supabase secrets.

**Postgres reads with more than 1,000 rows — you MUST paginate.** PostgREST enforces a server-side
`max-rows: 1000` cap on any single response, and it silently truncates. Passing `.range(0, 19999)`
to bypass it doesn't work — the server still returns only the first 1,000 rows and the rest are
dropped without an error. Symptom: subset of records rendering "coming soon" / "no data" for no
apparent reason. Fix: loop `.range(from, from + 999)` in 1,000-row chunks until an empty response
comes back. See `BrowseMeals.tsx`'s `drainTable()` for the pattern; it's what fixed the
"~730 of 885 owner recipes showing no ingredients" bug on 2026-07-02.

Quota check pattern:
```typescript
const quota = await checkAIQuota(admin, user.id, { dailyCap: DEFAULT_QUOTAS.xxx, generationType: "xxx" });
if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);
```

`generate-workout-plan` returns `{ items: [...] }` (not `plan_items`). Each item: `{ day_index, workout_id, sequence_in_day }`.

**Shared activity upsert** — `supabase/functions/_shared/activity-upsert.ts`. Every ingest path
(`log-watch-workout`, `sync-healthkit`, `push-garmin-watch-workout` — see "Garmin CIQ direct push"
below) routes through `upsertActivities(admin, rows)`. Three dedupe layers:

1. **Exact-key** on `(user_id, source_platform, source_platform_id)` — catches identical re-sends
   from the same source (partial unique index).
2. **Fingerprint** on `(user_id, fingerprint_hash)` — sha256 of
   `user_id | canonical_activity_type | floor(epoch/60) | floor(duration/30)`. Catches the same
   real-world workout arriving via multiple sources when timestamps agree to the minute.
3. **Fuzzy window** on `(user_id, canonical_activity_type, started_at ± 90s)` — catches the
   boundary case where a 1-second clock skew between HealthKit and direct push drops the same
   workout into adjacent minute-buckets. This layer requires an extra DB read per batch but is
   bounded by the partial index on `(user_id, started_at)`.

**Activity-type normalisation is mandatory.** Every write goes through
`normaliseActivityType()` from `_shared/activity-types.ts` before the fingerprint is computed
— otherwise "run" and "running" from different paths hash to different fingerprints and dedupe
fails silently. The DEDUPE-04 audit in `tests/run.ts` catches attempts to bypass this.

**Winner selection** — when a fuzzy match exists AND the incoming row's `source_platform` has
strictly higher priority (see `SOURCE_PRIORITY` in `activity-types.ts`), the existing row is
UPDATED with the incoming source_platform / source_platform_id and non-null fields are merged
in (richer HealthKit data is never blanked by a scant direct-push payload). Otherwise the
incoming row is skipped and the existing row wins. This is how our direct-push CIQ path takes
over from a HealthKit-mediated `garmin` row once the watch pushes directly. `UpsertResult`
exposes `{ inserted, skipped, upgraded, insertedRows }` so callers can observe the split.

Ranking (higher wins): `hitt_watch` / `hitt_garmin_watch` (100) > `apple_watch` (80)
> `garmin` / `fitbit` / `whoop` / `oura` / `polar` / `suunto` / `coros` / `wahoo` (60–70)
> `apple_health_native` (40) > `hitt_phone` (20) > `healthkit_other` (5).

When editing any ingest function, keep the fingerprint computation identical to the shared
helper, and never write `activity_type` without normalising first.

## Multi-wearable — HealthKit aggregator + vendor-aware launch

**Detection.** `src/lib/wearable-detection.ts` exports `getPrimaryWearable(supabase, userId)` which
queries `activity_logs` (last 30 days), ranks by `source_platform`, and returns one of
`apple_watch | garmin | fitbit | whoop | oura | phone_only`. Apple Watch wins ties; non-Apple vendor
overrides only with strictly more workouts AND ≥2 in the window. `hitt_phone` and `healthkit_other`
never win — they're the fallback signals. `usePrimaryWearable` hook caches via React Query (1h stale)
and localStorage (7 days) so the UI doesn't flicker between variants.

**Launch UI.** `WearableLaunchCard` component (`src/components/wearable/`) is rendered above the
universal Start button on 4 pages: `ActivityLive` (`gps`), `WorkoutPlayer` (`structured`),
`GymTimer` (`gym`), `Triathlon` (`triathlon`). Copy matrix lives in `src/lib/wearable-launch-copy.ts`
— pure function, unit-testable. Apple Watch users see a tappable button; Garmin/Fitbit/Whoop/Oura
see vendor-specific instructions; `phone_only` renders `null` (clean UI, universal button below is
the action).

**HealthKit sync.** `sync-healthkit` edge function ingests via `src/lib/healthkit-sync.ts` on
foreground / auth-change. Bundle-id maps to `source_platform` (e.g. `com.garmin.connect.mobile → garmin`).
Our own Watch bundle is skipped (WCSession direct path is authoritative for those).

**Adding a new activity type or vendor** — see the audit tests in `tests/run.ts`. New `activityType`
value needs an entry in `wearable-launch-copy.ts` MATRIX (WD-11 audit catches missing keys). New
vendor needs an entry in `bundleIdToSourcePlatform()` + `FRIENDLY` map + `WearableLaunchCard`'s copy.

## Wearable auto-detect + coaching flow

Users don't have to declare which watch they use — the app infers it. Three signals, in order:

1. **`getPrimaryWearable(supabase, userId)`** — if Apple Watch shows up in `activity_logs` (via the
   HITT Watch app or Apple's own HealthKit source), we treat them as an Apple Watch user.
2. **`WearableDetectPlugin` (native Swift, iOS-only)** — probes `UIApplication.canOpenURL()` for
   `gcm-ios-6573`, `strava`, `fitbit`, `whoop`, `oura`. First hit wins. No user prompt required —
   iOS just needs the schemes declared in `Info.plist` under `LSApplicationQueriesSchemes`.
   **Adding a scheme requires four edits in lockstep**: `WearableDetectPlugin.swift` schemes array,
   `Info.plist` LSApplicationQueriesSchemes, `WearableDetectPlugin.ts` result type, and
   `SOURCE_PRIORITY` in `_shared/activity-types.ts`. The SYNC-11 audit catches Swift/Info.plist drift.
3. **Fallback to `getPrimaryWearable`** if neither of the above resolved.

Result gets written to `workout_preferences.declared_wearable_vendor` with a
`declared_wearable_source` tag of `auto_url_scheme` / `user_declared` / `activity_log_inference`.
`user_declared` beats everything and can only be overwritten by another `user_declared`. Other
tags are re-evaluated after 90 days (`RE_EVAL_AFTER_MS` in `useWearableAutoDetect.ts`).

**Coaching banner (`<GarminSyncBanner />`)** — shown on the home screen when
`declared_wearable_vendor = 'garmin'` and no `source_platform='garmin'` row has landed for
≥3 days. `useGarminSyncStatus` computes the tier client-side on every home mount from
`activity_logs` — **no cron, no push notifications**. Tiers: `3d → tier 1` (soft nudge),
`7d → tier 2` (escalated), `14d → tier 3` (offers to switch to phone GPS). Each tier is
dismissible independently via `garmin_setup_reminder_state` JSON on `workout_preferences`.
Dismissing tier 1 doesn't suppress tier 2 — the escalation always fires once per user.

**`<GarminSetupSheet />`** — reused from the banner, from first-detect, and from
Settings → Connected Devices → "Set up Garmin sync". Walks the user through Garmin Connect →
More → Settings → Apple Health, deep-links via the `gcm-ios-6573://` scheme, and provides an
"I've done it — check now" button that immediately fires `syncHealthKitNow()` for visible feedback.

The Setup Sheet is reachable from ConnectedDevices regardless of what
`getPrimaryWearable` says — that's for the multi-wearable user whose Apple Watch primary
outranks their Garmin secondary. Never hide the affordance behind detection.

## Garmin CIQ direct push — the pairing + JWT + push flow

The HITT Connect IQ watch app (`~/hitt-garmin/garmin/`, v0.2.0+) can push completed workouts
straight to our backend, bypassing HealthKit entirely. Belt-and-braces alongside the
HealthKit-mediated path — if the direct push fails, Garmin Connect → Apple Health → HITT still
catches the workout later. The three-layer dedupe in `activity-upsert.ts` merges the two
sources into one row via the fingerprint + fuzzy window, and winner-selection promotes the
`hitt_garmin_watch` row over any HealthKit-mediated `garmin` row for the same workout.

**Pairing (one-time per watch):**
1. **Phone** — Settings → Connected Devices → "Pair Garmin watch" → `<PairGarminWatchDialog />`
   invokes `create-garmin-pairing` edge function → returns a fresh 6-digit code + 5-min TTL.
2. **Watch** — user launches the HITT CIQ app, picks the "Pair with iPhone" menu entry
   (only shown while unpaired), enters the 6-digit code via UP/DOWN + START. Watch POSTs
   the code to `redeem-garmin-pairing` → server validates and mints a **30-day HMAC-signed
   JWT** scoped to `garmin_watch_push`. Watch stores it in `Application.Storage.hitt.jwt`.

**Push (every workout):**
- `RecordingView.saveAndShowFinished()` calls `PushClient.pushWorkout({...})` after
  `session.save()`. Non-blocking — the "Saved" flash renders immediately regardless.
- Watch POSTs to `push-garmin-watch-workout` with `Authorization: Bearer <jwt>`.
- Server verifies signature (separate secret from Supabase JWT), checks
  `garmin_pairings.revoked_at`, checks the `ff_garmin_watch_direct_push` server-side flag,
  routes through `upsertActivities` with `source_platform = 'hitt_garmin_watch'`.
- On failure: watch queues the payload in `Application.Storage.hitt.pending` (bounded at
  8 rows). Drained on the next successful push.

**Security posture:**
- The watch JWT is **not** a Supabase user session — it's signed with
  `GARMIN_PAIRING_HMAC_SECRET` (Supabase edge function env var). A leaked watch token can
  only touch `push-garmin-watch-workout` — it can't call any other endpoint or bypass RLS.
- Pairing code hashes stored server-side (SHA-256), not plaintext. Codes expire in 5
  minutes, are burnt after 5 failed redemption attempts, and are single-use.
- `revoked_at` column lets the phone nuke a lost watch instantly — every push checks it.
- **Server-side feature flag** (`app_settings.ff_garmin_watch_direct_push`) can turn the
  endpoint off without a CIQ store release. Watch treats 503 as a transient error and
  retries later.

**Adding a new payload field** — watch payload (`PushClient.pushWorkout` shape) → server
schema check in `push-garmin-watch-workout/index.ts` → `upsertActivities` maps into
`activity_logs`. Keep `activity_type` in the canonical set from
`_shared/activity-types.ts` — the normaliser will collapse whatever you send, but
non-canonical strings hurt the fuzzy match.

**Unpair from the phone** — Settings → Connected Devices renders `<PairedWatchesList />`
for every unrevoked, redeemed pairing on the current user's row. The row's Unpair button
does a direct `UPDATE garmin_pairings SET revoked_at = now()` via the RLS policy
`users_revoke_own_pairings` — no edge function needed. The watch discovers the revoke on
its next push (server returns 401 → `PushClient.onPushResponse` calls `clearToken()`,
so the "Pair with iPhone" menu re-appears in the sport picker on the next launch).

## iOS audio (Capacitor / WKWebView)

iOS WKWebView blocks `audio.play()` unless called within a user gesture window OR the audio
context has been pre-unlocked. Pattern used in JarvisMode:

```typescript
// On mount (within user gesture window), play silent blob to unlock:
el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
el.play().catch(() => {});

// Before each subsequent play, call load() to reset ended state:
audioRef.current.src = newUrl;
audioRef.current.load();  // required on iOS WKWebView after changing src
await audioRef.current.play();
```

## Share cards

`ShareCardCanvas.ts` exports six generators. All produce 1080×1080 PNG except `generateStoryCard`
which produces 1080×1920. All stamp the HITT watermark and use `hsl(24,90%,55%)` (orange) as the
primary brand colour for route lines and accents.

## TTS normalisation

Before sending any text to ElevenLabs TTS:
```typescript
text.replace(/\bHIIT\b/g, 'hit').replace(/\bOk HIIT\b/gi, 'ok hit')
```

"HIIT" spoken letter-by-letter sounds like "H-I-I-T". Replace before all TTS calls.

## Activity tracking

`ActivityLive.tsx` has a pre-start setup phase (`started` state). GPS acquisition begins on
mount so it's ready by the time the user taps Start, but position recording and the timer only
begin after `setStarted(true)`. Duration stats use `formatDuration()` not `formatTime()` so the
AI insight reads "42 sec" not "00:42" (which it misreads as 42 minutes).

## Workout duration — the player and the generator share one model

A "30 minute" AI workout used to finish in ~4 minutes. Three things had to agree and didn't;
if you touch any one of them, check the other two.

1. **`WorkoutPlayer.tsx` honours `sets` for BOTH modes.** Timed exercises used to call
   `goNext()` when the countdown hit zero — which advances to the next *exercise* and resets
   `setNum` — so a "3 sets × 45s" exercise ran once for 45s. Both modes now go through
   `advanceAfterSet()`. Don't reintroduce a direct `goNext()` from the timer.
2. **`generate-workout-plan` derives the exercise count from the target** via
   `suggestedExerciseCount()`, and the prompt states the cost arithmetic explicitly. The
   model treats duration as decoration when it's phrased as a hint — it needs the sums.
3. **`fitSessionToTarget()` enforces the contract server-side** by adjusting `sets` (bounded
   1–5) before persisting. Prompting alone never guarantees it. Don't remove this on the
   grounds that "the prompt handles it".

**The estimate must mirror the player's real constants** — `REST_SECS = 30`, and the 45s
fallback for a timed exercise with no `duration_seconds`. An estimate that disagrees with
what the player actually does is worse than none: it produces a confident wrong number.
`tests/test-workout-duration.ts` (14 cases) fails if they drift apart — that coupling is the
point of the test, not an accident.

## Body-scan progress photos — private by default, opt-in per scan

`body_scans.photo_path` + the `body-scan-photos` bucket (migration `20260729170000`).

- **The bucket is PRIVATE and must stay that way.** Every other image bucket except
  `activity-images` is public; these must never be. Reads go through short-lived signed URLs
  (`createSignedUrl`), never a public URL.
- **RLS scopes objects to `{user_id}/...` by first folder.** There is deliberately **no admin
  or staff read path** — nobody but the owner sees these, including moderators.
- **Storage is opt-in per scan.** `photo_path` stays NULL unless the user ticks the consent
  box on that scan. Body scan must keep working fully when they decline. Don't add a
  "remember my choice" default that silently turns it on.
- **`delete-account` clears storage by prefix.** It previously did **no storage cleanup at
  all** — deleting the `body_scans` row left the image in the bucket. Any *new* user-scoped
  bucket must be added to `USER_STORAGE_BUCKETS` in that function, or deleted accounts leak
  files. Nothing else cleans them up.
- **Adding photo storage changes compliance answers** — the App Privacy questionnaire and the
  published privacy policy both have to declare it.

## `body_scans` isn't in the generated Supabase types

`src/integrations/supabase/types.ts` predates the table, which is why `BodyScan.tsx` uses a
single `const db = supabase as any` shim at the top rather than casting at each call site.
If you regenerate types, delete the shim rather than adding more casts around it.

## Key Supabase tables

- `scheduled_workouts` — `{ user_id, workout_id, scheduled_date }`
- `meal_logs` — `{ user_id, custom_name, category, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, logged_at }`
- `conversations` + `messages` — Jarvis chat history (one "Jarvis" conversation per user)
- `workouts` — library of 28 workouts (seed data; real content from owner pending)
- `workout_preferences` — user's goal, fitness level, days/week, session duration, body areas, equipment
- `community_posts` — user posts with optional image URLs
- `body_scans` — `{ user_id, scanned_at, estimated_body_fat, confidence_level, analysis, photo_path }`; `photo_path` NULL unless the user opted into storing a progress photo
- `recipes` + `ingredients` + `steps` — the ~957 owner recipes behind Browse Meals. Macros are **derived from the ingredients** (see `scripts/recipe-nutrition/`), not authored separately; regenerate rather than hand-editing them

## Automated tests

Three layers:

**1. Source-file audit suite** (`tests/run.ts` — ~150 tests, ~18 pre-existing failures unrelated to
current work). Enforces structural contracts by regex-grepping source files. Groups:
- **NF-01..04** — Primary CTA UI feedback contract. Async click handlers must flip a
  screen-transition setter (or show a loading state) *before* the first `await`. Fails loudly if
  someone reintroduces the pattern that caused the "Finish button does nothing" bug on 2026-06-29.
- **WD-01..16** — Wearable detection + launch card contracts. Ensures `getPrimaryWearable` still
  exports all 6 `PrimaryWearable` values, `usePrimaryWearable` sets `staleTime ≥ 1h`, each activity
  page renders `<WearableLaunchCard>` with the correct `activityType` prop, phone-only variant is
  suppressed for all activity types, matrix has non-empty copy for every (activity × vendor) combo.
- **SCH-01..03** — Schedule page action wiring. Guards the up-next delete affordance and the
  `?reschedule=<id>` deep link.
- **DEDUPE-01..08** — Activity dedupe pipeline. Guards `_shared/activity-types.ts` exports,
  `SOURCE_PRIORITY` coverage, that `activityFingerprint` normalises `activity_type` before
  hashing, that the fuzzy ±90s window query exists, that winner-selection actually UPDATEs
  the DB (not silent skip), and that field-preservation guards prevent scant direct-push
  payloads from blanking richer HealthKit data.
- **SYNC-01..11** — Garmin sync coaching flow. Guards the native `WearableDetectPlugin.swift`
  registration, the `Info.plist` `LSApplicationQueriesSchemes` list, the TS wrapper's result
  shape, the migration adding `declared_wearable_*` columns, the auto-detect hook's
  idempotency + upsert, the `useGarminSyncStatus` client-side tier resolution, `GarminSetupSheet`
  wiring HealthKit resync + Garmin Connect deep link, `GarminSyncBanner` reading the hook +
  opening the sheet, wiring into `Index.tsx`, the always-reachable entry in `ConnectedDevices`,
  and drift detection between the Swift plugin schemes and Info.plist declarations.
- **CIQ-01..11** — Garmin CIQ direct push. Guards the manifest permissions bump to v0.2.0,
  `PushClient.mc` JWT storage + push + bounded retry queue, `RecordingView` firing the push
  after save, `AuthPairingView` handling 6-digit entry + calling `redeemCode`, SportMenu
  showing the Pair entry only when unpaired, `_shared/garmin-jwt.ts` exporting sign / verify /
  hash with the `garmin_watch_push` scope, all three edge functions (`create-garmin-pairing`,
  `redeem-garmin-pairing`, `push-garmin-watch-workout`) wired to shared helpers, `source_platform`
  tag matching `SOURCE_PRIORITY`, the `garmin_pairings` migration with RLS + security columns,
  and the phone-side `PairGarminWatchDialog` + ConnectedDevices entry.
- **WA-*, CA-*, AI-*, MP-*, WP-*** — historical categories covering Watch launch, share cards, AI
  coach markers, meal plans, workout plans.

**2. Pure unit tests** (mocked-dependency, no auth):
- `tests/test-activity-dedupe.ts` — 17 cases for the normaliser + fingerprint + upsert winner-selection
- `tests/test-garmin-sync-tier.ts` — 8 cases for the 3/7/14 day tier resolver + dismissal ledger
- `tests/test-garmin-pairing.ts` — 8 cases for JWT sign/verify + code hashing (Garmin CIQ push auth)
- `tests/test-wearable-detection.ts` — 11 cases for `getPrimaryWearable` decision rules
- `tests/test-wearable-launch-copy.ts` — 32 cases for the activity × wearable copy matrix
- `tests/test-workout-duration.ts` — 14 cases for the session-duration model + target fitting
  (deliberately mirrors `WorkoutPlayer`'s constants; see the duration section above)

**3. Live smoke tests** (require TEST_EMAIL + TEST_PASSWORD):
- `tests/test-wearable-endpoints.ts` — 15 checks against `log-watch-workout` + `sync-healthkit`
  covering auth gating, single-source dedupe, cross-source fingerprint dedupe
- `tests/smoke-content-reports.ts` — reporting pipeline: file / read-back / dedupe / invalid-reason / retract
- `tests/smoke-body-scan-prompt.ts` — inserts a body scan, asks the coach its body-fat %, asserts the reply reflects it (guards the "recall turn" fix above)

```bash
npx tsx tests/run.ts                                            # ~150 tests, ~18 pre-existing fails
npx tsx tests/test-activity-dedupe.ts                           # 17 unit tests (dedupe pipeline)
npx tsx tests/test-garmin-sync-tier.ts                          # 8 unit tests (3/7/14 day tier)
npx tsx tests/test-garmin-pairing.ts                            # 8 unit tests (CIQ JWT + code hashing)
npx tsx tests/test-wearable-detection.ts                        # 11 unit tests
npx tsx tests/test-wearable-launch-copy.ts                      # 32 unit tests
TEST_EMAIL=x TEST_PASSWORD=y npx tsx tests/test-wearable-endpoints.ts  # 15 smoke tests
```

**4. Maestro UI flows** (`.maestro/` — anchored flows, need iPhone Simulator + app installed).
Assert visible elements survive refactors. Prereqs: `brew install openjdk@17` + Maestro CLI.
```bash
maestro test .maestro                                # runs all flows
maestro test .maestro/finish-activity.yaml           # single flow
```
Flows in `.maestro/README.md`. See "Maestro tips" note: use `stopApp: false` inside `launchApp:`
to attach to the running app instead of relaunching (which wipes navigation state).
