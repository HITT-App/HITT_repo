# Phase 5 — Live Activity Xcode Setup

Everything that can be done outside Xcode is done. These are the manual steps Vanessa needs to do in Xcode to wire up the Widget Extension target so the Lock Screen / Dynamic Island UI actually shows.

## Pre-flight (already done)

- `capacitor-live-activity@8.2.0` installed
- `npx cap sync ios` run
- `NSSupportsLiveActivities = true` added to `ios/App/App/Info.plist`
- TS wrapper: `src/lib/live-activity.ts`
- `ActivityLive.tsx` wired with start / throttled-update / end
- Swift files pre-written in `ios/App/HIITLiveActivity/`:
  - `GenericAttributes.swift` — must match the plugin's shared type (do NOT rename)
  - `HIITLiveActivityBundle.swift` — `@main` widget bundle
  - `HIITWorkoutLiveActivity.swift` — Lock Screen + Dynamic Island UI

## Xcode steps

1. **Open** `ios/App/App.xcworkspace` in Xcode.

2. **Add the Widget Extension target:**
   - File → New → Target…
   - Choose **Widget Extension**.
   - Product Name: **HIITLiveActivity**
   - **Check "Include Live Activity"**.
   - **Deployment target: iOS 16.2** (set after target is created in target's General tab — Xcode defaults to the project's deployment target which is fine if it's already >= 16.2).
   - Click Finish. If Xcode asks to activate the new scheme, click **Cancel** (we don't run the widget on its own).

3. **Replace Xcode's placeholder Swift files with ours.**
   Xcode generated placeholder files inside `ios/App/HIITLiveActivity/`. In the Xcode project navigator:
   - Delete the auto-generated `HIITLiveActivityBundle.swift`, `HIITLiveActivityLiveActivity.swift` (or whatever Xcode named it), and any `*Attributes.swift` placeholder. Choose **Move to Trash** when prompted.
   - Keep `Info.plist` and `HIITLiveActivity.entitlements` that Xcode created.

4. **Add our pre-written files to the target.**
   In Finder, the three files already sit at `ios/App/HIITLiveActivity/`:
   - `GenericAttributes.swift`
   - `HIITLiveActivityBundle.swift`
   - `HIITWorkoutLiveActivity.swift`
   
   In Xcode, right-click the `HIITLiveActivity` group → Add Files to "App"…  Select all three. In the dialog:
   - **Copy items if needed**: leave unchecked (they're already in place)
   - **Add to targets**: tick **HIITLiveActivity ONLY**. Do NOT tick the App target.
   
   > Important: `GenericAttributes` is a **shared type** required by the `capacitor-live-activity` plugin. The widget cannot use a custom Attributes type because the plugin internally hardcodes `Activity<GenericAttributes>`. This is why our widget file reads from `context.state.values["..."]` and `context.attributes.staticValues["..."]` rather than typed properties.

5. **App Group capability — App target:**
   - Select project root in Xcode navigator → **App** target → Signing & Capabilities → + Capability → **App Groups**.
   - Add: `group.com.hiitfitness.app.liveactivity`

6. **App Group capability — HIITLiveActivity target:**
   - Same Signing & Capabilities tab on the **HIITLiveActivity** target.
   - + Capability → **App Groups** → tick the same `group.com.hiitfitness.app.liveactivity`.

7. **Verify host App's `Info.plist`** contains `NSSupportsLiveActivities = YES` (already added by this prep).

8. **Build & Run on a physical device.** Live Activities do NOT work in the Simulator. Lock the device while a workout is running — the Live Activity should appear.

## Sanity check after build

Once the widget compiles and is installed alongside the app:
- Start any GPS workout (jogging, walking, cycling).
- Lock the phone.
- Lock screen should show: orange flame + workout title, live-ticking elapsed timer, distance, pace.
- Long-press the Dynamic Island (on supported phones) for the expanded view.

## Notes / gotchas

- The `Info.plist` Xcode auto-generates for the widget target is fine — no edits needed.
- The HIITLiveActivity target's **Deployment Info** must be **iOS 16.2 or later**. If the project default is lower, set it explicitly on the widget target.
- The plugin's Swift API uses **stringly-typed** key/value maps. Our widget reads `context.state.values["distanceMeters"]` etc. — see the comment block at the top of `HIITWorkoutLiveActivity.swift` for the list of keys we write from JS.
- If the build fails with `cannot find type 'GenericAttributes'`, you missed step 4: `GenericAttributes.swift` must be a member of the `HIITLiveActivity` target.
- The App Group ID is currently not strictly required by the plugin (no shared UserDefaults reads), but we still set it on both targets so we can use it later for shared state if needed (e.g. heart-rate hand-off from Watch).
