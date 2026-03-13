

# Multiple Share Image Options for Completion Summary

## Current State
The completion screen has one "Generate Share Image" button that opens photo style options (profile pic, selfie, silhouette) — all AI-generated. There's no way to quickly share the GPS map or a simple stats card without waiting for AI generation.

## Proposed Options
Replace the single "Generate Share Image" button with a multi-option selector offering 4 share card styles:

1. **Map Card** — Captures the GPS route map with stats overlay and HIIT watermark. Instant (no AI needed). Only shown when `mapComponent` is provided.
2. **Stats Card** — Clean, dark-themed stats-only card with the HIIT logo watermark. Instant (canvas-rendered, no AI).
3. **AI Cinematic** — The existing AI-generated image (silhouette, profile pic, or selfie options). Slower but premium.
4. **Quick Photo** — Upload/take a photo, overlay stats + HIIT watermark using canvas (no AI, instant). Lightweight alternative.

## Technical Approach

### 1. New edge function not needed for Map/Stats/Quick Photo
These three options will be rendered client-side using an HTML5 Canvas:
- Draw the map screenshot or photo as background
- Overlay a dark gradient bar at the bottom with stats text
- Stamp the HIIT watermark (`src/assets/hiit-watermark.png`) in the top-right corner
- Export as PNG data URL

### 2. Changes to `CompletionSummary.tsx`
- Add a `shareStyle` state: `'none' | 'map' | 'stats' | 'ai' | 'photo'`
- Replace the current single button with a grid of 4 option cards (icon + label)
- **Map Card option**: Use `html2canvas` or a hidden canvas to capture the map container + overlay stats/watermark. Only visible when `mapComponent` exists.
- **Stats Card option**: Draw a branded 1080×1080 canvas with dark background, stats, activity icon, and watermark.
- **AI Cinematic option**: Opens the existing photo source picker (profile/selfie/silhouette).
- **Quick Photo option**: Opens file picker, then composites the photo with stats overlay on canvas.

### 3. Canvas utility function
Create a shared `generateCanvasCard()` helper that:
- Creates a 1080×1080 canvas
- Draws the provided background (map screenshot, photo, or gradient)
- Adds bottom stats bar with semi-transparent dark gradient
- Renders stats text in white
- Stamps the HIIT watermark in the top-right at ~15% opacity
- Returns a blob URL for preview/download

### 4. Map capture
- Use `leaflet-image` or manually call `map.getContainer()` to get DOM, then use a canvas `drawImage` approach
- Alternatively, render map tiles to canvas using the existing Leaflet instance ref

### Files to modify
- **`src/components/workout/CompletionSummary.tsx`** — New multi-option UI, canvas rendering logic
- **`src/components/workout/ShareCardCanvas.ts`** (new) — Reusable canvas card generator utility

### UI Layout (share options grid)
```text
┌──────────────┐ ┌──────────────┐
│   🗺️ Map     │ │   📊 Stats   │
│   Card       │ │   Card       │
└──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐
│   ✨ AI      │ │   📸 Quick   │
│   Cinematic  │ │   Photo      │
└──────────────┘ └──────────────┘
```

Each card shows a small preview icon, label, and "Instant" or "~15s" time estimate badge.

