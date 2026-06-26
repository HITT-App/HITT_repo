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
  components/workout/ShareCardCanvas.ts # all 6 share card generators
  pages/                              # one file per screen
  lib/native-gps.ts                   # Capacitor GPS abstraction
  lib/gps-filter.ts                   # Kalman filter for GPS smoothing
supabase/functions/
  ai-coach/          # streams responses, reads markers from AI output
  generate-workout-plan/  # AI picks workouts from library; returns { items: [...] }
  elevenlabs-tts/    # text-to-speech
ios/App/
  App/               # iPhone Capacitor host
  HIITWatch Watch App/  # watchOS companion
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

```bash
npx tsx tests/run.ts                                           # code audit only (no creds needed)
TEST_EMAIL=x TEST_PASSWORD=y npx tsx tests/run.ts              # full suite including API + DB
```

20 code audit tests always pass. 19 additional tests require auth.
