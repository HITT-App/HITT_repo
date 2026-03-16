

## Sport Tracking Classification

Currently the app has two tracking modes: GPS-based (`/activity-live`) for everything not in `INDOOR_SPORTS`, and timer-based (`/gym-timer`) for indoor activities. This means Swim and Surf incorrectly launch the GPS tracker.

### Recommended 3-tier sport classification

| Category | Sports | Tracker | Rationale |
|----------|--------|---------|-----------|
| **GPS-tracked** | Run, Trail Run, Walk, Hike, Cycling | `/activity-live` | Route/distance matters |
| **Timer + Sets** | Weight Training, Workout, HIIT | `/gym-timer` | Rep/set counting, no location |
| **Timer + Laps** | Swim, Surf, Yoga | `/gym-timer` (adapted) | Duration-focused, optional lap/interval counter |

### Changes

**1. `src/components/ChooseSportSheet.tsx`**
- Replace the binary `INDOOR_SPORTS` set with a sport config map that specifies which tracker each sport uses
- GPS sports → `/activity-live`, all others → `/gym-timer`
- Swim and Surf move to the gym-timer flow

**2. `src/pages/GymTimer.tsx`**
- Adapt the UI to be sport-aware: show "Laps" counter for water sports instead of "Sets"
- Update the label dynamically (e.g., "Sets" for Weight Training, "Laps" for Swim, "Rounds" for HIIT)
- Add sport-specific MET values for Swim (7.0) and Surf (3.5) which are currently missing
- Show a contextual icon matching the selected sport

**3. Sport metadata consolidation**
- Create a single `sportConfig` map in a shared file (e.g., `src/lib/sports.ts`) defining each sport's: name, icon, MET value, tracker type (`gps` | `timer`), counter label (`Sets` | `Laps` | `Rounds`), and color
- Both `ChooseSportSheet` and `GymTimer` import from this shared config, eliminating duplicated definitions

### Summary
Three files touched: new `src/lib/sports.ts` config, updated `ChooseSportSheet.tsx` routing, and enhanced `GymTimer.tsx` with sport-aware labels/counters. No database changes needed.

