# Scope — Auto-prompt to share newly-synced HealthKit activities

**Status:** Scope only — not yet started
**Sister to:** Task #15 (Apple Watch post-workout share — shipped)
**Date:** 2026-06-30

---

## Problem

Task #15 wired up a "Share to phone" button on the HIITWatch Apple Watch app's completion screen. That triggers `hitt:open-jarvis-share` → JarvisMode opens with a pre-populated share card.

**But** that only works for activities started inside HITT (iPhone or Apple Watch). Activities recorded on Garmin / Fitbit / Whoop / Oura / Wahoo flow into HITT via:

```
Third-party watch  →  Vendor's iOS app  →  Apple Health  →  HealthKit sync  →  activity_logs
```

The user never sees a HITT prompt — the activity just silently appears in their history. Most users won't open the app immediately after finishing, and even if they do, they won't realise they can share. We lose every potential community / social share from non-HITT-watch users.

This scope: prompt the user the first time HITT sees a freshly-synced wearable activity in a given session.

---

## What we have to build on

| Piece | Where | Status |
|---|---|---|
| HealthKit foreground sync | `src/lib/healthkit-sync.ts:79-99` | Already runs on `visibilitychange` and `auth.onAuthStateChange` |
| Activity write | `supabase/functions/sync-healthkit/index.ts:91` via `upsertActivities` | Already returns inserted vs. updated counts |
| Dedup keys | `(user_id, source_platform, source_platform_id)` + `fingerprint_hash` | Already strict — only NEW activities count as inserted |
| Source-platform attribution | `src/lib/healthkit-sync.ts:22-35` | Maps `com.garmin`, `com.fitbit`, `com.whoop`, `com.ouraring`, etc. |
| Foreground app event | `App.addListener('appStateChange', ...)` (Capacitor) | Already in use elsewhere |
| Share dispatch | `window.dispatchEvent(new CustomEvent('hitt:open-jarvis-share', { detail }))` | Already wired — VoiceController picks it up |
| Share card overlay | JarvisMode w/ `sharePromptDetail` prop | Works for any source — just needs the right shape |

**Nothing new to build at the data layer** — every piece exists. This is purely UX wiring on top.

---

## Behaviour

### Trigger

After a successful HealthKit sync, if `inserted > 0` *and* at least one of the newly-inserted rows came from a third-party wearable source (`garmin`, `fitbit`, `whoop`, `oura`, `apple_watch`, `wahoo`, etc — see source list below), prompt once per app session.

**Sources that should prompt:**
- `garmin`, `fitbit`, `whoop`, `oura`, `wahoo`, `polar`, `coros` (third-party wrist devices)
- `apple_watch` *only if* the HITT Watch app didn't already trigger task-#15's share (we'd dedup by `source_platform_id`)

**Sources that should NOT prompt:**
- `hitt_phone` — user recorded on iPhone; they already got the WorkoutPlayer share flow
- `apple_health_native` — generic Apple Health entry, often noise (e.g. iPhone's pedometer)
- Anything with `activity_type` ∉ a known whitelist of share-worthy types

### Frequency rules

| Rule | Reason |
|---|---|
| **Once per app session.** Use `sessionStorage` flag `hitt_share_prompt_shown` — cleared on app kill, not on background. | Don't badger the user repeatedly if they open and close the app several times. |
| **Newest activity wins** if multiple are inserted in one sync. | A morning run + an evening ride both synced at once — pick the most recent. |
| **Skip if the activity is >24h old** (HealthKit's 48h sync window can backfill). | Stale share offers feel weird. The 24h gate keeps it post-workout-ish. |
| **Skip if `auto_share_prompts: false` in user prefs.** | A future opt-out toggle (Settings → Notifications → "Prompt to share after wearable activities") — phase 2. |

### UX — toast, not modal

A modal interrupts the user. A small toast at the top of the screen, persistent for ~10s, with a Share button and a tap-elsewhere-to-dismiss:

```
┌─────────────────────────────────────────────┐
│  New activity from Garmin                   │
│  🏃 8.5 km run · 47 min · 612 kcal          │
│  [Share] [Not now]                          │
└─────────────────────────────────────────────┘
```

- Uses the existing `sonner` toast library (already wired throughout the app — `toast()` etc).
- "Share" → fires `hitt:open-jarvis-share` with the new activity's stats → JarvisMode opens.
- "Not now" → dismisses, doesn't re-prompt this session.
- Auto-dismiss after 10s if untouched.

### Where it surfaces

Renders globally (the sonner toaster is already mounted on every page). No route-specific changes needed.

---

## Implementation sketch

### 1. Extend `syncHealthKitNow()` to return new-activity metadata

`src/lib/healthkit-sync.ts:103-168` currently calls the edge function and discards the response detail. Update it to return `{ insertedActivities: Array<{ id, activity_type, source_platform, duration_seconds, calories, started_at }> }` so the caller knows what's fresh.

The edge function (`supabase/functions/sync-healthkit/index.ts`) already has the upsert result with insert/update counts — we extend it to also return the inserted rows themselves (or just their IDs and key metadata).

### 2. New helper `maybePromptShareForNewActivity(insertedActivities)`

```typescript
// src/lib/share-prompt.ts
const SESSION_FLAG = 'hitt_share_prompt_shown';
const SHAREABLE_SOURCES = ['garmin', 'fitbit', 'whoop', 'oura', 'wahoo', 'polar', 'coros', 'apple_watch'];
const MAX_AGE_HOURS = 24;

export function maybePromptShareForNewActivity(inserted: InsertedActivity[]) {
  if (sessionStorage.getItem(SESSION_FLAG)) return;
  const candidates = inserted.filter(a =>
    SHAREABLE_SOURCES.includes(a.source_platform) &&
    (Date.now() - new Date(a.started_at).getTime()) < MAX_AGE_HOURS * 3600 * 1000,
  );
  if (candidates.length === 0) return;
  // Newest first
  const winner = candidates.sort((a, b) => +new Date(b.started_at) - +new Date(a.started_at))[0];
  sessionStorage.setItem(SESSION_FLAG, '1');

  toast(`New activity from ${displaySource(winner.source_platform)}`, {
    description: `${emojiFor(winner.activity_type)} ${formatStats(winner)}`,
    duration: 10_000,
    action: {
      label: 'Share',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('hitt:open-jarvis-share', {
          detail: {
            workoutId: winner.id,
            workoutTitle: displayTitle(winner.activity_type),
            durationMin: Math.round(winner.duration_seconds / 60),
            calories: winner.calories,
          },
        }));
      },
    },
    cancel: { label: 'Not now', onClick: () => {} },
  });
}
```

### 3. Wire it into the sync caller

In `healthkit-sync.ts` after a successful sync, call `maybePromptShareForNewActivity(result.insertedActivities)`.

### 4. Apple Watch dedup

If the inserted activity has `source_platform: 'apple_watch'` AND we already fired the task-#15 share for the same activity (the Watch app's `notifyPhoneShareRequested`), don't re-prompt. Track via a short-lived sessionStorage key set by `watch-event-handler.ts` whenever it dispatches `hitt:open-jarvis-share`, like `hitt_recent_watch_share=<workoutId>:<ts>`. The toast helper checks for it.

### 5. Settings toggle (Phase 2)

Add `auto_share_prompts` (boolean, default true) to `profiles` or local preferences. Toggle in Settings → Notifications. The helper short-circuits if disabled. Defer this — ship the on-by-default first, see how users react.

---

## Edge cases worth thinking through

1. **User finishes activity, lets phone sleep, opens HITT next day.** The activity is now >24h old. We skip the prompt to keep it post-workout-relevant. They can still share manually from Activity History (option 1 from our other scope).
2. **Multiple activities synced at once** (e.g. user wore the Garmin for a week without opening HITT). We pick only the most recent, and only if it's <24h old. The rest just appear in history.
3. **Activity has 0 calories / 0 duration** (bad HealthKit data). Helper filters these out — share card with "0 kcal · 0 min" looks broken.
4. **User opens HITT, sees prompt, taps Share, closes JarvisMode without sharing.** They've seen the offer; we don't re-prompt this session even if they re-foreground.
5. **Re-opening the app after a force-kill.** `sessionStorage` clears; the prompt re-fires for the same activity. Acceptable — the activity's <24h old, the user's clearly engaged. To prevent forever-loops on a single activity, we could persist a `last_prompted_activity_id` in localStorage — but probably over-engineering for v1.
6. **iPhone Locale / RTL.** The toast copy needs to flow through i18n if/when HITT adds it. For now hard-coded English.

---

## Effort

- `syncHealthKitNow` return-shape change + edge function plumbing: 0.5 day
- `share-prompt.ts` helper + display utilities: 0.5 day
- Wiring + Watch dedup logic: 0.5 day
- Manual QA across sources (Garmin via Connect → HealthKit, Fitbit, Apple Watch dedup, iPhone HITT workout): 0.5 day

**Total: ~2 agent-days.**

No new infra, no migrations, no native code, no plugin work. Pure TypeScript + an existing toast library.

---

## Open questions for owner

1. **24h cut-off** — accept the recommendation, or extend (e.g. share offer up to 48h)?
2. **Settings toggle in v1 or v2?** Recommend v2.
3. **Title copy** — "New activity from Garmin" vs "🏃 Just finished?" vs something more on-brand. Word-smithing.
4. **Share what for Apple Health activities?** Currently those are silenced. Should we prompt for them too if they look workout-like (≥10 min, ≥50 kcal)?

---

## Recommendation

Ship as a single follow-up task — call it CIQ-15b or just task #19. Two agent-days. Adds material value for the Garmin/Fitbit/Whoop user base who otherwise have no post-workout share moment. Pairs naturally with Option 1 (universal Share button on activity history) — together they cover both "auto-prompted" and "user-initiated" sharing for every activity source.
