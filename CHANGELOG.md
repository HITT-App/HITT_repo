# HITT App Changelog

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
