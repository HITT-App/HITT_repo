

## Step Detection: What's Possible

Background step counting is a **native device feature** — web browsers cannot access the phone's pedometer or count steps when the app is closed. There are two realistic paths:

### Option A: Connect to Google Fit / Apple Health (Recommended)
- Use **Google Fit REST API** (OAuth) to pull step data that the phone already tracks automatically
- On iOS, Apple HealthKit requires a native app — not accessible from the web
- This gives you real historical step data without building a pedometer
- Users authorize once, then the app syncs their daily steps automatically
- Works even when the app isn't open because Google Fit tracks steps natively

### Option B: Convert to Native App (Capacitor)
- Wrap the app with Capacitor and use native pedometer plugins (`@nicemob/capacitor-health-connect` for Android, HealthKit for iOS)
- Full background step counting, real-time sync
- Requires users to install via app store or sideload
- Significant setup effort (Xcode, Android Studio, etc.)

### What Can't Work
- Web browsers have no background step counting API
- The Web Sensor API (Accelerometer) only works while the page is actively open and has very limited browser support
- There is no way for a PWA to count steps in the background

### Recommendation
**Option A (Google Fit integration)** is the most practical for your current web/PWA setup. It would:
1. Add a "Connect Google Fit" button on the Steps page
2. OAuth flow to authorize read access to step data
3. Backend function to fetch daily step counts from Google Fit API
4. Auto-sync steps into your existing `health_metrics` table
5. Show real device-tracked steps alongside manually logged ones

This covers Android users well. For iOS users, manual logging would remain the fallback until a native app is built.

