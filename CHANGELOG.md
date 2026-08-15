# HITT App Changelog

## [2026-08-15] — v1.0.8 / Build 334: 973 new recipes, dessert & cheat-meal browsing, much faster images, food scan fixed

- **973 new recipes from the owner**, nearly doubling the library to 1,930. Delivered as a pack of 1,000 and cleaned up before import: 22 were exact duplicates under different names, 5 had nutrition that contradicted their own ingredient lists, and 32 carried artefacts from however they were generated (one dessert was named "Protein Crab-Free Vanilla Panna Cotta"). **Already live on every version** — recipes come from the server
  - **Allergen data was materially incomplete and has been corrected.** The pack only ever used nine allergen labels — celery, mustard, sulphites, lupin and molluscs never appeared once, five of the UK's fourteen. 118 missing allergens were added from the ingredient lists, including all eight scallop dishes that declared no molluscs, a breakfast listing a fried egg with no allergens at all, and a fish pie containing prawns that declared only fish and milk. 19 incorrect "free-from" claims were removed, such as gelatine tagged vegetarian and honey tagged vegan
  - Corrections only ever went the safe way: allergens were **added but never removed**, free-from claims **removed but never added**, and anything ambiguous was left for the owner to confirm rather than guessed at. **This is not a substitute for the owner's own allergen review** — it can only find what the ingredient list actually mentions
- **Meals are now browsed by type rather than by goal**, for more variety — with two new shelves, **Desserts** and **Healthy Cheat Meals**, plus filter chips for both. Underneath, each recipe is tagged with a dish type (salad, curry, overnight oats, jacket potato…) across 83 categories. **Needs this build** — the recipes are already on the server, but the new shelves and filters are part of the app
- **Photos and recipe images load far faster and use a fraction of the data.** Images were being sent at full size — some workout thumbnails were 8MB each, so opening the workout library could pull tens of megabytes over mobile data. They're now resized and re-encoded on delivery to the size actually shown on screen: the same thumbnail went from **8MB to 43KB**, around 184× smaller. The originals are untouched, so nothing was lost. **Needs this build**
- **The AI food scan is reliable again.** The owner reported it failing on ordinary plates such as egg on toast. Four separate faults: the scan ran with no consistency setting, so the same photo could give a different answer — or none — each attempt; genuine uncertainty was shown to you as a flat "not recognised" instead of a best guess you could correct; nothing told it how to handle a plate with several parts, which is exactly what egg on toast is; and long replies were being cut off mid-answer and discarded. Tested on real photos, the same plate now returns the same result every time, and egg on toast correctly itemises into toast, avocado, egg and seeds. **Already live on every version**
- **A hole that exposed the recipe library has been closed.** One database view ignored the sign-in requirement, so the entire recipe library could be read without an account. Fixed and verified. **Already live on every version**
- **Storage fixes after an outage.** On 14 August the app went completely down — nobody could sign in — because Supabase storage passed its limit and the whole project was suspended. Restored by upgrading the plan. The causes are fixed too: hero and splash uploads were keeping every file ever uploaded instead of replacing them, admin video uploads had no size limit at all, and deleting your account left your community images and avatar behind. **Account deletion cleanup is live on every version**; the upload fixes need this build

- **Marketing version bumped to 1.0.8** across all targets (App, Watch, Live Activity). This was forced rather than chosen: the first upload attempt was rejected because **1.0.7 has already been approved and released**, which closes that version to new builds (`Invalid Pre-Release Train`, error 90186). Any build after an approved release needs a higher version number

> **Google Play is unaffected by this build** — the Android app is currently suspended and no Android release was attempted.

## [2026-08-01] — v1.0.7 / Build 333: comment reactions fixed, error monitoring moved to the owner's account

- **Reacting to a comment now works properly.** Someone reacting to your comment sent you a notification, but the reaction never appeared on the comment and tapping the notification landed on a "not found" page. Two separate faults, both specific to comments — reacting to a *post* was always fine, which is why it went unnoticed:
  - The reaction count was never being kept. The database counter that runs whenever anyone reacts only ever updated posts, so a comment's count sat at zero permanently while the screen faithfully displayed that zero. There is now a counter for comments too, and **every existing comment has had its real count restored**
  - The notification's link was missing the post it belonged to, producing a malformed address (`/community/post//comments`) that matched no screen. Comment reactions now carry their parent post, and **existing notifications have been backfilled — old ones in your inbox will open correctly too**
  - Both fixes are server-side and already live on every version; this build is not needed for them
- **Error monitoring transferred to the owner's account** — HIIT's crash and error reporting (Sentry) has moved from Vanessa's account to Casey's, part of the ongoing handover. The project moved intact, so the full error history came with it. **This build is what switches it over**: the reporting address is compiled into the app, so installed apps keep reporting to the old account until they update to this version. No user-visible change
- **Marketing version bumped to 1.0.7** across all targets (App, Watch, Live Activity)

## [2026-07-30] — v1.0.6 / Build 332: body-scan progress photos (opt-in)

- **Progress photos on the body scan** — the Progress tab's "Visual progress" card has always had **First** and **Latest** slots, but there was nowhere to keep a photo, so both showed a placeholder outline. Photos were held in memory during the scan, sent for analysis, then discarded. They can now be saved and compared:
  - When you save a scan you're asked whether to **save the photo to track progress**. It's **off by default** — leave it alone and nothing is stored, and the scan works exactly as before
  - Opt in and your front photo is kept, so the Progress tab shows your first and latest side by side with the dates and how many weeks apart they are
  - Photos are stored **privately**. The bucket is not public, access is scoped to your own account at the database level, and images are shown through short-lived signed links. Nobody else can see them — including HITT staff
  - The empty slots now explain why they're empty rather than just showing a blank outline
- **Deleting your account now removes your photos too** — account deletion cleared your data rows but performed no storage cleanup at all, so any saved image would have been left behind. It now removes every stored object belonging to the account. Live for all versions (server-side fix)
- **Marketing version bumped to 1.0.6** across all targets (App, Watch, Live Activity) for a new App Store submission

> **Before submitting for review:** the App Privacy questionnaire in App Store Connect and the published privacy policy both need updating to declare that body photos may be stored, since this build can store them for the first time.

## [2026-07-29] — v1.0.5 / Build 331: workouts run their full length, keyboard fix, real recipe data, branded launch

- **AI-generated workouts now last as long as they say** — a "30 minute" generated workout was finishing in about 4 minutes. Three separate faults compounded, all fixed:
  - `src/pages/WorkoutPlayer.tsx` — timed exercises ignored their sets entirely. When the countdown hit zero the player called `goNext()`, which jumped to the **next exercise** and reset the set counter, so an exercise written as "3 sets × 45s" ran once for 45 seconds. Both timed and reps exercises now share `advanceAfterSet()`, so timed work repeats for all its sets with a rest between. Reps exercises also gain a rest between sets, which they never had
  - `supabase/functions/generate-workout-plan` — the prompt asked for "5–8 exercises" no matter whether you'd requested 15 minutes or 60, and mentioned the duration only as a passing hint. The exercise count is now derived from your target (15 min → 3–6, 60 min → 15–18) and the prompt spells out the arithmetic: rest after every set, work per set, sum it, land within 15%
  - Nothing checked the result. `fitSessionToTarget()` now adjusts sets (bounded 1–5) until the session estimate is within 15% of your target, applied before the plan is saved and logged. Prompting alone can't guarantee it — a silently-short plan is no longer possible
  - The duration model deliberately mirrors the player's real timings, so the estimate matches what actually happens on screen. 14 unit tests in `tests/test-workout-duration.ts`, including a regression case reproducing the original 7-minute result
- **The keyboard no longer covers the message box** in the community chatroom, post comments and direct messages. All three pinned their composer to a fixed-height container and only allowed for the home indicator, not the keyboard. They now use the same `useKeyboardHeight` hook seven other screens already relied on. Fixing direct messages also repaired scroll-to-bottom on a new message, which had never worked — the ref was on the wrong element
- **Sharing a workout no longer loses your place** — sharing out to Instagram or WhatsApp dropped you back on the home screen when you returned, because iOS reclaims the app while handing over the image and the app restarted at the beginning. HITT now remembers where you were, takes you back, and asks whether you'd also like to post the workout to the HITT feed. Nothing is posted to the community unless you say yes
- **Meal pages show the real recipe** — the meal detail screen was still a design mock: every meal showed the same hardcoded ribeye steak and avocado ingredient list, the same three cooking steps, and a "648 kcal" fallback presented as real data. It now renders each meal's actual ingredients, instructions and macros, says so plainly when a value is missing rather than inventing one, and "Log this meal" actually logs it instead of only showing a success message
- **Recipe nutrition rebuilt from the ingredients** — all 957 recipes had their calories and macros generated separately from their ingredient lists, so the two didn't agree. Macros are now calculated from the ingredients themselves, against a 287-food nutrition table reconciled with **USDA FoodData Central** (139 foods matched within 10%, 13 corrected). Also fixed 114 ingredient lines where bread and wraps were listed at 150–250g — four to six slices — and added a "per serving" label so it's clear what the numbers cover
- **The app opens on the HITT logo** — both iOS and Android were still showing the stock Capacitor logo on a white screen at launch. Replaced with the HITT mark on the app's dark background, and the launch screen no longer flashes white first

## [2026-07-17] — v1.0.4 / Build 330: accurate workout times everywhere (walks, runs, gym, triathlon)

- **More accurate workout times across every activity** — walks, runs, cycles, AI gym sessions and triathlons are now timed by the clock, so time spent with your phone locked or in your pocket is counted correctly. Previously a long session could be logged as much shorter than it really was (e.g. a 1h27m walk saving as 44m)
- Extends the v1.0.3 fix (which covered structured HIIT workouts) to the remaining timer screens. Root cause was identical: `duration_seconds` came from a per-second `setInterval` tick counter that iOS suspends while the app is backgrounded / the phone is locked, so real elapsed time was lost. Each screen now derives duration from wall-clock timestamps (`now − start − pausedTime`):
  - `src/pages/ActivityLive.tsx` (GPS walks / runs / cycles) — wall-clock `duration_seconds`; the on-screen timer self-corrects on foreground via `visibilitychange`; manual + auto-pause spans excluded
  - `src/pages/GymTimer.tsx` — AI-workout mode now wall-clock with pause accounting (free/counter mode already used `startTimeRef` wall-clock and was unaffected)
  - `src/pages/Triathlon.tsx` — per-leg tick counters converted to wall-clock; pause, leg transitions and finish each fold the active leg's real elapsed before saving totals
- Already-saved records aren't retroactively corrected (the lost seconds were never recorded); durations are accurate for workouts done on this build onward
- **Marketing version bumped to 1.0.4** across all targets (App, Watch, Live Activity)

## [2026-07-16] — v1.0.3 / Build 329: accurate workout times, "no equipment" option, workout-style picker

- **Accurate workout times** — a workout's saved duration now comes from a wall-clock measurement (start → finish, minus any manual pauses) instead of a per-second tick counter. The old counter only advanced during active exercise and stalled through rest periods, pauses, and — the big one — whenever iOS suspended the JS timer while the phone was locked or the app was backgrounded, so a genuine 60+ min session could save as ~30 min. Fix in `src/pages/WorkoutPlayer.tsx`: `startedAtRef`/pause-accounting refs drive the saved `duration_seconds`, calories, PB detection and share card; the tick counter is kept only for the live on-screen display. Already-saved records aren't retroactively corrected (the lost seconds were never recorded); going forward they're right
- **"No equipment" option in "Modify your training plan"** — the modify-plan flow (`OnboardingFlow`) had no equipment step at all, so there was no way to say "bodyweight only". Added a multi-select equipment step (No equipment / Dumbbells / Bands / Barbell / Full gym) where "No equipment" is mutually exclusive with the rest; wired through `useOnboardingPlan` → `generate-workout-plan` and persisted to `available_equipment`
- **Workout-style picker** — added a multi-select style step (HIIT, Strength, Pilates, Yoga & Mobility) to the modify-plan flow; the generated plan now blends the chosen styles across the week. Removed the hard-coded "HIIT" bias in the `generate-workout-plan` prompt so the AI produces genuine per-style movements (real Pilates mat/core work, Yoga flows, strength sets/reps, HIIT intervals) and labels each session accordingly. Since generation is AI-based, Pilates sessions appear immediately — no new library content needed. Edge-function change is backward-compatible (styles/equipment optional) and deployed alongside the build
- **Marketing version bumped to 1.0.3** across all targets (App, Watch, Live Activity)

## [2026-07-15] — Android 15 edge-to-edge fix (Play Console pre-launch warning)

- **Android 15 (SDK 35+) edge-to-edge properly handled** — Play Console flagged HITT for using deprecated `Window.setStatusBarColor()` / `setNavigationBarColor()` APIs. Root cause: the app was calling `StatusBar.setOverlaysWebView({ overlay: false })` + `setBackgroundColor()` on Android to push the WebView below the status bar. Both wrap Window APIs that Android 15 deprecates. Fixed by moving to the AndroidX pattern:
  - `MainActivity.java` — calls `EdgeToEdge.enable(this)` in `onCreate` for backward compatibility (Google's recommended fix)
  - `src/lib/native.ts` — no longer calls `setOverlaysWebView` or `setBackgroundColor` on Android; iOS path unchanged
  - `styles.xml` — launch splash theme now inherits from `AppTheme.NoActionBar` instead of `Theme.SplashScreen` (which needs `installSplashScreen()` to transition, which BridgeActivity doesn't call — so the theme was falling back to the AppCompat default with an action bar, previously hidden by the now-removed overlay call)
  - CSS `env(safe-area-inset-*)` handling already in place from the earlier Android launch prep — the existing `.platform-android` rules for `.fixed.inset-0.bg-background` and `.min-h-screen.bg-background` now reliably get accurate insets because the WebView draws under the transparent system bars
- Verified visually on Pixel 8 emulator (Android 17 preview / API 37): identical layout to the pre-fix state — status bar area transparent on the app's dark background, content clears the top, bottom nav area clears the gesture pill — but without the deprecated API calls

## [2026-07-11] — v1.0.2 / Build 328: app transferred to Casey's account, in-app reporting, body-scan coaching fix

- **App Store app transferred to Casey's Apple Developer account** (team `5933246NY5`). Build pipeline re-pointed: all targets → automatic signing under the new team, `deploy-ios.sh` per-project override, archives sign via Casey's Apple ID in Xcode. One-time transfer gotchas handled (freed the Watch/Live Activity bundle IDs + `group.com.hiitfitness.app.liveactivity` App Group from the old account so Xcode recreates them; registered a device). Full playbook in `CLAUDE.md` → Deploy → "iOS signing". The ITMS-90076 keychain warning on the first post-transfer build is benign + one-time (session lives in localStorage, not the keychain)
- **In-app content reporting** (App Store Guideline 1.2) — every community surface (posts, comments, stories, DMs, chatroom messages, profiles) now has a **Report** action with a reason picker. Reports land in `content_reports`; content **auto-hides once 3 distinct users report it**; staff review + action in **Admin → Community → Reports**; the owner is emailed per report. Users can retract their own report. Rounds out the moderation toolkit (filter + report + block + contact + guidelines) ahead of declaring social media in the age-rating questionnaire
- **AI coach now uses your latest body scan** — asking the coach about body fat / composition returned "I don't have access" even when a scan existed. The scan value was only in an injected system message, which Gemini deflects; it's now also placed in the coach's synthetic "recall" turn (the same mechanism goal/activities use), so it states the value directly. Edge-function fix — live for all versions
- **Business contact email → casey@hiituk.com** across the Privacy Policy, Terms of Service, and About screen (was `hiit.co.uk@gmail.com`)
- **Chat Settings header** no longer floats with a large gap — it was getting the notch inset applied twice; converted to a normal-flow sticky header
- **Marketing version bumped to 1.0.2** (1.0.1 was approved/live; App Store requires a higher version for the next submission)

## [2026-07-10] — About page, "Jarvis" renamed to "HIIT Coach", Body Scan add-to-plan wired, external-workout PB reminders, analytics digest

- **New About page** (Profile → About) — version + build number (tap to copy for support), contact email, website, Terms + Privacy links, company block (HIITFITNESS LTD, company no. 16893850), Rate HIIT / Share HIIT, and a "Built by Shamalama" credit that opens shamalama.co.uk
- **User-visible "Jarvis" renamed to "HIIT Coach" everywhere** — bottom nav, floating action button aria-label, chat conversation title, ToS + Privacy copy, Play Store listing draft. Existing "Jarvis" conversations are matched on both titles and lazily renamed on read; a one-shot SQL migration renames the canonical row. Internal code + docs still use "Jarvis" — only the user-facing label changed
- **Schedule empty state fixed** — copy is now "No workouts scheduled" (was "Nothing scheduled yet.") and the "Ask HIIT coach" quick-action replaces the old "Ask Jarvis". The stale "Nothing scheduled" flag that fired for weeks *after* the plan's start week is gone — the predicate now uses the correct anchor week
- **Body Scan "Add these to my plan" button now works (Path A)** — the button on the Body Scan analysis screen was dead in the onboarding flow. It now navigates back to Home with a session flag that primes the workout-plan generator with 4–6 lines of scan context (estimated body fat, body type, muscle development, recommendations), so the first generated plan is informed by the scan. Path B (Home comparison card) is scoped in `docs/scope-body-scan-add-to-plan.md`, deferred to next release
- **External workouts (Garmin, HealthKit) now trigger PB share reminders** — the reminder ping ("share your PB?") previously only fired for HITT-native workouts. `_shared/activity-upsert.ts` now checks external inserts against the user's prior bests for the same canonical activity type and schedules the reminder inline. Guards against noise: skips workouts under 60 s, skips `hitt_phone` source (that's the direct-app path), skips the first-ever activity of a type
- **Owner analytics digest** — new `analytics-digest` edge function assembles a daily email covering Postgres user/workout/meal counts, PostHog top events, and Sentry error volume; delivered via Gmail SMTP (Spacemail blocks cloud IPs); scheduled via `pg_cron` + `pg_net.http_post`. Live from 2026-07-10
- **Android wearable guard** — Apple Watch never shown as detected on Android; falls back to phone_only when the seeded activity_logs suggested apple_watch on an Android session
- **Widened Android safe-area padding** — the `.min-h-screen.bg-background` layout was leaking under the status bar on some screens; the padding rule scoped to `.platform-android` now catches both `.fixed.inset-0` and `.min-h-screen` roots
- **iOS Build 325 + Android AAB v8 shipped with everything above**

## [2026-07-09] — Firebase / FCM push on Android, Health Connect declared, Play Store listing drafted

- **Android push notifications live end-to-end** — Firebase project linked (`google-services.json`), FCM registration wired into the platform-aware notification settings, `notify-user` edge function branches by platform and calls the FCM HTTP v1 API with the correct message shape. Verified with a test push to a Pixel 8 emulator
- **14 Health Connect permissions declared** (11 read + 3 write, covering steps, heart rate, weight, sleep, exercise sessions, distance, calories, elevation, VO₂ max, hydration, nutrition; writes for exercise sessions, workouts, and heart rate) — required to keep the Play Console Health Connect declaration truthful and to unblock the read/write sync surface
- **27 unused permissions stripped from `AndroidManifest.xml`** — every Capacitor plugin declares its default permission set on install; `tools:node="remove"` cleans out the ones we don't use so the Play install prompt doesn't lie about what HITT wants. Also stripped `com.google.android.gms.permission.AD_ID` + 4 `ACCESS_ADSERVICES_*` permissions (we don't run ads, Privacy Sandbox not applicable)
- **Marketing version bumped to 1.0.1 for App Store resubmission**; builds 322 → 324
- **Draft Play Store listing** — short description (≤80 chars) + full description with feature bullets under `docs/play-store-listing.md`
- **Hosted account-deletion page now covers partial data deletion** — the Play Console Data Safety form requires disclosure of what the user can delete individually vs the whole-account "delete my account" flow; page at hiituk.com/delete-account now spells both out
- **Android-only safe-area padding CSS** — the earlier untargeted rule was over-padding iOS screens on notched phones; now scoped to `.platform-android` (set in `main.tsx` based on `Capacitor.getPlatform()`)

## [2026-07-08] — Apple App Review resubmission fixes

- **Sign In with Apple, Watch app icon, and AI-generated-content consent screen** — three of App Review's rejection reasons addressed in one build. SIWA now hits Apple correctly (bundle-id + capability alignment); the Watch app icon is present in the built asset catalog (was missing); a first-run AI consent sheet explains that Jarvis / meal generation use LLM output so users acknowledge before use
- Build bump 321 → 322

## [2026-07-07] — Android launch prep: native share, drop canvas-confetti, external-source share cards

- **Android native share sheet** replaces canvas-confetti — Android WebView aggressively throttles requestAnimationFrame during background/foreground transitions and the confetti animation was getting stuck on-screen. It was decorative; removed from all 5 callers (workout complete, meal log, PB reveal, etc.) and swapped to the platform native share on the moments that already invited sharing
- **Share cards now show correct metrics for external (Garmin / HealthKit) runs** — the generator was reading distance/pace/duration from `workout_progress` even for externally-sourced activities where those columns are null; now reads from `activity_logs` when the source is external
- **Google Sign-In works on Android** — the Capacitor social-login plugin was crashing at init with "Cannot find provider 'google'" because we were also passing an apple config which is iOS-only. Fixed to only pass apple config on iOS. Also dropped `scopes: ["email", "profile"]` — plugin errored "CANNOT use scopes without modifying main activity"; profile scope is granted by default
- **StatusBar overlap fix** on Android home screen; iOS build bumps 318 → 320; Android versionCode 3

## [2026-07-06] — Android platform added

- **Capacitor Android platform added** under `~/hitt-app/android/` — Gradle 8.x, JDK 21 pinned in `gradle.properties`; system default JDK stays 17 so Maestro keeps working
- **`~/bin/deploy-android.sh hitt`** — mirrors deploy-ios.sh: web build → cap sync → `./gradlew bundleRelease` → prints AAB path + opens Finder for manual Play Console upload. Auto-increments `versionCode` in `android/app/build.gradle`
- **Release signing wired** — upload keystore at `~/hitt-keys/hitt-upload-key.jks` (outside repo), alias `hitt-upload`; deploy script reads the password from macOS Keychain (service `hitt-android-keystore`); Google holds the app signing key via Play App Signing, we only manage the upload key
- **Docs** — Android deploy + Play signing section added to `CLAUDE.md`; full sprint plan under `docs/scope-google-play-launch.md`

## [2026-07-05] — AI coach meal safety gates + wizard backstop

- **Four-state safety gate for explicit-number meal requests** — the AI coach used to occasionally hallucinate a full meal plan mid-conversation, or "spin" between calling the wizard and writing meals inline. Fixed by making meal generation impossible for the LLM (the wizard is the only path), and layering a four-state gate:
  1. **safety-hold** — ED / self-harm keywords in the last ~6 user turns → supportive reply, no plan, no wizard
  2. **context-hold** — explicit `< 1200 kcal` with no fasting/medical reason present → ask one context question, don't serve
  3. **serve** — explicit numbers `≥ 1200` (or sub-floor with a sensible reason like 5:2/OMAD/supervised) → fast-path serves with a caveat lead-in for sub-floor
  4. **converse + offer** — vague request → coach chats then attaches the wizard below the message
- **Deterministic wizard backstop** — if the user clearly asked for a plan but the model coached without attaching the wizard, the server appends `open_meal_plan_wizard` so the builder button never silently drops
- Live smoke test: `tests/smoke-meal-safety.ts` (5 cases). ED handling is a keyword suppressor only for now — deeper detection + crisis resources is a tracked follow-up

## [2026-07-04] — Terms of Service rewritten to match the app, contact + privacy URL tightened

- **New Terms of Service** — replaced the January placeholder ToS with copy that reflects what the app actually does: HIIT workouts, the Apple Watch and Garmin CIQ companions, wearable and HealthKit integrations, the Jarvis AI coach, meal logging, community features (posts, comments, DMs, follows), and notifications. Age minimum lowered from 18 to **16** in line with the Privacy Policy. Adds explicit AI-content, health-not-medical-advice, community-conduct, and Apple App Store EULA clauses. Governing law: England & Wales. Now rendered from `src/content/terms-of-service.md` via the same react-markdown pipeline as the Privacy Policy
- **Contact email set to hiit.co.uk@gmail.com everywhere** — replaced the two stale `help@hiit.ai` references on the Auth screen with the real contact
- **Privacy Policy URL** — the hosted copy lives at [hiituk.com/privacy](https://www.hiituk.com/privacy); the Terms link out to it, and the in-app renderer stays in sync with the source file at repo root

## [2026-07-03] — Privacy Policy refreshed, workout reminders reworked, notification pipeline verified end-to-end

- **New Privacy Policy** — replaced the January placeholder copy with a full 2026-07-03 policy covering the iOS + watchOS + Garmin CIQ apps, wearable integrations, community features, and regional rights (UK GDPR, EEA, California/US). Rendered at runtime from `src/content/privacy-policy.md`. Hosted at [hiituk.com/privacy](https://www.hiituk.com/privacy)
- **Terms of Service last-updated date bumped to 3 July 2026** — copy itself is unchanged pending a full ToS rewrite
- **Workout reminders rebuilt as day-based, not time-based** — old model tried to fire 30 min before `scheduled_time`, but workouts here are scheduled to a day, not a clock. Now: one morning nudge at ~08:00 local ("You have {title} today"), one evening nudge at ~19:00 local ("{title} — log it or reschedule") which is skipped if any workout was logged that local day. Both crons are tz-aware per `profiles.time_zone`
- **AI Recommendations teaser removed from Home** — the "3 personalized suggestions" card on Home was pointing at a stale generator; removing it rather than shipping decorative UI. Real personalisation will come through Jarvis when it's ready
- **Community chat header sticks to the top** — previously the DM header scrolled away when swiping through messages; now uses the standard sticky header + safe-area pattern the rest of the app has moved to
- **Notification pipeline verified end-to-end** — follows, comments, DMs, PB share prompts, and weekly recap pushes all confirmed delivering through the Vault-backed cron → notify-user → APNs path

## [2026-07-03] — Launch splash first, dead search removed, workout upload robust, schedule jumps to plan week

- **New users see the launch splash before sign-in** — first-time unauthed users now land on the "Free while we're new" launch splash before hitting Auth. Returning signed-out users skip straight to sign-in as before; the splash is a one-shot hook, not something to shove in every session
- **"Search" removed from the app** — the search icon at the top of Home and the Search entry in the HIIT menu both took users to a placeholder page that returned six mock items regardless of query. A broken feature is worse than a missing one; existing browse-and-filter UX on Meals and Workouts covers what search would have done. When real search is worth building we'll build it properly
- **Notifications tidied out of the HIIT menu** — still fully reachable from the bell icon on Home; just cleaning up a redundant nav entry
- **"Upload your workout plan" flow no longer fails on long plans** — Gemini was truncating multi-week structured plans mid-JSON because our output budget was set too low, then the parser gave up. Now the AI is forced to emit strict JSON at the API level, the token budget is doubled, and any residual quirks (unescaped quotes, trailing commas, unclosed brackets from truncation) go through a purpose-built JSON-repair library before we bail. Long detailed plans now load first time
- **Schedule opens on the week your plan starts** — after saving an uploaded plan, the schedule view now jumps directly to the week the plan begins instead of showing "Nothing scheduled yet" for the current week. Fixes the confusing empty state when someone uploads on (say) a Friday for a plan that begins next Monday
- **Change-password flow now requires your current password** — extra safety step before setting a new one, plus a check that the new password actually differs from the old

## [2026-07-02] — "Open Garmin Connect" button actually launches the app; Describe-what-you-ate no longer hides behind the keyboard

- **"Open Garmin Connect" button in Connected Devices → Set up Garmin sync now works** — the button was silently doing nothing. Old code used a hidden anchor tag + simulated click to trigger the `gcm-ios-6573://` URL scheme, but WKWebView captures those clicks as in-page anchor navigation and doesn't route them to iOS's URL-scheme handler. Switched to a top-level `window.location.href` navigation which WKWebView delegates to iOS, plus a two-tier fallback (older `garminconnect://` alias, then the App Store) so users without Garmin Connect installed get the App Store page instead of no feedback
- **"Describe what you ate" no longer hides behind the on-screen keyboard** — the Describe drawer's textarea and "Estimate with AI" button were being covered by the keyboard on iOS, making it impossible to submit an entry. Now uses the existing `useKeyboardHeight` hook (same pattern as ChatContainer and JarvisMode) to add live padding equal to the keyboard height, so the sheet lifts above the keyboard as soon as it appears. Focus-scroll fallback catches edge cases on smaller devices

## [2026-07-02] — Meals browser: missing ingredients fixed, longer names now wrap to two lines

- **Ingredients and instructions now show for every recipe** — the meals browser used to render a "Ingredients coming soon" placeholder on roughly 730 of the 885 recipes in the library. Root cause: Supabase's PostgREST API enforces a server-side 1,000-row-per-response cap that overrides any `.range()` the client sends, and the meals fetch was asking for a single 20,000-row read of the `ingredients` and `steps` tables. Fix paginates in 1,000-row chunks until each table is drained, so every recipe now attaches its full ingredient + step list on load
- **Longer recipe names wrap to two lines instead of truncating on one** — names like "Peri-peri Salmon Fillet with Broccoli Florets & Kale" and "Mexican-style Salmon Fillet with Rolled Oats & Kale" used to trail off after the first ~20 characters, so users had no idea what side / vegetable was on the plate before tapping. Both the list view and the 2-up grid now use a two-line clamp with an ellipsis on the third line

## [2026-07-02] — Paired Garmin watches list + Unpair button; Garmin CIQ v0.2.1 fixes notification crash

- **Paired watches list in Settings → Connected Devices** — every Garmin watch paired with HITT (via the CIQ app) now shows as a row with when it was paired, when it last pushed a workout, and an **Unpair** button. Confirmation dialog before revoke, so a fat-finger tap doesn't unpair the wrong one. Row hides itself as soon as the user confirms — the watch discovers the revoke on its next workout push (server returns 401, watch silently clears its stored token, the "Pair with iPhone" menu reappears on the sport picker)
- **Garmin CIQ v0.2.1 — fix: dismissing a notification during a workout no longer errors** — Garmin fires `onShow` again every time the view returns from being covered (notification, glance, system prompt). v0.2.0 unconditionally created a fresh `ActivityRecording.Session` in `onShow`, so as soon as the user swiped the notification away, Garmin threw an "already active" error. Session creation is now guarded so it only fires on first show. Same fix also unblocks the "Saved" flash and stop-flash from freezing on-screen if a notification interrupted either

## [2026-07-02] — Garmin CIQ v0.2.0: workouts push straight to HITT, no Apple Health middleman

- **HITT users can now pair their Garmin watch with HITT directly** — Settings → Connected Devices → "Pair Garmin watch" shows a 6-digit code with a 5-minute countdown. On the watch, users open the HITT Connect IQ app, tap "Pair with iPhone", and enter the code with UP/DOWN + START. Once paired, every workout finished on the watch pushes straight to HITT the moment the user picks Save — no Apple Health sync gap, no Garmin Connect toggle to hunt for. Belt-and-braces: if the direct push ever fails (offline, backend down, revoked pairing), the existing Apple Health path still catches the workout later, and the 3-layer dedupe collapses both arrivals into one row
- **Watch push uses a purpose-built 30-day JWT scoped to `garmin_watch_push`** — signed with a separate secret from Supabase Auth, so a stolen watch token can only touch `push-garmin-watch-workout` and nothing else. If the phone marks a pairing revoked (Settings → Unpair), every subsequent push is rejected server-side within seconds. Pairing codes are SHA-256 hashed in the DB, expire in 5 minutes, are single-use, and are burnt after 5 failed redemption attempts
- **Server-side feature flag** (`app_settings.ff_garmin_watch_direct_push`) — lets us disable the endpoint without a Connect IQ Store release. Watch treats a 503 as transient and retries later; the Fit-file path via Garmin Connect → Apple Health is a full fallback
- **Watch queues failed pushes and retries on next launch** — bounded at 8 entries (flash-friendly). If the user's watch loses signal mid-workout or the backend is briefly unavailable, the workout doesn't vanish
- **8 new unit tests + 11 new source-file audits** — `tests/test-garmin-pairing.ts` covers JWT sign/verify (correct secret, wrong secret, tampered payload, malformed token, expired token) plus code-hash determinism and collision-resistance. `run.ts` CIQ-01..11 guards the manifest permissions bump to v0.2.0, PushClient's bounded retry queue, RecordingView firing the push after save, the 6-digit AuthPairingView, the SportMenu Pair entry (visible only while unpaired), the shared JWT helper, all three edge functions wired to shared helpers, source_platform matching SOURCE_PRIORITY, the garmin_pairings migration with RLS, and the phone-side PairGarminWatchDialog + ConnectedDevices entry

## [2026-07-02] — Garmin sync coaching: auto-detect, in-app banner, and setup sheet

- **HITT auto-detects your wearable on install, no question asked** — a new native iOS plugin uses `UIApplication.canOpenURL()` against each vendor's URL scheme (Garmin Connect, Strava, Fitbit, Whoop, Oura) to see which watch apps you have installed. No permission prompt, no onboarding step. If your Apple Watch has been sending workouts through, that wins. Otherwise, first vendor app installed wins. Falls back to your existing activity history if nothing's detectable
- **Coaching banner on the home screen when a Garmin user's workouts stop showing up** — if we've detected you as a Garmin user and no Garmin activity has landed in HITT for 3 / 7 / 14 days, the home screen shows an escalating banner: at 3 days, a soft "let's fix this" nudge; at 7 days, "your Garmin hasn't synced for a week"; at 14 days, an offer to switch to phone GPS. Each tier can be dismissed independently and dismissing a lower tier doesn't suppress the next one — the escalation always fires once. All computed client-side on home mount, no cron, no push notifications
- **Setup sheet walks users through Garmin Connect → More → Settings → Apple Health** — reused from the banner, from auto-detect first-hit, and from Settings → Connected Devices → "Set up Garmin sync" (always reachable even if you have an Apple Watch as your primary). Numbered steps, deep link straight into Garmin Connect via its `gcm-ios-6573://` URL scheme, and a "Check now" button that fires an immediate HealthKit resync so users get visible feedback (toast with count of workouts pulled) instead of a silent close
- **`workout_preferences` now stores declared_wearable_vendor** — with a `declared_wearable_source` tag (`auto_url_scheme` / `user_declared` / `activity_log_inference`) so future re-detection knows whether to overwrite. Explicit user choices are permanent. Auto-detected vendors re-evaluate after 90 days if the fresh signal disagrees. Nullable + CHECK-constrained so a typo in one caller can't split analytics groups
- **8 new pure unit tests + 11 new source-file audits** — tier resolver boundaries (3/7/14) + dismissal ledger correctness under `tests/test-garmin-sync-tier.ts`. Structural audits SYNC-01..11 in `run.ts` guard the native plugin registration, Info.plist scheme parity, TS wrapper shape, migration columns, hook idempotency, tier logic, setup sheet's deep link + resync, banner wiring, and drift detection between the Swift plugin and Info.plist schemes

## [2026-07-02] — Activity dedupe hardened for multi-source ingest

- **Same real-world workout no longer duplicates across Garmin + HealthKit paths** — the old fingerprint dedupe used `Math.floor(epoch/60)`, so a 1-second clock skew between Garmin Connect and Apple Health (the norm — Garmin rounds to whole seconds, HealthKit sometimes reports session-created time) could drop the same workout into adjacent minute-buckets and create two rows. Added a third dedupe layer: a ±90 s fuzzy-window query on `(user_id, canonical activity_type)`. Together with the existing exact-key and fingerprint layers, every plausible source of clock drift is now absorbed
- **Winner selection when multiple sources deliver the same workout** — previously whichever row arrived first won by default (`ignoreDuplicates: true`), so a HealthKit-mediated `garmin` row that arrived before the CIQ direct-push row would silently drop the richer direct row. Added a `SOURCE_PRIORITY` table: `hitt_watch` / `hitt_garmin_watch` (our direct pushes) outrank `apple_watch`, which outranks HealthKit-mediated vendor rows, which outrank `apple_health_native` and `hitt_phone`. When a fuzzy match exists and the incoming source has strictly higher priority, we UPDATE the existing row instead of skipping — and richer fields (`calories_burned`, `avg_heart_rate`, `distance_km`) from the existing row are preserved if the incoming payload has nulls
- **Canonical `activity_type` enum** — new `_shared/activity-types.ts` normalises every incoming activity_type string ("run", "Running", "trail run", Garmin's `cardio_training` sub-sport, etc.) into a fixed set before hashing. Without this, the fingerprint hash would drift between paths and dedupe would fail silently on activity-type disagreement
- **17 new unit tests + 8 new source-file audits** — `tests/test-activity-dedupe.ts` covers the normaliser aliases, priority ordering, fingerprint stability, and every winner-selection branch against a mocked supabase. `run.ts` gains DEDUPE-01..08 to guard the structural contracts (module exports, imports, fuzzy-window presence, upgrade branch, field-preservation guards) so regressions surface loudly

## [2026-07-01] — Weight tracking in the gym, meals browser redesign, Garmin delayed-write catch

- **Gym timer now records the weight you're lifting** — reps-mode exercises show a compact Load control below the set-of-set indicator; tap −/+ to change the weight in 2.5 kg steps. Weight per set is stored, and on finish the app rolls up total training volume (Σ weight × reps). The Strength share card promotes Volume into the top slot when there's any weight recorded — showing "Volume · 12,850 kg" instead of "Duration"
- **Meals browser feels like a browsable library instead of a wall of results** — the "All" tab used to dump every recipe alphabetically, which meant the top 40+ meals all started "Asian-inspired…". It now shuffles recipes on load and shows curated horizontal shelves (Breakfast, High-protein picks, Low-carb, Under 400 kcal, Vegetarian, Lunch, Dinner, Snacks) as the landing state. New meal-type + diet chip carousel across the top; filter sheet expanded to meal type / diet / protein source / calorie band, each with a clear button
- **Recipe detail sheet now dismisses on swipe down** — was silently broken because the internal ScrollArea was swallowing the vertical-drag touchmove events the sheet uses for the swipe gesture
- **Garmin activities that take a while to reach Apple Health now still get picked up** — the HealthKit sync used to filter workouts by their start time and advance its lastSyncAt to "now" after each successful sync. Garmin can take 5–30 minutes to write a completed workout into Apple Health, so a phone that had synced before the workout arrived would permanently miss it. Sync now always looks back at least 7 days regardless; fingerprint dedup absorbs any re-hits with no visible cost

## [2026-07-01] — Watch decline fallback, share icon on activity detail, avg HR on synced workouts

- **Watch workouts land in HITT even when you decline "Send to iPhone"** — the previous behaviour filtered HITT Watch app workouts out of the HealthKit ingest on the assumption the Watch had already posted them directly. When you tapped "no" on the Watch prompt, the workout vanished. Now the HealthKit path acts as a proper fallback (fingerprint dedup collapses the both-paths case), so any Watch activity shows up in Activity History regardless of how you answer the Watch prompt
- **Share button moved into each activity's detail screen** — Activity History rows are now clean scannable rows with no per-row Share icon. Tap into an activity to open its full breakdown; the classic iOS Share icon (square-with-arrow, not the Android three-dots) sits in the top-right of the header
- **Post-workout Jarvis "Share now" now gives feedback if something goes wrong** — previously silent-closed if card generation or the share sheet failed. Now toasts a clear message on each failure mode and falls back to a text-only share if the webview can't attach the file
- **Garmin (and other wearable) workouts now carry Avg HR into the share cards** — HealthKit sync pulls the average heart rate over each workout's window from your HR samples. HIIT / Cardio / Yoga cards now show a real number instead of "—" for Garmin-synced runs, cycles, walks, HIIT and cardio sessions

## [2026-07-01] — New HIIT-branded share cards + smarter meal planner

- **Every activity now gets a HIIT-branded share card** — post-workout share images are redesigned end-to-end. White background, orange hex logo, HIIT wordmark + date eyebrow, three big metric blocks with clean orange labels underlined + dark values in Saira Condensed, and a signature orange curve at the bottom that changes per activity type: climb line for runs/bikes/hikes/triathlon, interval steps for HIIT and strength, sine waves for swim, EKG spikes for cardio, a gentle arc for yoga. Nine activity types covered (HIIT / Triathlon / Run / Bike / Swim / Strength / Cardio / Walk-Hike / Yoga); anything else falls back to the cardio template. Preview + shared PNG use the same source so what you see is what your friends see
- **Every share entry point now uses the new design** — post-workout screens, Jarvis "Share now" nudge, Activity History row-level share button, Watch triathlon completion, auto-share prompt after wearable sync
- **Jarvis meal plan now includes a keto library and gets the numbers right** — added 165 owner-curated keto recipes (breakfast / lunch / dinner / snack, all 4–22g carbs) plus a 30-recipe vegetarian + dairy-free keto extension pack so users on restrictive diets can actually hit low-carb targets. When your macros suggest keto (carbs under 25% of calorie target), Jarvis routes to the keto library automatically. Plan totals should now land within 5% of your calorie target with protein floors met and carb ceilings respected — the picker got significantly smarter about respecting ceiling/floor semantics per macro
- **Spoonacular meal suggestions retired for good** — gated behind a feature flag (OFF by default). All meal recommendations now come from the owner-curated library

## [2026-07-01] — HITT-hero animation now plays after every workout

- **The 2-second HITT-hero flash between finish and share now plays after every workout** — moved into the shared CompletionSummary component so GPS activities, structured HIIT workouts, gym timer sessions, and triathlons all get the same celebratory beat before the share screen. Previously only wired into the GPS finish flow

## [2026-07-01] — Owner meal library, poll voting, user blocking, modify-schedule fix

- **Jarvis now pulls meal recommendations from the owner's curated library** — 660 recipes across Lose Weight / Gain Weight / Build Muscle / Recovery (Pre/Post-Workout), each with explicit allergens, diet tag (Omnivore / Pescatarian / Vegetarian / Vegan), macros, ingredients and step-by-step method. Spoonacular is now gated behind a feature flag (OFF by default) so recommendations come exclusively from the owner data
- **Community polls are votable** — the option buttons in a poll post were rendered but never actually did anything. Now tap an option to vote, with optimistic UI (bar fills instantly, percentage appears), your selection highlighted, and duplicate votes silently blocked at the database. Server-side trigger keeps the visible vote counts in sync
- **Block user from the community feed** — the Blocked Users list in Settings existed but there was no way to add anyone to it. The post 3-dot menu on other users' posts now shows "Block user" with a confirmation dialog. Blocking hides that user's posts and comments across the feed
- **Modify-schedule flow no longer shows "0 sessions" + AbortError** — the LLM gateway's 55-second timeout was clipping 4-week plan generation and surfacing the raw `AbortError` under a misleading "0 sessions" heading. Timeout bumped to 110s, unmount cancels in-flight requests cleanly, and the error state now shows a proper "Try again" button instead of a blank empty state

## [2026-06-30] — Live Activity no longer crashes the app on iOS simulator

- **Live Activities are now skipped entirely on the iOS Simulator** — Apple has a known iOS 26 simulator regression where widget extensions crash at startup with an XPC bundle-id fault, which took down the parent app. Now detected via a native `isSimulator` check and the Live Activity calls become silent no-ops on sim. Real devices unaffected — TestFlight users will continue to see the lock-screen workout card as before
- **Widget extension Info.plist also hardened** — was set up with both `GENERATE_INFOPLIST_FILE = YES` AND an explicit `INFOPLIST_FILE` containing only `NSExtension`. The synthesis path could silently drop required keys (`CFBundleIdentifier`, `CFBundleExecutable`). Now self-contained with all required keys, synthesis disabled — same approach we used for the Watch app's `WKBackgroundModes` fix in June

## [2026-06-30] — Schedule page: delete the up-next item + reschedule opens picker

- **You can now delete the "Up next" workout** — the hero card on the Schedule page was missing the ⋯ menu that per-day rows have, so the up-next item was the one workout you couldn't remove without first deleting everything around it. Added the menu — it opens the same Move / Remove sheet the other items use
- **Reschedule button actually reschedules** — tapping Reschedule on a scheduled workout from the home card now opens the 28-day picker directly, with the workout pre-selected. Previously dumped you on the Schedule page with no context, picker never opened

## [2026-06-30] — Backlog sweep: Jarvis loop, Watch teardown, real Watch stats, swipe lock, toast cleanup

- **No more Jarvis ↔ wizard loop** — a returning user with past scheduled workouts but no current/future ones would get bounced repeatedly between the Jarvis no-plan prompt and the schedule wizard. The greet effect now checks "have you EVER scheduled anything" not just "do you have something coming up", and the close buttons on both Jarvis and the schedule wizard now navigate cleanly to home instead of bouncing through history
- **App tutorial doesn't re-appear for returning users** — was only marking itself "seen" when the user reached the final step; now marks on first mount so any exit path (force-quit, partial completion) still counts
- **Watch back-to-back workouts work properly** — added an 8-second cooldown after ending a mirrored workout so HealthKit's teardown completes before a new session starts. Previously a fast restart would silently fail
- **Watch today screen shows real numbers** — steps, calories, heart rate, and streak now come from HealthKit on the Watch instead of placeholder values (8214 / 612 / 72 / 12). Streak counts consecutive days with a logged workout
- **Horizontal swipe locked during active Watch workout, without destroying state** — previous fix accidentally rebuilt the view tree and threw users back to the picker mid-countdown. New approach uses a conditional high-priority drag gesture so the view tree stays identical and the countdown timer survives
- **Triathlon "Send to Watch" error toast is now user-friendly** — was showing Capacitor plugin diagnostics from an old debugging session. Now says "Couldn't reach your Apple Watch — make sure the HITT Watch app is installed and try again". Diagnostics still logged to Xcode for us

## [2026-06-29] — Vendor-aware launch on every activity

- **Vendor-aware launch card on every workout, not just Triathlon** — Run/Walk/Cycle (GPS), structured HIIT workouts, and Gym timer pre-start screens all now show the same wearable-aware card. Apple Watch users get a one-tap "Start on Apple Watch" button (correct activity type per workout: Running / Walking / Cycling / Strength). Garmin/Fitbit/Whoop/Oura users see vendor-specific instructions for tracking the activity on their device while HITT syncs the result from Apple Health
- **Phone-only users see a clean screen** — no wearable detected means no card, just the universal Start button
- **Apple Watch now recognises more activity types from the iPhone** — `startWorkoutMirroring` now correctly maps walking/hiking/rowing/yoga in addition to running/cycling/swimming/strength/triathlon

## [2026-06-29] — Vendor-aware Triathlon launch (Garmin / Fitbit / Whoop / Oura)

- **The Triathlon page now adapts to whatever wearable you actually use** — Apple Watch users still get the one-tap "Start Race on Apple Watch" button, but a Garmin user sees real Garmin multisport setup steps for their watch, a Whoop / Oura user sees a clear "your device doesn't track multisport, use phone GPS" card, and a phone-only user sees friendly framing. Detection is based on which wearable shows up in your recent activity log (30-day window), with Apple Watch winning ties unless another vendor strictly dominates
- **Universal phone-GPS "Start race" button stays visible for everyone** — works regardless of detected wearable, so you always have a working path even if the vendor-specific copy doesn't apply

## [2026-06-29] — Stop the activity-onboarding loop + below-the-fold CTA fix

- **Finishing a workout no longer bounces you back to "set up your activity preferences"** — new users who started a Run/Walk/Cycle without going through the activity-onboarding wizard first got sent to it every time they tapped X on the completion screen, forever. Now finishing a workout marks the wizard "done" automatically, and the X button goes straight to the activity dashboard instead of via the redirect that was triggering the wizard
- **Activity-onboarding "Continue" button is visible again** — was sitting behind the iPhone home-indicator swipe bar on notched devices. Added safe-area padding so it always clears the bottom

## [2026-06-29] — Finish button works again + CTA-feedback audit

- **Tap Finish on an outdoor activity and the completion screen appears immediately** — previously, the Finish button awaited three Supabase round-trips before flipping the screen, so any slow network made the button look broken (the live activity stopped but the in-app timer kept running). Now the success screen + confetti show instantly on tap, with the save happening in the background. If the save fails, a toast surfaces and the session is preserved in case you want to retry from history
- **New regression guard** — added 6 source-file audit tests (NF-01..04) that fail loudly if any primary CTA on any page defers its screen-transition setter behind awaits without showing a loading state. The audit caught two latent bugs along the way (one fixed above, one — LogMeal — verified safe by the loading-spinner exemption)

## [2026-06-29] — Multi-wearable support via Apple Health

- **Your Garmin, Fitbit, Whoop, and Oura now feed into HITT automatically** — anything that syncs to Apple Health is mirrored into your activity log and shows up in Jarvis' context. Open the app and your most recent workouts from any connected wearable appear in your history. No "Connect Garmin" buttons to chase — set up HealthKit sharing in each wearable's own app once and HITT picks them up
- **New Connected Devices screen** — Profile → Connected Devices lists every wearable that's contributed data in the last 14 days, with last-sync timestamps and a Sync button that re-pulls from Apple Health. Includes a "Whoop syncs HR + workouts only — strain & recovery stay in the Whoop app" caveat since that's a Whoop ecosystem limit, not ours
- **Smart cross-source deduplication** — if you finish a workout on your Apple Watch AND your phone also picks it up from HealthKit, we keep only one row. Same for any third-party app re-saving the same session. Done via a fingerprint hash so even when device IDs differ, identical workouts merge

## [2026-06-27] — Triathlon Share: Watch → iPhone share card

- **Tap Share on the Watch race-summary and the iPhone share sheet pops with a triathlon card** — finish a triathlon on the Watch, tap the new gold Share button on the celebrate screen, and an iOS share sheet opens on your phone with a 1080×1080 PNG of your race: gold trophy, race name, total time, and per-leg breakdown (Swim/Bike/Run). Caption auto-fills with "Just finished {race} in {time} 🏆". If the Watch sends the request while the iPhone's locked or backgrounded, the message queues via WCSession `transferUserInfo` and surfaces the next time you open the app
- **Race-complete screen on the Watch now matches the celebrate pattern** — confetti, gold trophy, "RACE COMPLETE" eyebrow, total time, three per-leg tiles, and the new Share + Done buttons. Replaces the simpler "FINISHED" + Save layout

## [2026-06-27] — Triathlon Watch fits 40mm screens + meal plan accuracy fixes

- **Triathlon screens now fit the Apple Watch SE 3 40mm** — the race-ready, in-race, and race-summary screens were rendering taller than the 197pt screen height, hiding the header and Start button. All three screens have been shrunk: race title 24→15pt, leg rows from 30pt circles to 20pt, in-race timer 38→24pt, summary medal 48→28pt. Timer/distance values now scale down instead of wrapping
- **Spoonacular meal plans no longer overshoot calorie target** — the snack top-up loop was happily stacking 350-cal snacks chasing the last few grams of protein, pushing a 1800-cal request to 2252 kcal. Now hard-capped at target × 1.05, max 2 snack attempts, and protein-led snacks ranked by protein density (g per kcal) so you close the gap without ballooning calories
- **Recipe ingredients now show per-portion quantities** — Spoonacular returns macros per serving but ingredient amounts for the whole recipe (so a "513 kcal Mushroom Tofu Stew" was listing 6 cups of broth, which is 4 portions' worth). Ingredient amounts are now divided by the recipe's serving count and rendered as clean fractions (½, ⅓, ¾) instead of raw decimals
- **Jarvis no longer refuses meal-plan requests** — when the regex fast-path missed your wording, the LLM was falling through to "I can't directly create a meal plan with specific calorie and protein targets" because the system prompt was telling it to use a tool it doesn't have. Rewrote the meal-plan instructions and added "do that again" / "same as before" support — the regex now looks back through conversation history for prior numeric targets and re-runs from those

## [2026-06-26] — Triathlon Watch auto-launch actually works now

- **Tap Send to Watch on the iPhone and the Apple Watch wakes itself and opens straight to the Race tab.** Previously the plan arrived on the Watch but you had to open the HIIT app on the Watch yourself; on the build before this one, only WCSession delivered the plan and the launch never fired

## [2026-06-25] — Hotfix: outdoor activity tracker crashed on launch

- **Starting a Run, Walk, or Cycle no longer crashes the app** — the new "Finish [activity]" button at the bottom of the live tracker referenced an icon that wasn't imported, causing an immediate crash when the tracker opened. The icon is now properly imported and the tracker loads as expected

## [2026-06-25] — Watch mirroring + HealthKit permissions

- **Watch auto-launches to the Race tab when you send a triathlon** — fixed the underlying iOS mirroring API call so starting a triathlon on the iPhone now prompts the Watch to open the HIIT app and go straight to the Race screen. Requires iOS 17 or later
- **HealthKit permissions all requested on first launch** — previously the app asked piecemeal as each feature was used, leading to silent failures when permission for a sub-type hadn't been granted. Now Workouts, Workout Routes, Heart Rate, Calories, and Distance (walking/running/cycling/swimming) are all requested up front

## [2026-06-24] — Lock Screen Live Activity, hydration keyboard fix, activity back-button fix

- **Workouts now show on your lock screen** — start a GPS activity, lock your phone, and you'll see a live card with elapsed time, distance and pace. Long-press the card on iPhone 14 Pro+ to expand it in the Dynamic Island. Requires iOS 16.2 or later
- **Hydration custom amount works again** — the "Custom amount" input now floats above the iOS keyboard and submits when you press Enter
- **Finishing a GPS activity no longer dumps you back into it** — the back button after completing a run now takes you out of the activity flow entirely

## [2026-06-24] — Triathlon Send-to-Watch diagnostic + Live Activity scaffolding

- **Triathlon "Send to Watch" now surfaces real errors** — instead of always saying "queued" even when the plugin failed silently, the toast now shows the actual error code and whether Capacitor sees the Watch plugin at all. This is a diagnostic build to pin down why plans aren't arriving on the Watch
- **Live Activity widget files added** — initial scaffolding for the upcoming Live Activity feature, plus the App Group entitlement that lets the main app and the widget share data

## [2026-06-24] — Fix triathlon plan not arriving on Watch + WCSession diagnostics

- **Triathlon plans now actually arrive on the Apple Watch** — fixed the bug where tapping "Send to Watch" showed a "queued" toast but the Watch race screen stayed empty even with the Watch app open. State-like payloads (triathlon plans, today's workout, structured workouts) now use Apple's `updateApplicationContext` API as the fallback when the Watch isn't immediately reachable, which delivers the latest snapshot as soon as the Watch wakes — replacing the previous transferUserInfo queue that could defer delivery for minutes
- **Same fix applies to all "current state" Watch syncs** — today's planned workout and full structured workouts also benefit; events like mirror-navigation commands continue to use the queue (correct for ordered events)
- **Full diagnostic logging added to the iPhone ↔ Watch link** — every send/receive step now logs with a `[HIIT.WCSession]` prefix so any future delivery issues can be diagnosed by attaching Console.app
- **Three new internal regression detectors** that cross-check iPhone-sent payload keys against Watch decoders, posted notifications against SwiftUI listeners, and round-trip the triathlon JSON against the Swift Codable schema

## [2026-06-23] — Camera fixes, timezone fixes, and regression-detector audits

- **Camera no longer black-screens on first scan** — the meal scanner and body scanner now reliably show the camera viewport on first launch; previously some users saw a black screen because of an iOS WKWebView race
- **Daily check-in, streaks, and meal plans record on the right day** — fixed a class of bug where the app used UTC instead of your local date, causing anyone east of UTC (Europe, Asia, Australia) to see entries appear on the wrong day after ~22:00 local time
- **Sleep, body scans, and scheduled workouts now show on your local day** — same timezone fix applied to sleep logs, body-scan history, AI-generated workout schedules, and weekly sleep range queries
- **Realtime updates no longer crash the home screen** — fixed the same class of bug as the Build 233 crash: friend activity, community posts, conversations, nutrition dashboard, chatroom and workout schedule now use unique realtime channel names so duplicate subscribers don't collide
- **Watch workout sync handles server errors gracefully** — previously a server 500 silently succeeded; now retries on the next workout completion as intended
- **23 new internal regression detectors added** — runtime audits that guard against the bug classes above plus several others (orphan timers, missing iOS audio settings, malformed AI response crashes, etc.) so future regressions surface in CI

## [2026-06-23] — Watch app overhaul, Strava-style activity tracking, and audio click fix

- **Apple Watch app actually works now** — fixed a fundamental issue where button taps weren't updating the screen; the workout tab and pickers are now fully interactive
- **Heart rate, calories and distance show real numbers** — the Watch now asks for HealthKit read permission on launch, so Stats and live workout screens stop showing `—` everywhere
- **Start a workout from the Watch alone** — new "Pick Sport" button on the workout tab; no need to grab your phone first
- **Mark today as rest from the Watch** — the rest-day button on the Today tab is now wired up
- **Water Lock during workouts** — Lock control now uses the system water-lock for pool/rain use
- **Outdoor activities engage real GPS** — runs, walks, cycles, hikes, paddles and other outdoor sports now record a route to Apple Health and show live distance from the watch's own GPS instead of a simulated value
- **Phone keeps recording with the screen off** — GPS-tracked activities on the phone now survive screen lock and app backgrounding; the route keeps building while you stash your phone in a pocket
- **Crash recovery for in-progress workouts** — if the app is killed mid-activity (low memory, force-quit), you'll be offered to resume the unfinished workout next time you open the activity screen
- **Activities save to Apple Health with map routes** — every GPS-tracked phone activity now appears in the Fitness app with its polyline drawn on the map and counts towards your Activity rings
- **Live activity map no longer flickers** — fixed a bug where the map rebuilt itself on every GPS fix, snapping back to the start instead of following you
- **Smoother in-workout navigation** — on watchOS 10+, the metrics / heart-rate / controls pages now scroll with the digital crown, so the swipe gesture works correctly to leave the workout
- **Fixed clicking sounds on first install** — the iOS audio system no longer activates unnecessarily when voice features are turned off, eliminating the repetitive clicks new users heard at first sign-in
- **Custom hydration amount works** — fixed a bug where typing a custom water amount and tapping Log it did nothing; the input is now properly above the keyboard
- **Meal plans reliably appear** — when Jarvis is asked for a meal plan, the card now reliably renders even when the AI response is long or malformed; on the rare case it still fails, Jarvis now asks you to retry instead of silently hanging

## [2026-06-19] — Sleep dashboard improvements and crash fix

- **Tap any day to log or edit sleep** — the weekly dots in the Sleep dashboard are now tappable; tap a past day to add that night's sleep or update what you already logged (form pre-fills with your existing data)
- **Last night card is tappable** — tap the "Last night" summary to jump straight into editing it
- **Rotating sleep tips** — replaced the broken AI tips button with a card showing real sleep science tips; tap "Next tip" to cycle through 10 evidence-based tips on schedule, temperature, caffeine, screens, and more
- **Fixed crash on home screen cold start** — preset animal avatar no longer crashes when user data is null on first load

## [2026-06-18] — HIIT animal avatars

- **Every new user gets a HIIT animal avatar** — a random animal character (eagle in bow tie, black cat in t-shirt, bear in hoodie, and nine others) is assigned automatically on signup
- **Pick your animal in your profile** — tap the camera button on the Profile page to choose from the full grid of 12 animals, or upload your own photo as before

## [2026-06-18] — Jarvis prompts to update goals before building a new schedule

- **Goal wizard prompt before new schedule** — when Jarvis proposes a workout schedule and you've previously completed setup, it first asks if you want to update your goals; tap "Update my goals" to re-run the full wizard, or "Keep current goals" to proceed with your saved preferences

## [2026-06-18] — Expandable recipe cards on nutrition dashboard

- **Suggested meals on the nutrition dashboard now show the full recipe** — tap any HIIT Coach suggestion in the diary view to expand it and see the ingredient list and preparation steps

## [2026-06-18] — Recipe cards for suggested meals

- **Tap any suggested meal to see the recipe** — meal plan cards in Jarvis now expand to show the full ingredient list with amounts and step-by-step preparation instructions
- **Single recipe recommendations also expandable** — when Jarvis recommends one recipe, tapping the card reveals ingredients and method so you can check what's involved before logging it
- **AI always generates ingredients and steps** — both the meal plan tool and single recipe recommendations now always include realistic ingredients and 2–4 preparation steps

## [2026-06-18] — Revamped workout player for AI-generated sessions

- **Full per-exercise player for AI workouts** — AI-generated sessions now use the same coached player as catalogue workouts: Ready screen, 3-2-1 countdown, Get Ready card with form cues, Active screen with reps/sets/timer, rest countdown between moves, playlist overview, and hold-to-finish on every exercise
- **AI workout plans generated on the fly** — the schedule wizard (home screen and Jarvis) now generates bespoke exercise sessions with sets, reps, and form cues rather than picking from the pre-seeded catalogue
- **Play button on week view workout cards** — the "Rest of your week" rail now shows a coloured Play button alongside the … menu, matching month view

## [2026-06-18] — Dietary preferences visible and editable on nutrition dashboard

- **Dietary preferences card on nutrition dashboard** — shows your current diet style and allergens at a glance; tap Edit to update them without re-running the full onboarding wizard

## [2026-06-18] — Nutrition preferences recognised across all entry points

- **Dietary prefs set via Jarvis now recognised everywhere** — if you set your food preferences through Jarvis (or any wizard), the app no longer re-prompts you to set up nutrition; any meaningful food preference counts as onboarding complete
- **Jarvis dietary card save error fixed** — a silent failure when saving preferences is now caught and surfaced correctly

## [2026-06-18] — AI Coach card glowing logo

- **AI Coach home card logo updated** — replaced the flat JPEG logo with the animated glowing HIIT logo, matching the style of the nav bar centre button

## [2026-06-18] — Plan wizard conflict handling; sleep card staleness fix; alarm screen removed

- **Plan wizard — replace or add alongside** — after reviewing your generated plan, tapping "Add to my schedule" now checks for existing sessions in that window and offers to replace them or add on top, matching the upload flow
- **Home sleep card — staleness fix** — the card no longer shows a sleep log from days ago as "last night"; if no log exists for today or yesterday it shows the manual entry form instead
- **Sleep screen — alarm scheduler removed** — the non-functional "No sleep schedule added yet" alarm setter has been removed from the sleep screen

## [2026-06-17] — Sleep wizard fix, XLSX multi-sheet fix, slider fix, Build my plan fix

- **Sleep wizard no longer loops** — completing the wizard now returns to the home screen; previously it navigated to a route that sent you back to the start due to a stale cache check
- **XLSX upload reads correct sheet** — Excel files with multiple tabs (e.g. a "Read Me" intro tab) now skip the intro and use the exercise/plan sheets; fixes "No sessions found" error
- **Sliders work on iOS** — hours-of-sleep slider and all other sliders (fitness level, weight, image crop zoom) now respond to touch; Radix pointer-event slider replaced with native iOS input
- **Build my plan now works** — the onboarding wizard's final button was silently failing due to a mismatched response key (`plan_items` vs `items`); workout titles now display correctly in the review screen; button shows a loading spinner while the plan generates
- **Training plan wizard layout shift fixed** — opening the plan wizard no longer causes a scroll jump

## [2026-06-17] — GPS fix, XLSX upload, chat settings, plan CTA, nav hide on wizard

- **GPS live location fixed** — positions were discarded after tapping Start due to a stale closure; map now centres on your real location instead of London
- **XLSX upload support** — Excel files can now be uploaded directly to the workout plan analyser; no need to export as CSV first
- **CSV parse fix** — quoted fields with commas are now correctly parsed; prose description columns stripped before sending to AI, preventing malformed JSON errors
- **Chat settings** — Clear chat history now deletes messages from Supabase; Delete memory clears localStorage and resets the form; placeholder Data Sharing and Export stubs removed
- **Training plan CTA** — card now queries your schedule to show "Build a plan" or "Modify your training plan" based on whether you have upcoming sessions; works regardless of which flow created the plan
- **Nav bar hides during plan wizard** — bottom nav is hidden while the onboarding wizard is open

## [2026-06-17] — Workout player revamp, sleep onboarding fix, training plan CTA

- **Workout player rebuilt** — reps/set exercises now show the rep count and set progress instead of a timer; get-ready card appears before each exercise; rest screen between exercises with countdown; hold-to-finish button replaces a single tap to reduce accidental completions
- **Sleep onboarding CTA fixed** — the "Yes, start" button was hidden behind the bottom nav bar on the set-up sleep tracking screen; nav is now correctly hidden on that screen
- **Training plan CTA on home screen** — the plan button reflects whether an active plan exists; Jarvis now responds to plan status

## [2026-06-17] — Apple Watch integration fixes + GPS tracking fix

- **Apple Watch workout completion is now reliable** — completion data is queued for guaranteed delivery even when the phone isn't reachable; previously a second watch workout finishing before the phone reconnected would silently overwrite the first
- **Watch completions now arrive correctly when phone was offline** — the phone now processes queued watch payloads that were held back while it was unreachable
- **Watch step-through UI is more robust** — a simultaneous timer expiry and button tap can no longer both advance the exercise, preventing accidental double-skips
- **GPS activity tracking fix** — the "has the user tapped Start?" check in the GPS callback was reading a stale value due to a React closure bug; recording now starts and stops correctly when the user taps Start
- **ChatSettings cleanup** — removed two placeholder UI sections with nonsense copy

## [2026-06-17] — Fix AI screen header positioning

- **AISurface header fixed** — switched from `h-dvh` + safe-area calc to `fixed inset-0 flex flex-col` + plain `py-3`, matching every other sub-page
- **JarvisMode header fixed** — removed `calc(env(safe-area-inset-top, 44px) + 0.5rem)` inline style, plain `py-3` only

## [2026-06-17] — Fix: workout plan generator abort error

- **ScheduleSetup abort error fixed** — plan generation fetch now has an explicit 110s AbortController timeout; abort/network errors are caught and show "This is taking longer than expected — try again" instead of the raw "signal has been aborted" text; same fix applied to the regenerate-day path

## [2026-06-16] — Daily AI insight card on home screen

- **AI Coach card wired up** — generates one personal sentence per day from real activity data; rule-based fallbacks for new users (no schedule, no sleep logs, no meals logged, no activity yet); cached in Supabase so the home screen never waits on an AI call
- **Stale-while-revalidate** — shows yesterday's insight instantly then refreshes in the background when a new day starts
- **Jarvis link removed** — the "See in Detail" button and fake "0:25 ago" timestamp are gone; card is now informational only

## [2026-06-16] — Fix stats grid: include GPS activities in weekly totals

- **Stats grid data fix** — GPS activities (runs, walks, cycling) were missing from the weekly stats because they go to `activity_logs` not `workout_progress`; now queries both tables and merges the results

## [2026-06-16] — Stats grid: multi-colour quadrant (ember · crimson · teal · gold)

- **Stats grid redesigned** — each card now has its own colour: ember (kcal), crimson (workouts), teal (minutes), gold (active days); softer per-card glow, white highlight line, dark semi-transparent icon chips

## [2026-06-16] — Build 183: Fix stats grid showing zero data

- **Stats grid data fix** — weekly stats (calories, workouts, minutes, active days) were always showing zero because the query filtered on `status = "completed"`, but neither GymTimer nor WorkoutPlayer write that field to `workout_progress`; now filters on `completed_at` not null, matching the pattern used by WeeklySummaryCard

## [2026-06-16] — Fix hold-to-finish on all activities

- **Hold to finish — iOS interruption fix** — tapping "hold to finish" no longer gets stuck if a call, notification, or system gesture interrupts the touch; applies to all gym timer sports (boxing, HIIT, yoga, etc.) and GPS activities (run, walk, cycling)

## [2026-06-16] — Build 182: Charged Orange Quadrant stats cards

- **Stats grid — Charged Orange** — all four weekly stats cards now use a full HIIT-orange gradient with the "Float" treatment: dark halo ring, orange glow shadow, golden top-highlight line, and white text throughout; value text size up to 30 px; labels now near-white (not muted grey)
- **Stats grid — card sizing** — gap widened to 20 px, min-height 108 px, matches the design spec exactly
- **GymTimer dep fix** — `ready` added to the interval effect dependency array so the countdown doesn't tick before the timer is initialised

## [2026-06-16] — Build 175: Hydration card, home reorder, sleep overhaul, Import Plan

- **Hydration home card** — moved out of health metrics into its own card with a progress ring and +250/500/750 ml quick-log buttons
- **Home page reordered** — Next Up → Nutrition → Recommended Meals → Hydration
- **Chat settings** (AI personalisation, voice, personal context) moved to the Jarvis header cog; removed from HIIT menu
- **Sleep home card** — now shows real HealthKit/logged data; manual bedtime/wake/quality log form for users without HealthKit; wizard CTA for first-time setup
- **Sleep dashboard** — sticky header, "Log Sleep" CTA correctly positioned above the nav bar, compact single-screen layout
- **Import Plan** — weekly repeat scheduling from start to end date, conflict modal (Replace / Add alongside / Cancel), Replace now wipes all sessions from today onwards, start date defaults to current Monday, date pickers no longer overlap on iOS

## [2026-06-14] — Hydration redesign: ring hero, vessel quick-add, weekly streak, today timeline

- **Progress ring** — large SVG ring shows daily intake vs. 2500 ml goal with a pacing chip (green = on track, orange = behind)
- **2×2 vessel quick-add grid** — tap Glass (250 ml), Mug (350 ml), Bottle (500 ml), or Flask (700 ml) to log instantly; + Custom opens a bottom sheet for any amount
- **Weekly streak chart** — 7-column bar chart with goal-hit highlights and consecutive-day streak counter
- **Today timeline** — chronological list of today's logs with vessel icon, time, and amount
- **Goal footer** — shows total log count + daily total with an Adjust link

## [2026-06-15] — Home screen refinement, activity detail page, triathlon share card

- **Stats grid updated** — cards are now dark graphite with warm-neon accents (orange, red, pink, amber) instead of coloured glass
- **Schedule card is now a hero card** — shows your next session with a Start button and Reschedule option; empty state has a full-width "Plan my week with AI" CTA
- **Recent Activity is now a swipeable carousel** — horizontal cards replace the stacked list; includes weekly progress bar
- **Activity detail page** — tapping an activity in the dashboard now opens a full detail screen showing duration, distance, calories, heart rate, intensity, route addresses, and notes (wherever data exists)
- **Triathlon Share button now works** — opens the same share card designer as all other sports, showing total time, distance, and calories
- **GPS denied on triathlon bike/run legs** — shows an "Open Settings" overlay instead of just a status badge
- **GPS denied on Routes Explorer** — banner with "Open Settings" button replaces silent London fallback
- **Ready? screen on all activities** — every sport, gym timer, workout player, and triathlon now shows a pre-start overlay before the session begins

## [2026-06-15] — Jarvis collects dietary preferences before generating meal plan

- **Jarvis now asks for your dietary requirements** before generating a meal plan if none are on file — no more generic plans
- Asks two questions: food allergies/intolerances and dietary style (vegan, vegetarian, pescatarian, etc.)
- Your answer is saved to your profile and the meal plan is generated immediately after
- If dietary prefs are already set, Jarvis goes straight to generating the plan

## [2026-06-11] — Schedule card selection; hold-to-finish text fix; completion screen exit

- **Tapping a workout in the schedule now selects it** (orange highlight) and reveals a play button — tapping play starts the workout; tapping again deselects
- **Hold-to-finish text no longer gets selected** when pressing and holding the button
- **Completion screen now has a sticky header** with an X button to close, plus a swipe-down gesture to dismiss

## [2026-06-10] — Fix: schedule daily view removed; hold-to-finish now saves AI workouts

- **Daily view removed from Workout Schedule** — weekly view is the only view now; simpler and always shows AI-generated workouts
- **Tapping a workout card now navigates correctly** — AI workouts route to GymTimer, catalogue workouts to the workout player
- **Hold to finish now works for AI workouts** — was a stale closure bug: the save function was frozen at mount before the workout data had loaded, so the AI save path was never reached; fixed

## [2026-06-10] — Fix: home screen crash on AI-generated workouts

- **ScheduleCard and WorkoutPlanCard no longer crash** when AI-generated scheduled workouts are present — both were accessing `workout.id/title` without null-checking; AI workouts have `workout_id: null` so the join returns null
- Both cards now use `workout_title` and `estimated_duration_minutes` as fallbacks
- Tapping an AI workout on the home screen now routes to GymTimer correctly

## [2026-06-10] — Fix: "View my schedule" 404 and plan insert RLS

- **"View my schedule" now navigates correctly** — was routing to `/schedule` (404); fixed to `/workout-schedule`
- **RLS INSERT policies added** for `user_workout_plans` and `user_workout_plan_items` — original migration only had SELECT/UPDATE/DELETE, blocking plan saves entirely

## [2026-06-10] — Fix: plan save failure, button rename, wizard exit

- **"Could not save your plan" fixed** — `user_workout_plans` insert was including a `workout_source` column that doesn't exist on that table; removed
- **"Start training" renamed to "Add to schedule"** — more accurate label for what the button does
- **X button added to GoalSetup and ScheduleSetup headers** — exits the wizard and returns to the previous screen at any step
- **Confirm error now shows the actual message** — instead of always "Could not save your plan", the real DB error is shown

## [2026-06-10] — Fix: plan generation timeout and type coercion

- **AI timeout raised to 110 seconds** — 55s was sometimes not enough for large multi-week plans; increased to prevent silent failures
- **Numeric fields coerced before validation** — Gemini occasionally returns sets/reps/duration as strings; these are now normalised before validation runs
- **Real error message shown in toast** — instead of always "Could not build your plan", the toast now shows what actually went wrong to aid debugging

## [2026-06-10] — Fix: plan generation used wrong timeline and ignored body scan

- **Timeline now read correctly from the user's saved goal** — was always defaulting to 4 weeks due to a data extraction bug; now reflects 8 weeks / 3 months / 6 months / event date as set in the goal wizard
- **Body scan summary now passed to plan generator** — physique data from the body scan will feed into the AI prompt as intended
- **Daily plan generation quota raised** — internal limit increased from 10 to 50 per day to accommodate testing

## [2026-06-10] — Fix: GoalSetup step 2 next button and date input styling

- **Next arrow now enables when a specific target date is set** — previously required a timeline option to also be selected; now either is sufficient
- **Date input width and corner radius match the timeline cards** — consistent `rounded-2xl` and padding across the whole step

## [2026-06-10] — Plan confirmation screen

- **"Your plan is in your schedule" confirmation** — after tapping "Start training", a clear success screen shows how many sessions were added, with buttons to view the schedule or chat with the coach; no more silently landing on Jarvis

## [2026-06-10] — AI-generated workout plans with full exercise breakdowns

- **Plans are now fully AI-generated** — no more picking from a static catalogue; the AI builds bespoke sessions based on your goal, fitness level, equipment, preferred days, and session length
- **Body scan prompt after goal setup** — after completing the goal wizard, you're asked to do a quick body scan before building your plan; skip button available; scan result feeds directly into the AI plan generation
- **Each session shows intensity (Low/Moderate/High), duration, calories, and a "why" explanation** on the preview card
- **Regenerate individual days** — tap the refresh icon on any preview card to ask the AI for a different session for that day; rest of the plan untouched
- **Plan is saved to DB on confirm** — written to user_workout_plans + user_workout_plan_items (with full exercise snapshot) + scheduled_workouts (with plan_item back-link for future editing)
- **Playing a scheduled AI workout now works** — fixed the "Start now" button on the Schedule page routing to the GymTimer with the session data

## [2026-06-09] — LogMeal redesign: food picker with budget strip and AI describe

- **LogMeal is now a food picker** — replaces the manual form with a search-and-select flow matching the design spec
- **Calorie budget strip** — live bar showing today's consumed vs daily target, with an orange projected overlay as items are queued
- **Quick add chips** — Describe (AI), Snap (→ meal scanner), Barcode (→ barcode scanner), Voice (placeholder)
- **Describe chip** — bottom sheet where you type a meal description; AI estimates calories/protein/carbs/fat via `smart-insights`; confirm to add to the selection tray
- **Food history** — pulls last 100 meal_logs and shows Recent (last 4 distinct meals) and Frequent (top 6 by count) sections with macro pips
- **+/− stepper** on each food row; multiple items can be queued before logging
- **Selection tray** — slides up from the bottom when items are selected; "Add to diary" inserts all queued rows to `meal_logs` in one go
- **Success overlay** — orange circle check with blur, then auto-navigates to the nutrition dashboard
- **Nav bar hidden on `/log-meal`** — added to `HIDDEN_NAV_ROUTES` so the selection tray isn't obscured
- Recipe prefill still works — navigating from a recipe pre-loads it into the selection tray

## [2026-06-09] — Fix: plan confirmation no longer shows a duplicate "Add to schedule" card

- **Plan is saved when you tap "Start training"** — confirmed and working; no extra step needed
- **Fixed Jarvis showing a confusing "3 x 45 mins / Add to my schedule" card** after the plan wizard — that was the AI re-proposing a schedule it didn't need to; AI now just gives a warm welcome when the plan is already saved

## [2026-06-09] — Editable plan preview + reassuring loading messages

- **Plan preview is now editable**: tap the swap icon on any session to choose a different workout from the full catalogue, or tap X to remove a session entirely
- **Cycling loading messages** while your plan generates — "Coach is reviewing your goals…", "Balancing your training load…" etc. — with a note that it takes 15–20 seconds
- **"Start training" disabled** if you remove all sessions from the plan
- Log meal: category pre-filled from URL query param

## [2026-06-09] — Plan preview step + fix plan generation token crash

- **"Build my plan" now works**: Fixed a crash where Gemini's thinking tokens were eating the entire token budget, truncating the plan JSON
- **Plan preview before confirming**: After generating, you see all your scheduled workouts — date, category, duration, and equipment — before committing
- **"Start training" confirms the plan** and drops you into a Jarvis welcome message
- Log meal and nutrition dashboard minor updates

## [2026-06-09] — Goal wizard UX polish + fix plan generation crash

- **Goal wizard**: Next arrow now shows on every step — tap a choice to select it, then tap the arrow to move forward
- **Goal wizard step 2**: Optional specific target date field added alongside the timeline picker
- **Goal wizard step 4**: Heading updated to "What's your go to?"
- **Fix "Build my plan" doing nothing**: Removed invalid API parameter that was causing every workout plan generation to silently fail with a 400 error
- **Schedule setup**: Now shows an error message if plan generation fails instead of silently resetting

## [2026-06-09] — Fix onboarding flow: goal wizard returns to Jarvis plan card

- **Goal wizard now returns to Jarvis**, which automatically shows the "You don't have a workout plan yet" card — no more skipping straight into the schedule wizard
- **Cleaner two-step onboarding**: set goal → Jarvis shows plan card → set schedule → Jarvis welcome message; each step clearly prompted

## [2026-06-09] — Persistent user memory + state-driven Jarvis greeting

- **Jarvis now remembers you across sessions** — goal, physique, injuries, preferences, and lifestyle are stored in a persistent `user_memory` field and injected as Jarvis's own recall on every request; no more "I can't access your goals"
- **Goal and body scan write to memory on save** — goal wizard writes goal + fitness level + equipment; body scan writes physique summary; both survive chat history wipes
- **Jarvis can learn and remember soft facts** — via a new `update_memory` tool, Jarvis persists injuries, training preferences, and lifestyle context (shift work, travel, etc.) across sessions
- **Greeting is now state-driven** — Jarvis checks whether a goal and workout plan are set before opening; shows the right card (set goal / build plan) without triggering the AI unnecessarily
- **Goal questions answered directly** — "what's my goal" type questions are intercepted client-side and answered from the database instantly, bypassing the AI entirely

## [2026-06-09] — Fix Jarvis goal context + suppress goal card reliably

- **AI now sees goal even when user_goals query returns null** — userMD falls back to workout_preferences.workout_goal so "Active goal: not yet set" never appears when a goal has been saved
- **Goal card no longer re-appears after wizard** — profiles update now uses (supabase as any) so goal_prompt_preference column (missing from generated types) is always written; card also checks workout_preferences.workout_goal as a second suppression gate
- **All profiles goal-column updates cast as any** — covers GoalSetup, handleGoalPromptLater, handleGoalPromptNever, and the last_at stamp

## [2026-06-08] — Fix Jarvis goal access

- **Edge function now reads user_goals with admin client** — switched from user-JWT client to supabaseAdmin for the user_goals query; eliminates any RLS edge case that could return null even when a goal is set
- **GoalSetup throws on insert failure** — goal insert errors are no longer swallowed silently; the save button will surface the failure instead of navigating to Jarvis with no goal stored

## [2026-06-08] — Suppress repeated Jarvis greeting within a session

- **No more "welcome back" every open** — Jarvis now skips the greeting if the user was last in the chat within 10 minutes; conversation history shows immediately without an additional message

## [2026-06-08] — Jarvis post-goal acknowledgement fixes

- **AI now names the actual goal** — prefill prompt includes goal name, timeline, fitness level, and equipment so Jarvis acknowledges what the user chose specifically rather than responding generically
- **Prefill no longer shows as a user message** — switched from ai.send() to ai.greet() so the programmatic prompt is invisible; only Jarvis's response appears
- **X button goes home, not back to the wizard** — navigate('/') when closing a prefill-triggered session prevents the wizard re-mounting; used replace:true on the wizard's navigate so it's removed from history too

## [2026-06-08] — Hide Jarvis FAB during goal wizard

- **Jarvis FAB hidden on /goal-setup** — the floating orange + button (z-40) was rendering above the wizard and blocking the "Set my goal" button on the final step; added /goal-setup to the hidden-nav and hidden-FAB route lists

## [2026-06-08] — Jarvis scroll fix + wizard UX polish

- **Jarvis auto-scroll fixed** — new messages and the thinking indicator now scroll into view reliably on iOS using direct container scrollTop instead of scrollIntoView
- **Goal wizard auto-advances** — selecting a goal type, timeline, or fitness level immediately moves to the next step without needing to tap a button
- **Wizard FAB removed** — replaced the full-width Continue button with a small circular ">" arrow for steps that require manual advance (event details, exercise types); only the final "Set my goal" submit retains the full button

## [2026-06-08] — Goal setup wizard

- **5-screen goal wizard at /goal-setup** — captures goal type (fat loss / muscle gain / endurance / strength / event prep), timeline or event date, fitness level, exercise types, and equipment
- **Wizard writes to user_goals + workout_preferences** — feeds directly into the AI coach's user context on every subsequent Jarvis session
- **Returns to Jarvis with acknowledgement** — when reached from the Jarvis goal card, completes and re-opens the chat with the new goal pre-loaded in context
- **Static link in Profile** — "Set up with wizard" button in the Fitness Goal section; returns to profile on completion
- **Goal card now navigates to wizard** — "Set my goal" on the Jarvis popup opens the wizard instead of a broken AI chat flow

## [2026-06-08] — Fix goal card: invert suppression logic to show-by-default

- **Goal card now shows unless we can positively confirm it should be hidden** — previously the card defaulted to hidden and only showed if all DB checks succeeded; now it defaults to visible and is only suppressed if the user has opted out or the 7-day cadence hasn't elapsed
- **A failing DB check no longer silently hides the card** — if the profiles query throws or returns nothing, the card shows rather than disappearing

## [2026-06-08] — Fix goal card suppressed by catch-block contamination

- **Goal card now reliably appears** — schedule and goal-prompt queries are now in separate try/catch blocks; previously a failure in either would silently reset hasSchedule and prevent the card from ever showing
- **No more "returns a thought" greeting when card should appear** — the goal-prompt check can now fail gracefully without affecting which greeting branch runs

## [2026-06-08] — Fix goal card always hidden on iOS

- **Goal card now appears correctly on iOS** — Supabase timestamp format was causing the weekly cadence check to silently fail on device, suppressing the card on every open

## [2026-06-08] — Goal card reliability fixes

- **Onboarding and goal card are now mutually exclusive** — brand-new users get the conversational onboarding greeting; the goal card only shows to returning users with no active goal and cadence due
- **Goal card is now the first visible thing on open** — moved above the streaming response so it's never hidden below the fold
- **Jarvis "I can't check" fix** — prompt now targets the behaviour (claiming inaccessibility) rather than a specific phrase, so synonyms can't slip through

## [2026-06-08] — Goal-prompt pop-up (reusable multi-choice primitive)

- **Goal-prompt card** — Jarvis now asks "What are you training toward?" on open when no goal is set; appears once then re-surfaces weekly on "Remind me later", never again on "Don't ask again"
- **Set my goal** routes into the existing goal-setting conversation; confirmed goals stop the prompt naturally
- **Reusable MultiChoiceCard component** — generic N-choice card (icon, heading, choices array) for goal prompt and future prompts (HealthKit connect, onboarding steps, etc.)
- **Profile schema** — two new nullable columns (`goal_prompt_preference`, `goal_prompt_last_at`) track the user's choice and cadence
- **Jarvis prompt fix** — "not set" goal now correctly described as unset rather than inaccessible

## [2026-06-04] — Dismissed log fix + Jarvis prompt redesign

- **Dismissed food/goal proposals no longer re-proposed** — tapping Dismiss on a log or goal confirmation card now leaves a resolution in the conversation, so Jarvis doesn't re-propose the same item on next open
- **Jarvis identity redesigned** — results-driven professional replacing the praise-dispensing best friend; encouragement is earned and specific, not sprinkled
- **Proactivity rule** — Jarvis now distinguishes purposeful proactivity (chasing goals, data, real progress) from decorative filler (chat summaries, motivational noise); filler is explicitly prohibited
- **Goals section** — Jarvis gives caveated advice when no goal is set, and respects a stored preference (set/later/never) for whether to prompt
- **Food diary instruction fixed** — removed the "answer intake questions from diary" instruction that was driving volunteering bugs; diary stays as background context for macro reasoning only
- **Safety floor strengthened** — results-driven persona explicitly cannot override safety rules

## [2026-06-04] — Branded share templates (6 designs, post + story)

- **6 branded share card templates** — Duration, Full Stats, Personal Bests, New Route, Triathlon, and Challenge; each available in post (1080×1080) and story (1080×1920) format
- **Live SVG previews** — the template picker shows each design as a live thumbnail so you can see exactly what it looks like before generating; thumbnail switches between post and story as you toggle
- **Auto-filled from session** — stats (distance, time, pace, heart rate, calories, elevation) are read from the completed workout and injected into the right fields automatically
- **Smart availability** — Full Stats requires GPS data, Personal Bests requires a new PR this session, New Route requires route positions, Triathlon is only shown for triathlon activities; unavailable templates are greyed out with a reason
- **Integrated into existing share flow** — "Templates" appears as a new option in the share card grid alongside Map Card, Stats Card, Story Card, AI Cinematic, and Quick Photo

## [2026-06-04] — Jarvis food/goal card redesign (Build 129)

- **Food confirmation card redesigned** — replaced the plain emoji-titled block with a "Calorie Hero" card: an orange calorie ring (filled to show how much of your daily target this meal adds), food name, macro composition bars for Protein/Carbs/Fat with proportional fill, and an "Add to diary" button
- **Goal confirmation card redesigned** — "Timeline" card: Target icon chip, goal text, and a runway bar showing today → target date with week count; degrades cleanly when no target date is set
- **Both cards live daily context** — the calorie ring queries today's logged kcal at the moment the card appears and fills accordingly; the timeline runway computes the week count from the current date

## [2026-06-04] — A27: fix greet() volunteering stale food-recall answers (Build 128)

- **Jarvis no longer answers old food questions on app open** — the greeting now just welcomes you and asks what you want to work on; it will never pick up or continue a prior conversation thread
- **Food-recall questions are now fully hidden from AI context** — both the question and its deterministic answer are marked synthetic, so no LLM path (greeting or otherwise) can see an apparently-unanswered food question

## [2026-06-03] — A26: deterministic food-recall answers (Build 127)

- **"What have I eaten today?" answered directly from your diary** — Jarvis no longer asks the AI for food-recall questions; it reads your meal_logs directly and answers instantly with the exact list and totals
- **Calorie and macro totals are always accurate** — "How many calories today?" returns a live calculation from the database, not the AI's recollection of the conversation
- **Works for voice and text** — both the mic and the text input route food-recall questions to the direct answer path
- **Answer is synthetic** — the direct answer isn't fed back into the AI's context window, so it can't anchor to it for non-food questions

## [2026-06-02] — MD Stage 1b + activity goals fix (Build 123)

- **Activity goals now save reliably** — fixed a bug where saving goals a second time failed silently; goals now update in place correctly
- **Jarvis saves stated fitness goals** — when you clearly commit to a goal ("I want to lose 5kg by September"), Jarvis saves it durably; previous goal is archived not deleted
- **Goal history preserved** — each new goal archives the old one so no goal is ever lost, only superseded

## [2026-06-02] — MD Stage 1a: full body-scan analysis persisted (Build 122)

- **Body scan results now saved in full** — the complete AI analysis (body type, muscle development, symmetry, posture, observations, recommendations) is stored in a new `body_scans` table, not just the body-fat percentage
- **History chart unaffected** — the existing body-fat trend data in `health_metrics` is unchanged; `body_scans` is additive alongside it
- **Foundation for user memory** — persisted scans will feed the future user-MD so Jarvis can reference your body composition history

## [2026-06-02] — A23: Jarvis reads food diary correctly (Build 121)

- **Jarvis no longer reports yesterday's meals** — chat receipts ("Food logged: super noodles") are now excluded from the AI context window; Jarvis reads only the live diary, not stale chat history
- **No more double-logging on reload** — before logging any food, Jarvis checks the live diary first; if the item was already logged moments ago it won't log it again
- **"What have I eaten today?" now accurate** — the live food diary is the single source of truth; Jarvis answers from it directly regardless of what's in the chat thread

## [2026-06-01] — A23: Jarvis food-diary reads live data

- **Jarvis now sees everything you've eaten today** — foods logged via the diary, barcode scanner, or meal scanner all appear in Jarvis's context; previously Jarvis could only see items logged through chat
- **Deleted foods disappear from Jarvis immediately** — the live query filters soft-deleted rows; asking "what have I eaten today" after deleting an entry no longer mentions the deleted item
- **Accurate calorie and macro totals** — Jarvis answers from the live diary block (with running totals) rather than from chat message history, eliminating double-counting
- **Edge-function-only change** — no app update required; takes effect immediately on next Jarvis conversation

## [2026-06-01] — A21 fixes: edit drawer input and keyboard behaviour

- **Numeric fields can be cleared** — calories, protein, carbs, fat, fiber, and servings no longer snap back to 0 when cleared; you can delete the value and type a fresh number cleanly
- **Keyboard no longer covers the edit fields** — the edit drawer now lifts above the on-screen keyboard when a field is focused, so you can always see what you're typing

## [2026-06-01] — A21: Edit and delete logged foods in diary

- **Edit a logged entry** — tap the three-dot icon on any diary entry to open an action sheet, then choose Edit; a bottom drawer opens pre-filled with the entry's name, category, calories, servings, protein, carbs, fat, and fiber — save writes back to the database instantly
- **Delete a logged entry** — choose Delete from the same action sheet; a confirmation dialog names the entry before soft-deleting it; the diary and macro totals refresh automatically
- **Per-entry actions** — the three-dot icon now lives on each individual food item (not the category header) so you can act on exactly the entry you want

## [2026-06-01] — A18: Nutrition preferences + Home meals carousel

- **Recommended meals carousel on Home** — horizontal scroll of meals appears below the Schedule card; tapping any card opens a detail sheet with macros, ingredients, and a one-tap log button
- **Nutrition preferences capture** — a 2–5 step flow collects allergens, dietary requirements, and a daily calorie target (either calculated via activity level and goals, or entered manually)
- **Inline onboarding card** — first item in the carousel prompts preferences setup; disappears once completed or skipped
- **Meal logging integration** — "Log this meal" pre-fills the existing log-meal screen with the meal's name and macros
- **Allergen and dietary filtering** — meals matching the user's allergens are hidden; dietary preferences narrow the carousel further (filtering is client-side; tag backfill for existing meals is a follow-up task)
- **DB extended** — `nutrition_profiles` gains calorie_method, weight_goal, activity_level, and onboarding_skipped columns; `meals` gains allergens and dietary_tags arrays

## [2026-05-31] — A5: 24-hour rolling chat history

- **Chat history capped at 24 hours** — messages older than a day no longer appear in the chat view; Jarvis starts fresh each day
- **AI prompt context trimmed** — the AI only sees the last 24 hours of conversation, preventing stale or incorrect context from old sessions contaminating responses
- **Automatic cleanup on write** — sending a new message silently deletes any messages older than 24 hours from the database in the background
- **Performance index** — new database index on `(conversation_id, created_at)` makes time-windowed history queries efficient

## [2026-05-29] — Fix: Home FAB navigates to AI surface

- **Home FAB** — the floating "+" button on the home screen now opens the AI Coach surface (/ai) instead of the quick-add log sheet; Quick Add in the bottom nav remains the entry point for logging

## [2026-05-29] — A2: Three-tab AI surface + bottom nav restructure

- **New AI surface** — /ai route hosts a three-tab shell: Chat (Jarvis), Coach (4 upcoming tools, "Coming next"), and Settings (placeholder)
- **Bottom nav restructured** — now shows Home | Quick Add | HIIT centre button | Schedule | Social; Nutrition tab removed
- **Quick Add from nav** — tapping Quick Add in the nav bar opens the log sheet directly (meal, water, weight)
- **All Jarvis entry points unified** — "Ok HIIT" pill, wake word, HIITMenu AI Coach, and hitt:open-jarvis all navigate to /ai; post-workout share nudge remains a full-screen overlay

## [2026-05-29] — A1 + 5F: AI workout planner + catalogue hidden

- **AI workout generation** — Jarvis can now generate a single custom workout or a full multi-day training plan on demand; workouts are built by Gemini 2.5 Flash using your health metrics, goals, and recent activity as context
- **"Do it now" mode** — AI-generated workouts can be started immediately from Jarvis; GymTimer supports ad-hoc AI workouts alongside scheduled ones
- **Add to schedule** — AI workouts and plans can be scheduled directly from Jarvis cards with an optimistic "Added to [date]" confirmation
- **Workout catalogue hidden** — catalogue entry points removed from bottom nav, home dashboard, FAB, and schedule page for v1.0; routes preserved for future use
- **Schedule page → Jarvis** — "Add" buttons on the schedule now open Jarvis with a pre-filled message so you can ask for a workout recommendation naturally

## [2026-05-28] — Build 108: 5E — AI-generated workout schema foundation

- **Exercise snapshot on completion** — completing a catalogue workout now saves the full exercise list (title, description, duration, sets, reps, order, media) to `workout_progress`, so history is durable even if the catalogue changes
- **AI workout support in schedule and progress tables** — `scheduled_workouts`, `workout_progress`, and `user_workout_plan_items` now hold inline workout content (title, description, exercises, estimated duration and calories) alongside the optional catalogue FK
- **Schedule view null-safe** — workout cards read from inline fields first, falling back to the catalogue join; navigate calls guarded against null `workout_id` so AI workouts won't crash the view
- **TypeScript types updated** — new `ExerciseSnapshot` type; six new columns added to all three table types; `workout_id` correctly typed as nullable

## [2026-05-27] — Build 107: 5C — JarvisMode migrated to useAI hook

- **JarvisMode refactor** (5C) — JarvisMode is now a pure UI surface over the `useAI` hook; ~500 lines of local streaming, conversation history, message persistence, and regex marker parsing deleted
- **Conversation lifecycle simplified** — `VoiceController` no longer does an async DB lookup on every Jarvis open; the hook manages conversation creation and history loading on mount
- **Synthetic message architecture** — action confirmation messages (schedule created, workout added, recipe logged) now persist to the `messages` table with a `synthetic` flag so they survive across sessions, but are excluded from the AI context window so the model never misreads them as its own prior responses
- **`messages` schema migration** — new `synthetic boolean DEFAULT false` column added

## [2026-05-27] — Build 106: 5A+5B — unified AI hook + structured action streaming

- **New `useAI` hook** (5A) — single hook manages the Jarvis conversation: loads history, streams responses, exposes typed `Action` objects to consumers, and writes `meal_logs` silently on `log_food` actions without user confirmation
- **Structured response branch** (5B) — `ai-coach` edge function now branches on `X-Response-Format: structured-v1`; new path uses tool calling with 5 tools (`log_food`, `schedule_plan`, `recommend_workout`, `recommend_recipe`, `body_scan_prompt`) and emits structured SSE `{type:text/action/done}` chunks; existing marker path completely unchanged
- **AI food estimation** — model now estimates macros for casual food-log prompts ("I just ate a caesar salad") instead of asking the user for nutrition data; restores behaviour from the original marker system
- **Debug route** at `/debug-ai` (Profile → Debug AI) for on-device verification of streaming, action chunks, and meal_logs writes — temporary, removed before next release

## [2026-05-20] — Build 93: T14 Workouts/Sports tab + trademark compliance

- **Workouts/Sports tab system** — the Workouts page now has a tab switcher at the top; "Workouts" (default) shows the existing library, "Sports" shows three tappable tiles: Triathlon, Routes, Gym Timer — rescuing three orphaned features
- Renamed triathlon race labels from "Full Ironman" / "Half Ironman" to "Long Course" / "Middle Distance" for trademark compliance

## [2026-05-14] — Fix: Jarvis voice echo when navigating between screens

- **Echo fixed** — tapping Start now, View recipe, Body scan, Share now, or the schedule confirm inside Jarvis now properly stops any in-progress speech before closing; previously the audio kept playing in the background and overlapped with the next greeting

## [2026-05-14] — Phases 6 & 7: PB detection, PB share cards, and push reminders

- **Personal best detection** — after every workout the app checks for three PB types: longest duration, biggest calorie burn, and longest streak. First-ever workouts don't count — you need a previous one to beat
- **PB celebration** — when you hit a PB, the completion screen shows "🏆 New PB" and the share card image switches to a gold "NEW PERSONAL BEST" banner; Jarvis calls out the specific PB by name with a gold card
- **Non-PB workouts unchanged** — generic workouts still get the normal "share your win" prompt, not the gold treatment
- **30-minute push reminder** — if you background the app after a PB workout without sharing, a local push notification fires 30 minutes later nudging you to share while the moment still feels fresh; tapping it opens the workout library
- **Auto-cancel** — if you tap "Share now" inside Jarvis before the 30 minutes are up, the pending notification is cancelled so you're not nudged about something you already did

## [2026-05-14] — Phase 5: Jarvis proactive recommendations and post-workout share nudge

- **Proactive workout suggestion** — on days you have nothing scheduled, Jarvis now opens with a workout recommendation in the greeting rather than a generic welcome
- **Post-workout share nudge** — 8 seconds after finishing a workout, Jarvis automatically opens with a personalised congratulations and a "Share your win" card showing your duration, calories, and workout name
- **Push notification fix** — the completion push notification was sending "You finished undefined" — fixed to use the correct workout title field

## [2026-05-14] — Build 81: Recipe card and nutrition dashboard fixes

- **"View recipe" fixed** — tapping View recipe on a Jarvis suggestion now opens Browse Meals instead of showing "meal not found"
- **Calories update instantly** — logging a meal via Jarvis now refreshes the Nutrition Dashboard in real time; totals no longer stay stale until you leave and return

## [2026-05-14] — Phase 4: Jarvis now shows workout and recipe recommendation cards

- **Workout card** — when Jarvis recommends a workout, a card appears in chat showing the thumbnail (or 💪), name, duration, category and difficulty, with three buttons: Start now (opens the workout), Add to schedule (adds it to tomorrow's schedule and confirms in chat), or Skip
- **Recipe card** — when Jarvis recommends a recipe, a card appears with the recipe emoji, name, meal type, calories and protein, with three buttons: View recipe (opens the recipe detail), Log it (logs the meal now and confirms in chat), or Skip
- **One-tap schedule** — "Add to schedule" on a workout card saves directly for tomorrow — no date picker needed; the workout appears in the Schedule tab immediately

## [2026-05-13] — Build 69: Welcome message fixes, nav restructure, social screen improvements

- **Welcome message reliability** — greeting voice now plays correctly every time you open the app; fixed a bug where it would stay silent after returning from the background, and another where it would echo (play twice) if the screen was tapped at the same moment as the auto-trigger
- **Mic chime on app exit fixed** — wake word listener now stops cleanly when you leave the app and restarts when you return, preventing the iOS mic-off sound from playing on every exit
- **Nav restructure** — the HIIT logo button in the bottom nav now opens Jarvis directly; the old AI tab has been replaced with an Add tab
- **Social onboarding** — tapping Social now shows the community guidelines screen first before taking you to the feed
- **Social feed header** — Chat and Leaderboard buttons added to the top of the community feed
- **Sticky headers** — Social screen, Explore Community screen, and Chat Room all have proper sticky headers with safe-area padding so content no longer hides under the notch

## [2026-05-09] — Build 68: Jarvis onboarding flow

- **First open intake** — if Jarvis opens and you have no schedule yet, it runs a quick goal intake: asks your main fitness goal, what specifically you want to achieve, how many days a week you can train, and how long each session should be — one question at a time
- **Auto schedule proposal** — once Jarvis has your answers it builds a plan and asks "Want me to add this to your schedule?"
- **Body scan offer** — after the schedule step, Jarvis asks if you want a body scan; if you say yes it shows an "Open Body Scan" button in the chat that takes you straight there
- **Re-onboarding awareness** — if you tell Jarvis your goals have shifted, it offers to build a fresh plan based on your new direction

## [2026-05-08] — Build 67: Watch triathlon plan now sticks

- **Race plan persists on Watch** — the triathlon plan is now saved to the Watch's local storage; it survives the Watch app closing and reopening, so "No Race Loaded" no longer appears after the app is restarted
- **Notification timing fixed** — moved the plan-arrival observer to the top level of the Race screen so it's always listening, regardless of which sub-view is active; the plan could previously be missed if it arrived during a view transition

## [2026-05-09] — Build 66: TTS speaks every response + schedule built properly

- **AI coach voice fixed** — the coach now speaks every response, not just the first one; an iOS audio element reuse issue was causing all subsequent responses to play silently
- **Schedule date picker** — now shows 14 days ahead (was 4) and scrolls horizontally; time picker options were previously unreachable due to a CSS overflow bug, now fully selectable
- **Add to Schedule** — new button in the Schedule screen header opens a proper sheet: search the workout library, pick a date and time, save directly; no longer demo-only

## [2026-05-09] — Build 65: Fix WebSocket not connected Sentry error

- **Voice mic stability** — fixed a crash that occurred when tapping the mic button rapidly or when the voice session closed unexpectedly; the app now handles these cases cleanly without errors

## [2026-05-09] — Build 64: Watch opens Race screen automatically when plan is sent

- **No more manual navigation** — removed the pop-up telling you to open the Race tab; the Watch now navigates there automatically when the plan arrives
- **Reliable delivery when Watch is out of range** — triathlon plans are now queued and guaranteed to arrive the next time your Watch connects, instead of being silently dropped or overwritten

## [2026-05-09] — Build 63: Schedule requires user confirmation before saving

- **Confirm before scheduling** — Jarvis now asks before saving anything: after proposing a plan it shows a card in the chat with the goal, days per week, and session length, plus "Add to schedule" and "Maybe later" buttons
- Nothing is written to your schedule until you tap "Add to schedule"
- Food logging is unchanged — still logs immediately when you ask

## [2026-05-09] — Build 62: Voice interrupt + preview fix + schedule live updates

- **Interrupt the coach mid-speech** — tap the mic button at any time while the coach is talking to stop it immediately; button shows a stop icon and "Tap to interrupt" while speaking
- **Voice preview fixed** — sample playback in Settings now works correctly on iOS; was silently failing due to an audio unlock issue
- **Schedule updates instantly** — when Jarvis creates a workout plan, entries now appear in the Schedule tab straight away without needing to reload or navigate away

## [2026-05-08] — Build 61: Voice picker with preview + HIIT pronunciation fix

- **Voice picker redesigned** — voices now appear as individual cards in Settings; tap Preview on any voice to hear a sample clip before choosing it
- **Pronunciation fixed** — "HIIT" now sounds like "hit" everywhere the coach speaks; was being read aloud as individual letters "H I I T"

## [2026-05-08] — Build 60: HealthKit foreground refresh + voice food logging

- **HealthKit refreshes on every app open** — go for a run, open the app, and your activity is there immediately; data now refreshes whenever the app comes to the foreground (was a 24-hour cache)
- **Voice food logging** — tell Jarvis what you ate and it logs it: "Ok HIIT, log I just ate an apple" identifies the food, estimates the calories and macros, picks the right meal slot from the time of day, and saves it to your nutrition tracker
- **Multiple foods at once** — log several items in one message and they all get recorded
- Coach responses are clean — the internal logging instructions are stripped before anything is shown or spoken

## [2026-05-08] — Build 59: Jarvis schedules real workouts + welcome greeting fix + Watch icon

- **Jarvis builds your schedule automatically** — ask the coach for a plan and it now pulls real workouts from the library and saves them directly to your Schedule tab; no more being told to go add it yourself
- **Schedule confirmation in chat** — after creating your plan, Jarvis tells you how many workouts were added and where to find them
- **Welcome greeting fixed** — the spoken greeting on the home screen now reliably plays after your first tap, even when iOS blocks autoplay on load
- **Watch app icon** — the orange circle placeholder in the iPhone Watch app has been replaced with the real HIIT logo

## [2026-05-08] — Build 58: Jarvis logic hardening — 5 bugs fixed

- **No more response bleed** — a new request now kills the previous AI stream instantly; old tokens can no longer spill into a new reply
- **Rapid speech handled correctly** — speaking two phrases quickly no longer causes the second message to overwrite the first in chat history
- **Duplicate message guard** — if the voice engine fires twice for one utterance, the second is now silently ignored
- **Mute toggle is instant** — toggling mute within the first 400ms of opening no longer lets the greeting slip through
- **Single conversation guaranteed** — if duplicate Jarvis threads exist, the app now always picks the original one consistently
- **Clean exit** — closing voice mode mid-response now cancels the fetch cleanly with no dangling network requests

## [2026-05-08] — Build 57: All 9 missing Watch screens + persistent Jarvis chat history

- **Watch: Nothing scheduled** — redesigned open-day screen with Quick start (orange) and Mark as rest (purple moon) buttons
- **Watch: Recovery day** — new screen with purple wind icon and coach-suggested activity
- **Watch: Deliberate rest** — new screen with readiness score card showing sleep and HRV; Override button to pick a sport anyway
- **Watch: Day type from iPhone** — the iPhone app can now tell the Watch which day state to show
- **Watch: End workout confirm** — tapping End now shows a full confirmation screen with elapsed time, distance, calories; End & Save / Discard / Resume
- **Watch: Switch activity** — Switch button opens the sport picker, then a from → to confirmation before switching
- **Watch: Streak completion** — new post-workout screen for streak milestones with flame icon and week pill calendar
- **Watch: Personal best completion** — new post-workout screen for PRs with green gradient, time, and improvement delta
- **Watch: Race loaded** — triathlon tab now shows a pre-race overview (plan name + leg distances) before the race starts
- **Watch: Race summary** — post-race screen upgraded with gold medal, total time, and per-leg time grid
- **Jarvis: Persistent chat history** — voice coach chat is now preserved across sessions; reopening loads the last 40 messages
- **Jarvis: Single conversation thread** — one permanent Jarvis conversation per user, history accumulates forever
- **Jarvis: Welcome back greeting** — returning users get a brief personalised greeting referencing recent chat instead of a cold intro
- **Jarvis: Streaming fix** — text no longer bleeds from one response into the next
- **Home: Welcome greeting** — voice greeting on the home screen now always attempts to play on load

## [2026-05-05] — Build 45: AI coach speaks responses; voice selection; owner handoff docs updated

- **AI coach now speaks** — after each AI response, the coach reads it aloud using ElevenLabs; enable in Chat Settings → Customize → AI Voice Responses
- **Six real voices to choose from** — Brian (American Male), Jessica (American Female), George (British Male), Lily (British Female), Aria (American Female), Chris (American Male)
- **Voice mute toggle in chat** — a small Volume icon above the input bar lets you silence voice mid-conversation without going to settings
- **Voice preference saved** — your choice of voice and on/off state persists across sessions
- **Handoff docs updated** — ElevenLabs API key and APNs push key instructions added for the app owner

## [2026-05-04] — Build 38: Ironman triathlon Watch integration + race setup screen

- **Triathlon race setup screen added** — before starting, choose Full Ironman, Half Ironman, Olympic, Sprint, or set fully custom distances for each leg; distances are editable individually
- **Send race plan to Apple Watch** — new button on the setup screen pushes the plan (name + target distances) to the Watch over Bluetooth so the Watch knows exactly what you're aiming for
- **Apple Watch gets a Race tab** — a 4th tab on the Watch shows the Ironman triathlon screen; each leg displays elapsed time, current distance vs target, a live progress bar, and heart rate
- **Manual leg transitions** — user taps "NOW SWIM / CYCLE / RUN" to start each leg and "NEXT: BIKE →" to advance; each leg records to Apple Health with the correct activity type (swimming, cycling, running)
- **Finish and sync** — tapping "FINISH RACE" on the final leg saves the result and sends totals back to the iPhone

## [2026-05-03] — Build 37: Home workouts section fixes; workout detail sticky header; player layout fixed

- **Workouts section on home screen has proper spacing** — no longer crammed against the stats tiles above it
- **Category filters on home screen now work** — tapping All / HIIT / Strength / Cardio / Yoga filters the real workout library; previously the pills were decorative only
- **Workout detail back button always visible** — header is now sticky so you can go back without scrolling to the top
- **Workout detail no longer scrolls sideways** — horizontal overflow fixed
- **Countdown screen fits on screen** — number scaled down, back button added; no more needing to scroll to exit
- **Workout player controls stay in place** — pause and skip buttons are locked at the bottom of the screen and no longer drift out of view when content scrolls

## [2026-05-03] — Build 36: Camera flip single-tap fix; watch syncs on app open

- **Body scan camera flip now works in one tap** — previously required two taps on iOS due to a timing race when switching cameras; now switches reliably first time
- **Apple Watch / health data syncs automatically on app open** — no longer requires manually pressing the sync button; syncs once per 5 minutes when you open the app

## [2026-05-03] — Build 35: Body scan "expecting ; or )" error fixed

- **Body scan analysis error fixed** — a cryptic "expecting ; or )" error that appeared when analysing a rear-camera photo is now resolved; the session token is fetched safely before the request and the response is parsed with a proper fallback if the server returns an unexpected format

## [2026-05-03] — Build 34: Body scan camera fix; workout library seeded with real exercises

- **Body scan camera no longer fails after switching to rear camera** — the capture button is now disabled until the video stream is delivering frames; previously tapping too quickly sent an empty image to the AI, causing a silent failure
- **Body scan errors now show the real reason** — error messages from the AI service are now surfaced directly instead of always showing a generic "non-2xx" message
- **Workout library now has real content** — 175 exercises seeded across all 28 workouts with descriptions, sets/reps/durations, and muscle groups; thumbnails added to every workout

## [2026-05-03] — Build 33: Body scan improvements — second person, camera flip, warning visible

- **Body scan analysis now speaks directly to you** — results say "your upper body shows…" instead of "the person's body shows…"
- **Camera flip button added** — switch between front and rear camera while scanning; defaults to rear camera for full-body shots
- **AI disclaimer now visible** — warning text has a background and padding so it's no longer hidden behind the bottom navigation bar

## [2026-05-03] — Build 32: Body scan fix; story keyboard fix; duplicate greeting removed

- **Body scan photos no longer fail to upload** — camera and gallery photos are now resized to 900px before sending; previously full-resolution photos exceeded the upload limit and caused an error
- **Caption box no longer hidden by keyboard when creating a story** — text input scrolls into view automatically when the keyboard appears
- **Duplicate welcome message removed from home screen** — the "Hello, name!" line in the header has been removed; the hero already shows the greeting over the video

## [2026-05-03] — Build 31: Recipe images live in Browse Meals; bottom nav fix shipped

- **Browse Meals now shows the real recipe library** — switched from 8 placeholder entries to the full 30-recipe collection with photos; 23 recipes have images, 7 awaiting photos from the owner
- **Tapping a recipe opens a detail sheet** — shows the full-width photo, macros (calories, protein, carbs, fat), allergens, and vegetarian/vegan swap options
- **Bottom nav bar sits closer to the screen edge** — the excess gap below the floating bar has been removed (was committed in Build 30 but hit Apple's daily upload limit)
- **Recipe images and allergens added to database** — 23 photos uploaded and matched to recipes; best-guess allergens set for all 30 recipes pending owner review

## [2026-05-01] — Build 30: Bottom nav bar repositioned closer to screen edge

- **Bottom nav bar now sits lower on screen** — removed excess spacing that was pushing it too far from the edge; it now sits flush with the safe area as intended

## [2026-05-01] — Build 29: Profile screen no longer drifts sideways; back arrow removed

- **Profile screen no longer slides left/right when scrolling** — horizontal overflow was causing the page to drift; locked to vertical scroll only
- **Back arrow removed from profile header** — it was navigating incorrectly and is redundant now that the bottom nav bar handles all navigation

## [2026-05-01] — Build 28: Community feed fixed; AI upgraded to Gemini 2.5 Flash

- **Community feed now loads correctly** — "Failed to load posts" error fixed; the posts query was attempting a database join that had no valid relationship defined, causing every load to fail even when posts exist
- **All AI features upgraded to Gemini 2.5 Flash** — AI coach, food scanner, workout plans, sleep recommendations, and all other AI features now run on Google's latest model, with better response quality

## [2026-05-01] — Build 27: Barcode scanner fixed on iOS; chat now auto-scrolls

- **Barcode scanner now works on iPhone** — iOS doesn't support the browser's native barcode detection API; the scanner now uses the ZXing library as a fallback, decoding barcodes from camera frames directly
- **AI chat now scrolls to the latest message automatically** — the previous scroll method was unreliable in the iOS app; replaced with a more robust approach that consistently keeps the newest message in view

## [2026-05-01] — Build 26: Black camera screen in meal scanner fixed

- **Camera no longer shows a black screen when scanning food** — the live camera feed now appears correctly after granting permission

## [2026-05-01] — Build 25: Watch sync step count fixed

- **Steps, distance, and calories now match the Health app** — the sync window was previously a rolling 24-hour window (yesterday → now), causing it to add yesterday's totals on top of today's; it now runs from midnight today, matching what Apple Health displays for the current day

## [2026-05-01] — Build 24: Google OAuth switched to native SocialLogin plugin

- **Custom OAuthPlugin replaced** — the hand-rolled ASWebAuthenticationSession plugin (`OAuthPlugin.swift`) and its JS bridge wrapper have been removed; replaced with the maintained `@capgo/capacitor-social-login` package (v8.3.20)
- **Simpler, more reliable sign-in flow** — Google sign-in now calls the native Google Sign-In SDK directly, receives an ID token, and exchanges it with Supabase via `signInWithIdToken`; no browser redirect, no deep link, no PKCE code exchange
- **Google reverse client ID URL scheme added to Info.plist** — required by the Google Sign-In SDK; was missing from previous builds
- **Google web client ID moved to `.env`** — no longer hardcoded in source; stored as `VITE_GOOGLE_WEB_CLIENT_ID`
- **Sign-out now clears Google session** — calls `SocialLogin.logout()` so the next sign-in shows the account picker rather than silently reusing the cached account

## [2026-05-01] — Build 21: Welcome screen UX fixed; tutorial no longer navigates away

- **"Welcome back" toast removed** — the welcome screen already says hello; the toast was redundant
- **Phantom navigation to Schedule fixed** — PostLoginWelcome used `onTouchEnd` to dismiss, which left ghost taps active during the 400ms slide-out animation; those ghost taps were reaching the BottomNav's Schedule tab behind the overlay; removed `onTouchEnd` (onClick is sufficient) and added `pointer-events-none` during the dismissal animation
- **Tutorial z-index raised to 100** — ensures the tutorial overlay sits above all navigation elements with no ambiguity

## [2026-05-01] — Build 20: OAuthPlugin properly conforms to CAPBridgedPlugin — Google sign-in working

- **Root cause of all plugin registration failures found** — Capacitor 8 SPM plugins self-register by conforming to the `CAPBridgedPlugin` Swift protocol with `identifier`, `jsName`, and `pluginMethods` properties; our plugin was missing this conformance entirely; the `CAP_PLUGIN` ObjC macro, `registerPluginType()`, and `@objc` auto-discovery all failed because none of them is the correct SPM mechanism; found by reading how `@capacitor/app` itself is implemented

## [2026-05-01] — Build 19: OAuthPlugin registered via Objective-C macro — guaranteed pre-bridge registration

- **Plugin registration moved to `CAP_PLUGIN` ObjC macro** — `bridge?.registerPluginType()` was silently no-oping because the bridge wasn't ready when called; the ObjC `CAP_PLUGIN` macro runs at app load time via the Objective-C runtime, before the Capacitor bridge is even created — this is the registration path used by all npm Capacitor plugins

## [2026-05-01] — Build 18: Show real Google sign-in error for debugging

- Shows the exact error from the OAuth flow instead of the generic "Google sign-in failed" message — needed to diagnose what's failing in ASWebAuthenticationSession

## [2026-05-01] — Build 17: Tutorial Continue button fixed

- **Tutorial "Continue" button now works** — the dimmed overlay was intercepting touches on iOS before they could reach the button; added `pointer-events-none` to the overlay so touches pass through correctly

## [2026-05-01] — Build 15: OAuthPlugin properly registered — Google sign-in should work

- **OAuthPlugin is now registered with Capacitor** — Capacitor 8 does not auto-discover local plugins; the correct API is `registerPluginType()` on `CAPBridgeViewController`, called from `capacitorDidLoad()`; a `ViewController` subclass now calls this at the right moment in the bridge lifecycle
- **Google sign-in error was "plugin not implemented on ios"** — fixed; the plugin is now wired up end-to-end

## [2026-04-30] — Build 13: OAuthPlugin compiled into project — app loads, Google sign-in wired

- **App now loads** — `OAuthPlugin.swift` was written to disk but never added to `project.pbxproj`, so Xcode never compiled it; the plugin didn't exist at runtime and (from Build 11) the storyboard referenced a `ViewController` class that also didn't exist, causing a black screen; fixed by properly registering `OAuthPlugin.swift` in the build and reverting to the standard `CAPBridgeViewController` storyboard entry
- **Google OAuth plugin auto-discovered** — Capacitor finds the plugin via the ObjC runtime from the `@objc(OAuthPlugin)` annotation once the file is compiled into the binary; no explicit registration needed

## [2026-04-30] — Build 12: Auth architecture fixes from code review

- **Google sign-in callback now reliable** — the native plugin was releasing the call reference before ASWebAuthenticationSession could complete; added `call.keepAlive = true` so the bridge holds the reference through the async flow
- **Email sign-up spinner now clears** — when email confirmation is required, the "Account created" toast appeared but the loading spinner never stopped; fixed
- **Sign-out now fully clears state** — both user and session are cleared on sign-out, not just user
- **Password reset email opens HIIT app on iOS** — the reset link was pointing to an internal Capacitor URL; it now uses the `hiitfitness://` deep link scheme so it opens the app correctly
- **Resend verification email fixed the same way** — same URL issue corrected
- **Presentation anchor crash fixed** — the native OAuth sheet now uses the correct window reference on iOS 13+ instead of a bare `UIWindow()` which caused a crash at presentation

## [2026-04-30] — Build 11: Native OAuth plugin properly registered; Google sign-in errors now visible

- **Google sign-in opens the authentication page** — the native OAuth plugin (`OAuthPlugin`) is now correctly registered with Capacitor via a `ViewController` subclass; in Build 10 the plugin was compiled but not wired up, so tapping Google just spun
- **Sign-in failures now show an error message** — any failure in the OAuth flow (plugin error, code exchange failure, etc.) is now caught and displayed instead of leaving the spinner stuck

## [2026-04-30] — Build 10: Google sign-in fixed with native OAuth handler; email sign-up error messaging improved

- **Google sign-in finally fixed** — replaced the in-app browser approach with Apple's dedicated OAuth handler (`ASWebAuthenticationSession`), which is the only iOS mechanism that reliably handles the redirect back to the app after Google authentication; previous builds used `SFSafariViewController` which cannot forward custom URL scheme redirects on iOS 11+
- **Cancelled Google sign-in clears the button** — tapping "Cancel" on the Google sign-in sheet no longer leaves the button spinning
- **Email sign-in: "email not confirmed" now shows a clear message** — instead of "Incorrect email or password", users who haven't confirmed their email now see "Please confirm your email address before signing in"
- **Sign-up toast updated** — after creating an account, the message now correctly tells users to check their email to confirm, rather than implying they're already in

## [2026-04-30] — Build 9: Google sign-in fixed — opens native Safari sheet to preserve auth session

- **Google sign-in root cause fixed** — previous builds lost the PKCE security token because the app's WebView was navigating away to Google, clearing session storage; sign-in now opens in a native Safari sheet instead so the app stays mounted and the auth handshake completes correctly
- **Cancelled sign-in no longer freezes the button** — if you dismiss the Google sheet without completing sign-in, the spinner now clears properly
- **Sign-in failure no longer leaves the app stuck** — error state is now reset correctly if the OAuth callback fails for any reason

## [2026-04-30] — Build 8: Google sign-in spinner fixed — app navigates correctly after OAuth completes

- **Google sign-in now lands on the home screen** — after returning from Google authentication, the app was getting stuck on the sign-in spinner even though the account was successfully created; fixed by explicitly refreshing the session state rather than waiting for an event that wasn't reliably firing on iOS

## [2026-04-30] — Build 7: Google sign-in fixed — handles both OAuth flows, sign-in now completes

- **Google sign-in working** — fixed the root cause: the app was only handling one type of OAuth response (PKCE) but Supabase was sending the other type (implicit, with tokens in the URL). Both are now handled so sign-in completes correctly
- **OAuth configuration hardened** — Supabase client explicitly configured for Capacitor native to prevent any automatic URL interception interfering with the sign-in flow

## [2026-04-30] — Build 6: Google sign-in deep link handler — OAuth now completes correctly on iOS

- **Google sign-in fixed end-to-end** — app now catches the OAuth callback URL when iOS returns from the browser and completes the sign-in session automatically
- **URL scheme registered** — `hiitfitness://` registered in iOS so the system knows to open the app when Google redirects back after authentication

## [2026-04-30] — Build 4: Google sign-in fix, keyboard navigation on signup, location permission string

- **Google sign-in fixed** — OAuth now redirects correctly back into the app on iOS using a deep link; was previously failing with a 400 error on TestFlight
- **Signup keyboard** — "Next" button moves between name → email → password → confirm password; confirm password field scrolls into view when focused so it's never hidden behind the keyboard
- **Signup form scrollable** — form now scrolls with plenty of padding at the bottom so no field is ever obscured by the iOS keyboard
- **Location permission string** — added `NSLocationAlwaysAndWhenInUseUsageDescription` to clear the App Store compliance warning from build 3

## [2026-04-29] — First TestFlight build: monitoring, analytics, account deletion, GPS share cards

- **Push notifications** — production APNs entitlement added; app will now receive push notifications on TestFlight and App Store builds
- **Privacy permissions** — camera, photo library, location, and microphone usage strings added to satisfy App Store review requirements
- **Sentry error monitoring** — crashes and errors now reported to Sentry (EU endpoint, production builds only)
- **PostHog analytics** — 7 key events tracked: sign-up, workout started/completed, meal logged, plan generated, premium feature viewed, subscription checkout started
- **Account deletion** — in-app delete account flow built with 30-day soft-delete and typed confirmation modal; required for App Store approval (Guideline 5.1.1)
- **GPS workout share card** — route card now draws the GPS track directly on canvas (Strava-style); faster, no external dependencies
- **AI provider** — all 10 AI edge functions switched to Gemini direct endpoint; quota enforcement and timeout handling improved
- **Community feed** — realtime updates now use targeted state changes instead of full re-fetch; infinite scroll with cursor pagination added
- **Database** — performance indexes on community and HIIT Score tables; allergens column on recipes; soft-delete columns across 12 user data tables
- **Handoff tracker** — HANDOFF.md added to repo documenting account transfers required at owner handover
