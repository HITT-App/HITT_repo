
## GPS System Upgrade Plan

### 1. Kalman Filter Smoothing (`src/lib/gps-filter.ts`)
- Implement a 1D Kalman filter for lat/lng that reduces jitter and produces clean route lines
- Process noise dynamically adjusted based on estimated speed
- Applied before distance calculation and position rendering

### 2. Tighter Accuracy & Faster Polling
- Reduce `maximumAge` from 3000ms → 1000ms for more responsive updates
- Reduce accuracy threshold from 50m → 30m (active) and 100m → 60m (initial lock)
- Reduce `timeout` from 15000ms → 10000ms

### 3. Speed-Adaptive Filtering
- Walking (<6 km/h): tight 1.5m min-move filter, strict accuracy
- Running (6-20 km/h): moderate 3m min-move, standard accuracy
- Cycling (>20 km/h): relaxed 5m min-move, wider accuracy tolerance
- Jump protection scales with speed tier (200m walk, 500m run, 1000m cycling)

### 4. Capacitor Native GPS Preparation (`src/lib/native-gps.ts`)
- Create a GPS provider abstraction that auto-detects native vs web
- On native: use `@capacitor/geolocation` plugin for better accuracy, background tracking, and battery optimization
- On web: falls back to current browser Geolocation API
- Both feed into the same Kalman filter pipeline

### Files changed
- **New**: `src/lib/gps-filter.ts` — Kalman filter + speed-adaptive logic
- **New**: `src/lib/native-gps.ts` — GPS provider abstraction (web + native)
- **Modified**: `src/pages/ActivityLive.tsx` — use new GPS system
- **Modified**: `src/pages/Triathlon.tsx` — use new GPS system
- **Package**: Add `@capacitor/geolocation`
