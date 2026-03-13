

# Improve Stats Card — Use Map Route for Outdoor Activities

## Problem
When a user completes a Run and picks "Stats Card", they get a plain dark card with a 💪 emoji and "COMPLETED" text. For outdoor activities with GPS data, the card should feature their actual route map as the background instead.

## Solution
Two improvements to the Stats Card:

1. **Map Route Stats Card** — When a map is available (outdoor activity), the "Stats Card" option automatically captures the GPS route map as the background and overlays the stats bar + HIIT watermark. This makes it distinct from the separate "Map Card" option by using a tighter crop and more prominent stats styling.

2. **Smarter fallback** — When no map data exists (indoor activities), keep the current dark gradient + emoji card.

## Technical Changes

### `src/components/workout/CompletionSummary.tsx`
- In `handleShareOption`, when `style === 'stats'` and `mapContainerRef?.current` exists, use `generateMapCard()` instead of `generateStatsCard()` — giving outdoor users their route as the stats card background automatically.
- This means for outdoor activities: **Map Card** and **Stats Card** both use the map, but Stats Card is the default quick option.

### `src/components/workout/ShareCardCanvas.ts`  
- Update `generateStatsCard` to accept an optional `mapElement` parameter. When provided, capture the map DOM and use it as the background instead of the plain dark gradient.
- This keeps it as a single function that adapts based on available data.

### `src/components/workout/ShareOptionsGrid.tsx`
- When `hasMap` is true, update the Stats Card description from "Dark branded card" to "Route + stats" to reflect that it will include the map.

## Summary
Outdoor runs will now show the actual GPS route on the Stats Card instead of a plain emoji. Indoor workouts keep the current dark branded card. Minimal changes — mostly routing logic in the share handler.

