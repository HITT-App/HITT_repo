# HITT App — Claude Code Rules

Capacitor 8 + React 18 + TypeScript iOS app. Supabase backend. Apple Watch companion (SwiftUI/watchOS).

## Deploy

```bash
~/bin/deploy-ios.sh hitt        # build web → cap sync → xcodebuild → upload to TestFlight
git push origin main             # always push before deploying
```

Build number auto-increments inside the deploy script. Watch build number increments in the Xcode project.

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
  _shared/activity-upsert.ts  # shared upsert helper with 2-layer dedupe (see below)
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

**WCSession delivery** — use `sendMessage` when Watch is reachable; fall back to `transferUserInfo`
(NOT `updateApplicationContext`) for reliable queued delivery. `updateApplicationContext` overwrites;
`transferUserInfo` queues in order. Watch receives `transferUserInfo` via `session(_:didReceiveUserInfo:)`.

## Supabase edge functions

All LLM calls go through `aiChatCompletion()` from `_shared/ai-client.ts` — never fetch the AI
gateway directly. This allows provider switching (Gemini / OpenAI / Anthropic) via Supabase secrets.

Quota check pattern:
```typescript
const quota = await checkAIQuota(admin, user.id, { dailyCap: DEFAULT_QUOTAS.xxx, generationType: "xxx" });
if (!quota.ok) return quotaExceededResponse(quota, corsHeaders);
```

`generate-workout-plan` returns `{ items: [...] }` (not `plan_items`). Each item: `{ day_index, workout_id, sequence_in_day }`.

**Shared activity upsert** — `supabase/functions/_shared/activity-upsert.ts`. Both `log-watch-workout`
(Watch direct path) and `sync-healthkit` (aggregator) route through `upsertActivities(admin, rows)`.
Two dedupe layers: `(user_id, source_platform, source_platform_id)` for same-source, and a
`fingerprint_hash` (sha256 of `user_id|activity_type|round(epoch/60)|round(duration/30)`) for
cross-source. Fingerprint catches the same real-world workout arriving via Watch WCSession AND via
HealthKit → Garmin bundle-id — collapses to one row. When editing either function, keep the fingerprint
computation identical or dedupe breaks.

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

## Key Supabase tables

- `scheduled_workouts` — `{ user_id, workout_id, scheduled_date }`
- `meal_logs` — `{ user_id, custom_name, category, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, logged_at }`
- `conversations` + `messages` — Jarvis chat history (one "Jarvis" conversation per user)
- `workouts` — library of 28 workouts (seed data; real content from owner pending)
- `workout_preferences` — user's goal, fitness level, days/week, session duration, body areas, equipment
- `community_posts` — user posts with optional image URLs

## Automated tests

Three layers:

**1. Source-file audit suite** (`tests/run.ts` — ~119 tests, ~17 pre-existing failures unrelated to
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
- **WA-*, CA-*, AI-*, MP-*, WP-*** — historical categories covering Watch launch, share cards, AI
  coach markers, meal plans, workout plans.

**2. Pure unit tests** (mocked-dependency, no auth):
- `tests/test-wearable-detection.ts` — 11 cases for `getPrimaryWearable` decision rules
- `tests/test-wearable-launch-copy.ts` — 32 cases for the activity × wearable copy matrix

**3. Live smoke tests** (require TEST_EMAIL + TEST_PASSWORD):
- `tests/test-wearable-endpoints.ts` — 15 checks against `log-watch-workout` + `sync-healthkit`
  covering auth gating, single-source dedupe, cross-source fingerprint dedupe

```bash
npx tsx tests/run.ts                                            # ~119 tests, ~17 pre-existing fails
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
