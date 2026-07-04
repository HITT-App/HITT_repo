# HITT — Google Play Launch Scope

**Status:** Scoping (2026-07-04, revised after review-agent pass)
**Estimated size:** Large. 5–6 sprints of engineering + a 14-day elapsed-time gate before production.

## ⚠️ Do these three things NOW, before anything else

Two are prerequisites with multi-day/week lead times. The third is a genuine boot-time crash on Android.

1. **Start Google Play developer account identity verification today.** 2–7 days to clear. Nothing else can ship without it.
2. **Register for a Firebase project** in the same Google account (deferrable until Phase B if you'd rather not stack accounts on day one).
3. **Fix the Capacitor plugin guards.** `WatchPlugin.ts` and `health-write.ts` currently gate iOS-only native calls on `Capacitor.isNativePlatform()`, which returns `true` on Android. Two of the exports would throw at Android boot:
   - `onWatchWorkoutEvent` (`WatchPlugin.ts:157-164`) is called from `watch-event-handler.ts:13` at app start (initialised in `main.tsx`). On Android, `addListener("workoutEvent", ...)` targets a plugin that doesn't exist and throws before the React tree even mounts.
   - `sendWorkoutToWatch` / `sendStructuredWorkoutToWatch` (`WatchPlugin.ts:96-109`) are awaited from `WorkoutPlayer.tsx:715/739` and `WorkoutDetail.tsx:139` on the primary CTA. Same story — throws on Android, kills the workout-start flow.
   - `health-write.ts:39/51` swallows the throw silently, so every Android GPS workout would skip the Health Connect write with no visible error. Not "stub", **replace with capgo's Android write path**.

   The concrete fix pattern: change every `Capacitor.isNativePlatform()` guard in these files to `Capacitor.getPlatform() === "ios"`. That takes ~30 minutes. Everything else in the scope assumes this is done.

I called this "just stub the plugins" in the first draft — I was wrong. The current code will not boot on Android without those guards flipped.

---

## Why we're doing this

iOS is on TestFlight and in App Store review. The privacy policy (§2) already covers Android. Terms of Service references "iPhone and Android apps". Marketing copy assumes a cross-platform product. Time to actually ship it.

Vanessa's brief: "get the app as it is ready for Google Store". That reads as **minimal-viable Android** — an installable, functional Android build in Play Console internal testing that mirrors iOS behaviour where the platform allows, and gracefully degrades where it doesn't. Full feature parity comes later.

---

## Current Android readiness

**Good news:**
- `@capacitor/android` 8.2.0 already in `package.json`.
- Bundle ID `com.hiitfitness.app` is portable — same string works on Play.
- Web layer (React + Capacitor) is platform-agnostic. Every UI, hook, and Supabase call already works if you point Chrome at `dist/index.html`.
- Auth: `@capgo/capacitor-social-login` supports Google Sign-In natively on Android; Sign in with Apple works via web fallback.
- Health: `@capgo/capacitor-health` wraps Health Connect on Android — same TS API as HealthKit on iOS. Green field, but the wiring exists.

**What's missing:**
1. No `android/` platform folder — never run `bunx cap add android` on this repo.
2. Four custom native plugins are iOS-only Swift files with no Android counterpart:
   - `WatchPlugin` (WCSession + `isWatchPaired`) — no equivalent on Android; degrade to phone-only.
   - `HealthWritePlugin` — write to Health Connect via the capgo plugin instead.
   - `WearableDetectPlugin` (URL-scheme probes) — Android needs `PackageManager.getInstalledApplications` or a different probe.
   - `LiveActivity` — iOS-only (Lock Screen widget); Android has no equivalent, degrade to normal notifications.
3. Push notifications: currently APNs. Android needs FCM (Firebase Cloud Messaging) via `@capacitor/push-notifications`. Supabase edge fn `notify-user` needs a branch for `platform=android` that hits FCM instead of APNs.
4. No release signing key. Play requires a signed AAB.
5. No Play Console app listing, screenshots, or content rating declaration.
6. Icons + splash screen assets currently exist only in iOS asset catalog. Android needs its own `res/mipmap-*/ic_launcher.png` set.
7. Apple Watch / Garmin CIQ integrations are iOS-only by nature (obviously). The wearable-launch-card UI needs to detect Android and either offer Garmin Connect deep-linking OR hide the affordance.

---

## What we're not doing (yet)

- Apple Watch or Live Activity parity on Android — no equivalent.
- Rewriting `WatchPlugin` or `LiveActivity` for Android. Stub them: return `{ paired: false }`, no-op.
- Wear OS companion app. Big project, separate scope, not needed for launch.
- Perfect UI parity on Material Design theming. Android will inherit the current dark theme; Material tweaks come later.

---

## Work items

### Phase A — Get an installable AAB

1. **Add the Android platform** — `bunx cap add android`. Creates `android/` folder with the Gradle project.
2. **Verify `AndroidManifest.xml`** matches iOS's Info.plist intent — permissions for `INTERNET`, `ACCESS_FINE_LOCATION`, `ACTIVITY_RECOGNITION`, `POST_NOTIFICATIONS` (Android 13+), and `ACCESS_BODY_SENSORS`. Health Connect needs specific per-record-type permissions declared.
3. **Icons + splash** — export `resources/icon.png` and `resources/splash.png` to Android densities via `@capacitor/assets` (or manual export). CLAUDE.md doesn't currently mention this tool; add it as a dep.
4. **Stub the iOS-only plugins for Android:**
   - `WatchPlugin.ts` already guards with `Capacitor.getPlatform() !== "ios"` in `isWatchPaired` (I did this) — verify all other exports do the same. Anything that would call a non-existent Android native method must short-circuit.
   - `LiveActivity` — already skips on non-iOS per `isIOSSimulator` guard; verify the same for Android.
   - `WearableDetectPlugin` — degrade to always returning `{}` on Android for now (result: `getPrimaryWearable` falls back to activity_logs history, same as an Apple Watch user with no logs used to do).
5. **Release signing** — generate a keystore (`keytool -genkey -v -keystore hitt-release.keystore -alias hitt -keyalg RSA -keysize 2048 -validity 10000`). Store it OUTSIDE the repo, add path + credentials to `~/.gradle/gradle.properties`. Never commit the keystore.
6. **Wire signing into `android/app/build.gradle`** — release build type reads the keystore from gradle.properties.
7. **Add deploy script `~/bin/deploy-android.sh`** paralleling the iOS one — builds AAB, verifies signature, points at the file for manual upload to Play Console. Later: automate via Play Console API + service account.
8. **Emulator smoke test** — install debug APK on an Android emulator, verify sign-in, home page, community feed, workout start, meal logging, activity_logs write. Nothing needing native must crash.
9. **Play Console setup** — create app, package name `com.hiitfitness.app`, upload keystore public cert, upload first internal-testing AAB.

**Deliverable:** an AAB in Play Console internal-testing track that installs and does everything the iOS app does except Watch/Live-Activity/APNs push.

### Phase B — Notifications on Android

10. **Firebase project + FCM** — create Firebase project, add Android app (`com.hiitfitness.app`), download `google-services.json`, drop into `android/app/`. Update gradle to apply Google services plugin.
11. **Register device token** — `@capacitor/push-notifications` already handles registration; ensure the `device_push_tokens` table row includes `platform: 'android'` (currently we filter for iOS only in `notify-user`).
12. **Extend `notify-user` edge function** — branch on `platform`: iOS routes to APNs (existing), Android routes to FCM via HTTP v1. Requires an FCM service account JSON in Supabase Vault.
13. **Test each notification category** on an Android device: follow / comment / DM / PB share / weekly recap / workout reminder morning + evening.

**Deliverable:** all six notification categories arriving on Android.

### Phase C — Health Connect + native niceties

14. **Health Connect wiring** — `@capgo/capacitor-health` on Android reads/writes via Health Connect. Same TS API, no UI change. Need to declare per-record-type permissions in `AndroidManifest.xml` and handle first-run permission grant flow.
    - **Blocker:** Google's Health Connect data-access declaration form is reviewed **manually per record type** and typically takes **weeks**, not days. Start it the moment we know which records we need.
    - **Gap:** `capgo/capacitor-health` v8.4.0 does NOT expose `ExerciseRoute` (Health Connect's equivalent of `HKWorkoutRoute`). GPS route polylines from a HITT run won't write to the Fit map. Three options:
      - (a) Ship Android without route polylines in Fit — activity + duration + distance still land, just no map. Cleanest for launch.
      - (b) Submit an upstream PR to capgo adding `ExerciseRoute` support. Best long-term but blocks C.
      - (c) Write a small Android-only native plugin `HealthConnectRoutePlugin` — mirrors the iOS pattern.
    - Also: HRV semantics differ (Health Connect uses RMSSD, HealthKit uses SDNN — normalise in the shared upsert). `bodyFat` write needs a separate Health Connect permission group.
15. **Wearable detection on Android** — decide product: Garmin Connect + Fitbit are the realistic wearables. Reuse the `getPrimaryWearable` history-based logic; the Watch-paired fallback I added is iOS-only and stays so. On Android, the `WearableLaunchCard` for Garmin users should deep-link to `com.garmin.android.apps.connectmobile` (verify via `PackageManager`).
16. **Google Sign-In wiring** — social-login plugin needs OAuth client ID configured (Google Cloud Console). Sign in with Apple stays via web fallback; not required on Android but harmless to keep as an option.
17. **Data Safety questionnaire** — Play requires it to **exactly mirror** the Privacy Policy. Mismatch triggers takedown, not just review rejection. Do this from the Privacy Policy line-by-line as the source of truth.
18. **Other Play console forms:** IARC content rating, target audience (16+ — matches our policy), ads declaration (none), financial features (none), government-app (no), news-app (no). Each is its own form.
19. **API 35 target SDK** — hard-fail on upload since Aug 2024. Verify `variables.gradle` `targetSdkVersion` = 35 after `cap add`. Capacitor 8.2 defaults should be fine but confirm.
20. **16 KB page size native libs** — enforced from Nov 2025. Play's bundle explorer scans for non-conforming `.so` files. Check every native dep (background-geolocation, live-activity fallback, health, social-login) after building.

**Deliverable:** feature-parity Android launch (minus Watch).

### Phase D — Store listing

18. Screenshots (Android): 6 phone screenshots + 1 feature graphic (1024×500) + icon (512×512). Reuse iOS screenshots where they aren't iPhone-frame-specific.
19. Store description (short + long) — reuse App Store copy.
20. Content rating questionnaire.
21. Target audience declaration (16+, matching the Privacy Policy and Terms).
22. Privacy policy URL: `https://www.hiituk.com/privacy` (already hosted).

---

## Owner decisions

Two things I need from Vanessa before Phase A kicks off:

1. **Keystore custody.** Once we generate the release keystore we cannot lose it — it's what proves this is HITT to Play, forever. Recommended: keep the .keystore file and password in 1Password (or your password manager); commit a `.gitignored` `keystore.properties` file locally. Alternative: use Play's Play App Signing feature so Google holds the upload key and re-signs. My lean: **Play App Signing** — one less thing to lose. It also means Google can rotate the app signing key if compromised. You keep only the "upload key" locally, and losing it is recoverable via a Play Console reset.

2. **Launch cadence.** Do you want to (a) push Phases A + D immediately for internal testing (installable but no push notifications, no Health Connect), OR (b) hold until B + C are done and launch to closed testing with parity? A gets feedback sooner and gets us used to the Play deploy loop; B risks a longer stretch of "internal only" with no external testers.

---

## Rollout

**Realistic timeline** (revised — original was 50% optimistic):

- **Day 0 (today):** Start Play developer account identity verification. Fix the plugin guards (§ "Do these three things NOW"). Both take a day; verification then waits 2–7 days.
- **Sprint 1–1.5:** Phase A → first AAB in internal testing. First submission usually rejected once for a Play console form (data safety, target-audience, or a missing permission declaration). Budget for the iterate.
- **Sprint 2.5:** Phase B → FCM push live on Android.
- **Sprint 3–4.5:** Phase C → Health Connect. Includes the multi-week Google review of the Health Connect data-access declaration form (submit as early as possible; don't wait until code is ready).
- **Sprint 5:** Phase D → store listing complete, closed-testing invitees invited.
- **+14 days elapsed after Sprint 5:** Google's mandatory 14-day / 12-tester closed-testing gate expires; app becomes eligible for production release.

**Total wall-clock estimate: 5–6 sprints of work, plus the fixed 14-day gate at the end. Two months to production is realistic for one person, one sprint per week.**

Each code phase is one Play Console upload. Internal testing releases are instant; closed testing needs review (~day); production needs the full 14-day gate.

**Not recommended:** trying to ship all phases at once. First AAB submission always has surprises. Iterate small.

**The 12-tester rule (personal accounts, post-Nov-2023):** Google requires new personal developer accounts to run closed testing with **≥12 opted-in testers for ≥14 continuous days** before promotion to production is allowed. Internal testing is exempt but can't be promoted straight to production. You have two ways out:
- (a) recruit 12 friends/family with Google accounts to join a closed track by end of Sprint 4; or
- (b) register as a business account with a D-U-N-S number — adds weeks but bypasses the tester rule.

Recommendation: option (a). 12 opted-in installs from the HITT Discord + your family should be trivial.

---

## Audit + docs closure

- No new audit rules needed until Phase C — the audit currently doesn't cover Android at all. Add `AND-*` category to `tests/run.ts` once we have code in `android/` worth auditing.
- Update `CLAUDE.md` with an Android section as soon as the platform folder lands, so any future Claude session knows the deploy script + signing convention.
- Update Terms of Service once Android launches to say "iOS and Android apps" in present tense; currently it says "iPhone and Android apps" but Android was speculative.

---

## Open questions

- **Wear OS.** Do we care? Probably not for launch, but worth flagging. Same rationale as Apple Watch — an Android wearable companion is its own epic.
- **Play Console developer account.** Do you already have one, or does this need setting up first? It's a one-time $25 fee and a few days for Google to verify.
- **Firebase project.** Same question. If we do FCM in Phase B, we need a Firebase project owner. Recommend it's the same account as Play Console for simplicity.
- **Google Sign-In OAuth branding.** Sign-in with Google needs a consent-screen brand review if we want anything beyond "unverified app" warnings. That's separate paperwork — flag if you want it done alongside launch.
