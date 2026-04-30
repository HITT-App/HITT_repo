# HITT App Changelog

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
