

# Activity Live — Map-Dominant Redesign

Redesign the live tracking screen to match the reference screenshots: a full-screen map with a compact bottom panel, keeping our dark CartoDB theme.

## Layout Changes

```text
┌─────────────────────────┐
│  ← Activity Title    ⚙  │  ← floating header (transparent)
│                         │
│                         │
│    FULL-SCREEN MAP      │  ← map fills entire viewport
│    (dark theme kept)    │
│                         │
│   [GPS indicator]       │
│          [+][-] zoom    │  ← zoom controls on right side
│                         │
│  ◉ Route Mode ∨        │  ← optional route mode chip
├─────────────────────────┤
│ From: Current Location  │  ← compact bottom card (white/dark card)
│ ◉ 4.2km  🕐 23m  🔥128c│  ← inline stats row
│                         │
│  [ Pause ]   [ Finish ] │  ← controls row
└─────────────────────────┘
```

## Key Changes

1. **Full-screen map** — map takes `100vh` minus a small bottom card (~180px), instead of current 45vh split
2. **Compact bottom card** — rounded-t-3xl card overlaying bottom of map with:
   - Activity label / location text
   - Inline stats row: Distance, Duration (timer), Calories — horizontal, compact
   - Control buttons (pause/play + hold-to-finish) in a row
3. **Floating zoom controls** — add `+` / `−` buttons on the right side of the map (dark circular buttons matching reference)
4. **Keep dark CartoDB tiles** — matches our existing theme
5. **Remove** the large timer section, 2x2 stat grid, and gradient fade — replaced by compact inline stats
6. **Mini timer** stays on the stat bar as the duration value
7. **GPS indicator** remains floating on the map
8. **Lock button** moved into the bottom card controls row

## Files to Edit

- **`src/pages/ActivityLive.tsx`** — restructure layout: full-screen map + compact bottom card with inline stats and controls
- **`src/components/activity/LiveActivityMap.tsx`** — add zoom control buttons (custom positioned), keep dark theme and existing marker/trail logic

## What Stays the Same
- All GPS logic, speed calculation, auto-pause, wake lock, hold-to-finish, confetti, settings sheet
- Dark CartoDB map tiles, pulsing marker, glowing trail
- Completion screen

