

# Fix GPS Not Working on Activity Live Page

## Problem
The screenshot shows "GPS Active" but distance stays at 0.00 km. The GPS status shows as active (the indicator is green/orange), meaning the browser IS providing location data, but the distance isn't updating. Two likely causes:

1. **Accuracy threshold too strict** -- `GPS_ACCURACY_THRESHOLD = 30` metres may be filtering out all readings on Android mobile browsers which often report accuracy > 30m initially
2. **Minimum move filter too aggressive** -- `GPS_MIN_MOVE = 3` metres combined with the accuracy filter means small movements are entirely discarded
3. **The `settings.autoVibrate` dependency** in the GPS useEffect causes the watcher to restart every time settings change, resetting the position history

## Plan

### Changes to `src/pages/ActivityLive.tsx`

1. **Relax GPS accuracy threshold** -- Increase `GPS_ACCURACY_THRESHOLD` from 30 to **50** metres to accept more readings on Android
2. **Lower minimum move filter** -- Reduce `GPS_MIN_MOVE` from 3 to **2** metres
3. **Remove `settings.autoVibrate` from GPS useEffect dependency array** -- This causes the GPS watcher to restart unnecessarily when vibration settings change, losing accumulated position data. Move the vibrate check inside the callback using a ref instead.
4. **Add initial position acceptance** -- Currently the first GPS reading sets status to "active" but doesn't contribute to distance. This is correct, but if accuracy filtering rejects early readings, the status stays on "searching" indefinitely. Add a fallback: accept readings with accuracy up to 100m for the initial fix, then tighten once we have a lock.
5. **Add better error logging** -- Log GPS errors to help debug future issues

| Item | Current | Proposed |
|------|---------|----------|
| `GPS_ACCURACY_THRESHOLD` | 30m | 50m (100m for first fix) |
| `GPS_MIN_MOVE` | 3m | 2m |
| GPS useEffect deps | `[settings.gpsTracking, settings.autoVibrate]` | `[settings.gpsTracking]` |
| Auto-vibrate in GPS callback | Direct setting read | Via ref to avoid re-mount |

### Single file change
Only `src/pages/ActivityLive.tsx` needs to be modified.

