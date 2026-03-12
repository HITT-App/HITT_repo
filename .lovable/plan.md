

## Enhanced Activity/Workout Completion Summary with Auto-Post

### What we're building
A Strava-style completion summary screen (inspired by the screenshot) for both **ActivityLive** and **WorkoutPlayer**, showing key stats (distance, pace, time, achievements), a route map preview, and a toggle to auto-share to the community feed. Users can choose to post or skip before navigating away.

### Changes

#### 1. ActivityLive completion screen (`src/pages/ActivityLive.tsx`)
- Replace the current basic completion card with a rich dark summary:
  - **Top stats row**: Distance, Pace, Time, Achievements count (horizontal, bold values)
  - **Achievement banner**: If personal best or milestone, show a congratulatory card (e.g. "You just set your 2nd fastest 10K!")
  - **Route map snapshot**: Render a static `LiveActivityMap` showing the GPS trail
  - **Kudos/social row**: Show "Share to Feed" toggle (on by default)
  - **Action buttons**: "Share & Done" / "Done" depending on toggle
- Auto-post logic: currently only WorkoutPlayer posts — add the same for ActivityLive, including `workout_data` with distance, pace, duration, calories, and activity type
- The post is only created when user confirms (not silently like WorkoutPlayer currently does)

#### 2. WorkoutPlayer completion screen (`src/pages/WorkoutPlayer.tsx`)
- Redesign the existing completed screen to match the same Strava-style layout:
  - **Top stats row**: Duration, Calories, BPM (keep existing data)
  - **Achievement banner**: Show badge earned or streak milestone
  - **Share toggle**: Let user opt-in/out of community post (currently auto-posts silently)
  - Move the auto-post from `completeWorkout()` into the "Share & Done" button handler so users control it
- Keep the rating section but make it more compact

#### 3. Shared completion summary component (`src/components/workout/CompletionSummary.tsx`)
Create a reusable component used by both pages:
- Props: `stats` array (label/value pairs), `achievementMessage?`, `mapPositions?` (for GPS trail), `onShare`, `onDone`, `activityTitle`
- Renders the dark card layout, stats row, optional map, share toggle, and buttons
- Handles the community post insert internally when share is confirmed

### Technical details
- **No DB changes needed** — uses existing `community_posts` table with `workout_data` JSON field
- Move the auto-post from `completeWorkout()` in WorkoutPlayer to a user-controlled action
- ActivityLive already has GPS positions array — pass it to the static map in the summary
- Achievement detection: check `newBadges` from `useStreaksAndBadges` + compare personal bests from `workout_progress`/`activity_logs`

