# HITT App Changelog

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
