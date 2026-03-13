

# Fix Indoor Activities Routing — Gym Timer Instead of GPS Map

## Problem
When selecting "Workout", "Weight Training", "HIIT", or "Yoga" from the Choose a Sport sheet, users land on the GPS map-based live tracker — which makes no sense for indoor/gym activities.

## Solution
Route indoor activities to a **gym-focused timer screen** instead of the map-based tracker. Two categories of sports:

**Outdoor (keep GPS map):** Run, Trail Run, Walk, Hike, Swim, Surf, Cycling
**Indoor (new timer UI):** Workout, Weight Training, HIIT, Yoga

### New Gym Timer Page (`src/pages/GymTimer.tsx`)
A full-screen timer experience designed for indoor workouts:
- Large centered elapsed timer (MM:SS or HH:MM:SS)
- Activity type icon and name at top
- Stats row: Sets, Calories (estimated from MET), Duration
- Set counter with +/- buttons (tap to log sets)
- Heart rate zone indicator (visual only, no sensor)
- Pause/Play and Hold-to-Finish controls (same pattern as ActivityLive)
- On completion, navigates to the same `CompletionSummary` but without a map component — so the share options show Stats Card, AI Cinematic, and Quick Photo (no Map Card)

### Changes to `ChooseSportSheet.tsx`
- Define an `INDOOR_SPORTS` set: `["Workout", "Weight Training", "HIIT", "Yoga"]`
- In `handleSelect`, route indoor sports to `/gym-timer?sport=X` and outdoor sports to `/activity-live?sport=X`

### Route Registration (`App.tsx`)
- Add `/gym-timer` route pointing to the new `GymTimer` page

### Files to create/modify
- **`src/pages/GymTimer.tsx`** (new) — Timer-focused indoor workout screen with set tracking, elapsed time, calories, and completion flow
- **`src/components/ChooseSportSheet.tsx`** — Split routing by indoor vs outdoor
- **`src/App.tsx`** — Register `/gym-timer` route
- **`src/components/AppLayout.tsx`** — Add `/gym-timer` to `HIDDEN_NAV_ROUTES`

