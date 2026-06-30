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
| **"New" = activity ended after `last_share_check_at`** (localStorage timestamp, updated each time we run this check). Hard ceiling: max 14 days back, no matter how long the gap. | Compassionate to users who take rest days / breaks — if they're away for 5 days and come back to a workout from day 1 of that gap, they should still get the offer. The 14-day ceiling stops us surfacing ancient history if someone returns after months. |
| **Show newest activity in the toast.** If more than one new activity was found, append a "+N more →" link in the toast that deep-links to Activity History. | Multiple activities in one sync (the week-off Garmin user) shouldn't be silently collapsed — surface that there's more to share, but don't make the toast a picker. |
| **Skip if `auto_share_prompts: false` in user prefs.** | A future opt-out toggle (Settings → Notifications → "Prompt to share after wearable activities") — phase 2. |

### UX — toast, not modal

A modal interrupts the user. A small toast at the top of the screen, persistent for ~10s, with a Share button and a tap-elsewhere-to-dismiss.

**Single new activity:**

```
┌─────────────────────────────────────────────┐
│  New activity from Garmin                   │
│  🏃 8.5 km run · 47 min · 612 kcal          │
│  [Share] [Not now]                          │
└─────────────────────────────────────────────┘
```

**Multiple new activities since last check:**

```
┌─────────────────────────────────────────────┐
│  Welcome back — 4 new activities synced     │
│  🏃 8.5 km run · 47 min · 612 kcal          │  ← newest
│  [Share this] [Browse all →] [Not now]      │
└─────────────────────────────────────────────┘
```

- Uses the existing `sonner` toast library (already wired throughout the app — `toast()` etc).
- "Share" / "Share this" → fires `hitt:open-jarvis-share` with the newest activity's stats → JarvisMode opens.
- "Browse all →" → navigates to `/activity-history` where each unshared activity has its own Share button (see "Activity History changes" below).
- "Not now" → dismisses, doesn't re-prompt this session.
- Auto-dismiss after 10s if untouched.

### Activity History changes (small companion build)

For the "Browse all" path to make sense, each activity row in `/activity-history` and `/activity/:id` needs a tappable Share icon — same dispatch, same JarvisMode overlay. This is exactly Option 1 from the original two-option proposal. **Build them together** — the toast's "Browse all" link points into screens that need to exist or the link is hollow.

A small "✨ New since your last visit" badge on each fresh activity in Activity History makes it obvious which ones the toast was talking about; tap the badge or the row to expand + share. Badge clears once the user shares or explicitly dismisses.

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
const SESSION_FLAG       = 'hitt_share_prompt_shown';
const LAST_CHECK_KEY     = 'hitt_last_share_check_at';   // ISO timestamp
const MAX_LOOKBACK_DAYS  = 14;
const SHAREABLE_SOURCES  = ['garmin', 'fitbit', 'whoop', 'oura', 'wahoo', 'polar', 'coros', 'apple_watch'];

export function maybePromptShareForNewActivity(inserted: InsertedActivity[], navigate: NavigateFn) {
  if (sessionStorage.getItem(SESSION_FLAG)) return;

  const lastCheckRaw = localStorage.getItem(LAST_CHECK_KEY);
  const lastCheck    = lastCheckRaw ? new Date(lastCheckRaw) : new Date(Date.now() - MAX_LOOKBACK_DAYS * 86_400_000);
  const floor        = new Date(Math.max(lastCheck.getTime(), Date.now() - MAX_LOOKBACK_DAYS * 86_400_000));

  // "New" = ended after last check, source is shareable, has meaningful stats
  const candidates = inserted.filter(a =>
    SHAREABLE_SOURCES.includes(a.source_platform) &&
    new Date(a.ended_at ?? a.started_at) > floor &&
    a.duration_seconds >= 60 &&
    a.calories > 0,
  ).sort((a, b) => +new Date(b.started_at) - +new Date(a.started_at));

  // Always advance the marker so next sync compares against this point,
  // even if we don't prompt (avoids re-prompting forever on a single bad row).
  localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

  if (candidates.length === 0) return;
  sessionStorage.setItem(SESSION_FLAG, '1');

  const winner = candidates[0];
  const extra  = candidates.length - 1;

  const title = extra === 0
    ? `New activity from ${displaySource(winner.source_platform)}`
    : `Welcome back — ${candidates.length} new activities synced`;

  toast(title, {
    description: `${emojiFor(winner.activity_type)} ${formatStats(winner)}`,
    duration: 10_000,
    action: {
      label: extra === 0 ? 'Share' : 'Share this',
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
    // sonner supports a single primary action; "Browse all" rendered as a
    // separate toast.message child link or as an extra toast that follows.
    // Implementation will pick one — see UX section.
  });

  // If there are more, hand a navigation breadcrumb back to the caller —
  // they decide whether to render the "+N more" as a chip in-toast or as a
  // subtle secondary toast underneath.
  if (extra > 0) {
    // ... render "+{extra} more →" link → navigate('/activity-history?since=' + lastCheckRaw)
  }
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

1. **User opens app every day, no activities for 3 days, then a Garmin run drops in.** `last_share_check_at` advances each open; when the run arrives it's newer than the marker → prompt fires. ✅
2. **User takes a 5-day break, comes back to 4 synced activities.** Marker is 5 days old; all 4 are after it; none are >14 days old; prompt fires with "4 new activities synced — share this [+ 3 more →]". ✅
3. **User on vacation for a month.** `last_share_check_at` is 30 days old. We cap lookback at 14 days, so anything older than 14 days back from now is silently ignored. Activities from the last 14 days of the trip still surface. ✅
4. **User force-kills, re-opens.** `sessionStorage` clears; `localStorage` `last_share_check_at` was already advanced on the prior open. So we won't re-prompt the same activity — it's older than the marker now. ✅
5. **Marker never set (first-ever launch).** Defaults to "14 days ago" so first sync after install still surfaces recent activity. ✅
6. **Bad HealthKit data — 0 calories / 0 duration / <60s.** Filtered out. Share card with "0 kcal" looks broken. ✅
7. **User opens HITT, sees prompt, taps Share, closes JarvisMode without actually sharing.** They've seen the offer; we don't re-prompt this session. They can still hit Share on the activity in Activity History (universal Share button). ✅
8. **User opens HITT, sees prompt, dismisses with "Not now".** `sessionStorage` flag set; no re-prompt this session. The activities stay flagged in Activity History as "✨ New since your last visit" for that session until they share or background-foreground (which advances the marker). ✅
9. **iPhone Locale / RTL.** Toast copy hard-coded English for v1; route through i18n if/when HITT adds it.

---

## Effort

- `syncHealthKitNow` return-shape change + edge function plumbing: 0.5 day
- `share-prompt.ts` helper with `last_share_check_at` logic + 14-day ceiling + multi-activity handling: 0.75 day
- Wiring + Apple Watch dedup logic: 0.5 day
- Activity History per-row Share icons + "✨ New since last visit" badge: 0.75 day
- Manual QA across sources (Garmin via Connect → HealthKit, Fitbit, Apple Watch dedup, iPhone HITT workout, the gap-of-days scenarios): 0.5 day

**Total: ~3 agent-days.**

(Up from the original 2 days — the multi-activity handling + activity-history companion build adds ~1 day but makes the "Browse all →" link in the toast actually meaningful.)

No new infra, no migrations, no native code, no plugin work. Pure TypeScript + an existing toast library + minor styling in Activity History.

---

## Open questions for owner

1. **14-day max lookback** — accept the recommendation, or tighten/loosen? Anything older than this is silently ignored even after a long break.
2. **Settings toggle in v1 or v2?** Recommend v2.
3. **Title copy** — "Welcome back — N new activities synced" vs "🏃 N new workouts ready to share" vs something more on-brand. Word-smithing.
4. **Share what for Apple Health generic activities?** Currently silenced. Should we prompt for them too if they look workout-like (≥10 min, ≥50 kcal)?
5. **"Browse all" rendering** — inline as a secondary action in the same sonner toast (sonner supports `action` + `cancel`, third button is hacky), OR as a follow-up toast that stacks underneath ("+3 more in Activity History"), OR a small chip on the right side of the toast? My instinct: stacked follow-up toast — gives the multi-activity case visual weight without cramming three buttons into the primary toast.

---

## Recommendation

Ship as a single follow-up task — call it CIQ-15b or just task #19. Two agent-days. Adds material value for the Garmin/Fitbit/Whoop user base who otherwise have no post-workout share moment. Pairs naturally with Option 1 (universal Share button on activity history) — together they cover both "auto-prompted" and "user-initiated" sharing for every activity source.
