

## Plan: Make Activity Live Tracking Fully Functional

The current `ActivityLive` page uses fake calculated stats (distance from elapsed time, etc.) and has no real GPS. Here's what we'll build:

### 1. Real GPS Tracking via Geolocation API
- Use `navigator.geolocation.watchPosition()` to get real-time lat/lng coordinates
- Store position history as an array of `{lat, lng, timestamp}`
- Calculate **real distance** using the Haversine formula between consecutive GPS points
- Calculate **real pace** from actual distance and elapsed time
- Show GPS status (searching, active, unavailable) instead of always showing "GPS Active"
- Handle permission denied / unavailable gracefully with toast messages

### 2. Real Calorie Estimation
- Use MET (Metabolic Equivalent) values per activity type instead of flat `elapsed * 0.15`
- e.g. Running ~9.8 MET, Walking ~3.5 MET, Cycling ~7.5 MET, Swimming ~8.0 MET
- Formula: `calories = MET * weight_kg * duration_hours` (default 70kg if unknown)

### 3. Fix the "Infinity" Pace Bug
- Currently divides by distance which is 0 initially, producing `Infinity`
- Guard against zero distance: show `"--"` when distance is 0

### 4. Fix Completed Screen
- Third stat column duplicates "Duration" -- replace with "Distance"
- Dynamic completion message based on actual performance instead of hardcoded "burned very little calorie"

### 5. Auto-Pause When Stationary (optional setting)
- If GPS shows no movement for 10+ seconds, auto-pause the timer
- Resume when movement resumes
- Only active when the "Auto Pause" setting is enabled

### 6. Vibration Feedback
- Vibrate on pause/resume and activity completion when "Auto Vibrate" is enabled
- Uses `navigator.vibrate()` API

### 7. Wake Lock (keep screen on)
- Use `navigator.wakeLock.request('screen')` to prevent screen from turning off during tracking
- Release on finish/navigate away

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ActivityLive.tsx` | Major rewrite: real GPS, Haversine distance, MET calories, wake lock, auto-pause, vibration, fix pace/completed screen |

No database or backend changes needed -- the existing `logActivity` mutation already accepts `distance_km`, `calories_burned`, etc.

### Technical Details

**Haversine formula** (distance between two GPS coordinates):
```
a = sin²(Δlat/2) + cos(lat1) * cos(lat2) * sin²(Δlng/2)
distance = 2 * R * atan2(√a, √(1−a))
```

**MET values map**:
- jogging/run: 9.8, walking: 3.5, cycling: 7.5, swimming: 8.0, yoga: 2.5, hiit/workout: 8.0, default: 5.0

**GPS position tracking**:
- `watchPosition` with `enableHighAccuracy: true`
- Filter out inaccurate readings (accuracy > 30m)
- Only add to path if moved > 3m from last point (noise filter)

