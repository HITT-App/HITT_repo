# Google Play — Data Safety form

**Filed via:** Play Console → App content → Data safety
**Must exactly mirror:** `src/content/privacy-policy.md` — the Play Store flags mismatches with the privacy policy and can take the app down (not just reject) if the two drift.

For each category Google asks you to walk through:
- Whether the data is **collected**
- Whether the data is **shared** with any third party
- Whether collection is **optional or required**
- The **purposes** (multi-select)
- Confirmations about **encryption in transit** and **user deletion**

## Cross-cutting answers (top of the form)

- **Encrypted in transit?** ☑ Yes (HTTPS to Supabase, Google, Apple, ElevenLabs, PostHog, Sentry)
- **User can request deletion?** ☑ Yes (in-app: Settings → Delete account; also by email to hiit.co.uk@gmail.com)
- **Committed to Play Families Policy?** No — HIIT is not directed at children under 16 (per Terms §1)
- **Independent security review?** No (unless we later add SOC 2)

---

## Personal info

### Name — **Collected**
- **Purposes:** App functionality, Account management
- **Optional/Required:** Optional (display_name is optional; sign-up can use email only)
- **Shared:** No

### Email address — **Collected**
- **Purposes:** App functionality, Account management, Communications
- **Optional/Required:** Required (for account sign-up)
- **Shared:** No

### User IDs — **Collected**
- **Purposes:** App functionality, Analytics
- **Optional/Required:** Required
- **Shared:** No

### Address — **Not collected**

### Phone number — **Not collected**

### Race and ethnicity — **Not collected**

### Political or religious beliefs — **Not collected**

### Sexual orientation — **Not collected**

### Other personal info — **Collected** (gender, age band for fitness recommendations — optional)
- **Purposes:** App functionality (personalising workouts / calorie targets)
- **Optional/Required:** Optional
- **Shared:** No

---

## Financial info

**Nothing collected.** HIIT is free with no in-app purchases at present. If we add paid subscriptions, Play's own billing handles it and the payment info never touches HIIT's servers.

---

## Health and fitness

### Health info — **Collected**
Includes: heart rate, resting heart rate, sleep data, weight, body fat, blood pressure (only if user manually enters), body composition from AI body scan

> **Do not re-add HRV.** It was removed from the manifest, the permission request and this form on 2026-08-01 after a Health Connect *Minimum Scope* rejection. Verified 2026-08-18: no code reads or writes it and `health_metrics` holds zero HRV rows. Re-declaring it would contradict the Health Connect declaration.
- **Purposes:** App functionality, Personalisation
- **Optional/Required:** Optional (each integration is opt-in — HealthKit / Health Connect / manual entry)
- **Shared:** No (with the narrow user-opt-in exception: when the "Use my health data for AI coaching" toggle is ON in Settings, a subset is sent to Google Gemini for personalised coaching responses — default OFF; disclosed in privacy policy §3.7)

### Fitness info — **Collected**
Includes: workouts, exercise sessions, steps, distance, calories burned, GPS routes, personal bests
- **Purposes:** App functionality, Personalisation, Analytics
- **Optional/Required:** Optional (each integration is opt-in)
- **Shared:** No (same AI-coaching exception as above)

---

## Location

### Approximate location — **Not collected**

### Precise location — **Collected**
- **Purposes:** App functionality (GPS-tracked outdoor workouts — runs, walks, cycles)
- **Optional/Required:** Optional (only when user starts a GPS activity)
- **Shared:** No

---

## Photos and videos

### Photos — **Collected**
- Profile photos, meal photos (food estimation), body scan photos, progress photos
- **Purposes:** App functionality, Personalisation
- **Optional/Required:** Optional
- **Shared:** No (meal photos may be sent to Google Gemini for food estimation if user submits — disclosed in privacy policy §3.6)

### Videos — **Not collected**

---

## Audio files

### Voice or sound recordings — **Collected**
- User microphone input when interacting with the AI Coach via voice
- **Purposes:** App functionality
- **Optional/Required:** Optional (voice input is optional; text is the default)
- **Shared:** No (voice audio is processed by ElevenLabs speech-to-text — disclosed in privacy policy §3.6)

### Music files — **Not collected**

### Other audio files — **Not collected**

---

## Files and docs

**Nothing collected.**

---

## Calendar

**Nothing collected.**

---

## Contacts

**Nothing collected.**

---

## App activity

### App interactions — **Collected**
- Screen views, feature taps, workouts started/completed, meals logged
- **Purposes:** Analytics, App functionality
- **Optional/Required:** Required (analytics via PostHog; users can opt out in Settings)
- **Shared:** No (aggregated to PostHog, disclosed in privacy policy §6)

### In-app search history — **Not collected**

### Installed apps — **Not collected**

> Was previously declared as collected. **Wearable detection is iOS-only** —
> `WearableDetectPlugin` gates on `getPlatform() === "ios"` and returns an empty result on
> Android, and the merged Android manifest requests no `QUERY_ALL_PACKAGES`. On Android the
> app infers the wearable from `activity_logs` history instead. This form covers the Android
> app, so the honest answer is Not collected. **If an Android package probe is ever added,
> this flips back to Collected.**

### Other user-generated content — **Collected**
- Community posts, comments, reactions, direct messages
- **Purposes:** App functionality
- **Optional/Required:** Optional (community is opt-in via onboarding)
- **Shared:** No (visible to other HIIT users in-app; not shared with third parties)

### Other actions — **Not collected**

---

## Web browsing

**Nothing collected.**

---

## App info and performance

### Crash logs — **Collected**
- **Purposes:** Analytics (Sentry error reporting)
- **Optional/Required:** Required
- **Shared:** No (Sentry EU region only, disclosed in privacy policy §6)

### Diagnostics — **Collected**
- Performance metrics, feature load times
- **Purposes:** Analytics
- **Optional/Required:** Required
- **Shared:** No

### Other app performance data — **Not collected**

---

## Device or other IDs

### Device or other IDs — **Collected**
- Apple Push Notification service tokens (iOS) and FCM registration tokens (Android) so we can deliver notifications the user has enabled
- **Purposes:** App functionality
- **Optional/Required:** Required (once notifications are enabled by the user)
- **Shared:** No — tokens are used only to POST notifications through APNs (Apple) / FCM (Google) as delivery pipes

---

## Data type NOT prompted for but worth flagging

If Google prompts about the following separately: HIIT does NOT sell any user data, does NOT use any user data for advertising, is NOT part of any cross-context behavioural advertising, does NOT participate in the IDFA / GAID advertising ID chain.

---

## Final review checklist before submitting

Before you hit Submit on Data Safety, re-read the privacy policy at `src/content/privacy-policy.md` sections 3 and 5 and check that:
1. Every "Collected" ticked above appears in the policy's list of collected data
2. Every "Not collected" answer is genuinely not something the code path touches
3. The sharing answers match §6 of the policy (service providers list)
4. The AI-coaching opt-in exception is worded consistently in both

Google flags any drift between Data Safety and Privacy Policy and can take the app down without warning — the two must be kept in lockstep.
