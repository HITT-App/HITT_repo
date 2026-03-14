

## Problem Analysis

1. **Points not credited from GymTimer & ActivityLive**: Only `WorkoutPlayer` calls `recordWorkout()` (which awards leaderboard points). GymTimer and ActivityLive just call `logActivity.mutateAsync()` — no points, no streak update.

2. **Points not shown on CompletionSummary**: The completion screen has no UI for points earned. Users complete a workout and see zero feedback about rewards.

## Plan

### 1. Award points from ALL completion flows

**GymTimer.tsx** — After `logActivity.mutateAsync()` succeeds, call `recordWorkout()` from `useStreaksAndBadges`. Import the hook and wire it up.

**ActivityLive.tsx** — Same treatment: after `logActivity.mutateAsync()` succeeds in `handleFinish`, call `recordWorkout()`.

**LogActivity.tsx** — After manual activity log, call `recordWorkout()`.

This ensures every activity completion path awards points via the existing `POINTS.WORKOUT_COMPLETE` + streak bonus logic already in `useStreaksAndBadges`.

### 2. Show points earned on CompletionSummary

**CompletionSummary.tsx** — Add a new optional `pointsEarned` prop. When provided and > 0, render an animated "points earned" banner between the stats grid and the share section. Design: a glowing card with a star/zap icon, large point number with "+pts" suffix, and a brief label like "Leaderboard Points Earned".

**GymTimer.tsx, ActivityLive.tsx, WorkoutPlayer.tsx** — Calculate and pass `pointsEarned` to `CompletionSummary`. The value is `POINTS.WORKOUT_COMPLETE + (streak bonus)` — we can compute this from the streak data available via `useStreaksAndBadges`.

### 3. Visual improvements to CompletionSummary

- Add a subtle animated gradient/glow behind the trophy icon header
- Add a pulsing "XP earned" pill below the points banner showing the XP reward
- Make stats cards slightly more polished with subtle gradient borders
- Add confetti-like particle dots in the hero section background

### Files to modify
- `src/pages/GymTimer.tsx` — add `useStreaksAndBadges`, call `recordWorkout()`, compute & pass `pointsEarned`
- `src/pages/ActivityLive.tsx` — same
- `src/pages/WorkoutPlayer.tsx` — compute & pass `pointsEarned`
- `src/pages/LogActivity.tsx` — add `useStreaksAndBadges`, call `recordWorkout()`
- `src/components/workout/CompletionSummary.tsx` — add `pointsEarned` prop, render animated points banner, visual polish

