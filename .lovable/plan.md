

# Activity Live Screen Improvements

The current screen works but can be elevated with better visual polish, more data, and smoother interactions. Here's the plan:

## 1. Visual & Layout Refinements
- **Larger timer** with hours support (HH:MM:SS) for longer sessions
- **Gradient accent border** on stat cards instead of plain borders
- **Animated pulse ring** around the "Hold to Finish" button using CSS animation (instead of only showing on hold)
- **Smoother stat panel** — remove the harsh shadow, use a subtle gradient fade from map to panel

## 2. More Useful Live Stats
- Add **current speed** (km/h) calculated from recent GPS points
- Add **elevation** data from GPS coords (if available)
- Show **split times** — pace for the current kilometer segment
- Display stats in a **2x2 grid** (calories, distance, pace, speed) with better iconography

## 3. Better Controls
- **Lock button** to prevent accidental taps during activity (locks pause/finish)
- Animate the **pause/play button** with a scale transition
- Add a subtle **haptic-style pulse animation** on the finish button border to hint at the hold gesture
- Show a **mini elapsed time** floating on the map area so it's always visible even when scrolled

## 4. Auto-Pause Banner Improvement
- Make the auto-pause banner more prominent with an **amber/yellow color** and a subtle bounce animation
- Add "Tap to resume" interaction directly on the banner

## 5. Completion Screen Polish
- Add **confetti animation** on completion (canvas-confetti is already installed)
- Show a **route map thumbnail** on the completion card
- Better stat presentation with colored rings/progress indicators

## Technical Approach
- All changes in `src/pages/ActivityLive.tsx` and `src/components/activity/LiveActivityMap.tsx`
- CSS animations via Tailwind keyframes in `tailwind.config.ts`
- Speed calculation from last 3-5 GPS points for smoothing
- Use existing `canvas-confetti` package for completion celebration

