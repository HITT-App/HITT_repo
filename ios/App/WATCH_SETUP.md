# Apple Watch App — Xcode Setup

The source code is written. This is the one-time Xcode setup needed before it builds.

## Step 1 — Add the watchOS target

1. Open `ios/App/App.xcodeproj` in Xcode
2. **File → New → Target**
3. Select **watchOS** tab → choose **Watch App** → Next
4. Fill in:
   - Product Name: `HIITWatch`
   - Bundle Identifier: `io.ionic.hiitfitness.watchapp` (or match your iPhone app ID + `.watchapp`)
   - Team: same as the iPhone target
   - Watch Companion App: select the `App` iPhone target
   - Include Notification Scene: No
   - Language: Swift
   - Interface: SwiftUI
5. Click **Finish** — Xcode will create a default Watch target

## Step 2 — Replace generated files with the real ones

Xcode creates placeholder files. Delete them and add the real ones:

1. In the Project Navigator, expand the `HIITWatch` group Xcode just made
2. Delete the generated `ContentView.swift`, `HIITWatchApp.swift` (move to Trash)
3. Right-click the `HIITWatch` group → **Add Files to "App"**
4. Navigate to `ios/App/HIITWatch/` and add:
   - `HIITWatchApp.swift`
   - `Views/` folder (all 4 files)
   - `Managers/` folder (both files)
   - `HIITWatch.entitlements`

## Step 3 — Add HIITWatch target capabilities

Select the `HIITWatch` target → **Signing & Capabilities**:
- Add **HealthKit** capability
- Set the entitlements file to `HIITWatch/HIITWatch.entitlements`

## Step 4 — Add iPhone-side files to the App target

Right-click the `App` group → **Add Files to "App"**, making sure target membership is `App` (not HIITWatch):
- `App/WatchBridge.swift` ← already exists
- `App/WatchPlugin.swift` ← already exists

(If they were already in the project from being created, just check their Target Membership in the File Inspector.)

## Step 5 — Build and test

1. In Xcode, select the `HIITWatch` scheme and an Apple Watch simulator
2. Build — it should compile cleanly
3. To test end-to-end, run the iPhone scheme on a simulator first, then the Watch scheme

## What each file does

| File | Purpose |
|------|---------|
| `HIITWatchApp.swift` | Watch app entry point |
| `Views/ContentView.swift` | Tab navigation (Today / Active / Stats) |
| `Views/TodayView.swift` | Shows today's workout; Start button |
| `Views/ActiveWorkoutView.swift` | Live HR, timer, calories during workout |
| `Views/StatsView.swift` | Steps, HR, calories, distance |
| `Managers/WatchSessionManager.swift` | WatchConnectivity + HealthKit reads |
| `Managers/WorkoutManager.swift` | HKWorkoutSession (records to Apple Health) |
| `App/WatchBridge.swift` | iPhone side — sends workouts to Watch |
| `App/WatchPlugin.swift` | Capacitor plugin exposing bridge to React |
| `src/plugins/WatchPlugin.ts` | JavaScript API for sending workouts to Watch |

## JavaScript API (how the React app sends workouts)

```typescript
import { sendWorkoutToWatch, onWatchWorkoutEvent } from "@/plugins/WatchPlugin";

// Send today's workout when schedule loads
await sendWorkoutToWatch({
  id: workout.id,
  name: workout.name,
  durationMinutes: 45,
  exercises: workout.exercises.map(e => ({
    id: e.id,
    name: e.name,
    sets: e.sets,
    reps: e.reps,
  })),
});

// Listen for workout started/completed events from Watch
const unsub = onWatchWorkoutEvent((event) => {
  if (event.event === "workoutCompleted") {
    console.log(`Workout done: ${event.durationSeconds}s, ${event.calories} cal`);
    // Log to Supabase here
  }
});
```
