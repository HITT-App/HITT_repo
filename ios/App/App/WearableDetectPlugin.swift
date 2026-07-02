import Capacitor
import Foundation
import UIKit

// Detects which vendor apps are installed on the user's iPhone by asking
// UIApplication.canOpenURL() for each vendor's registered URL scheme. No
// user prompt required, no runtime permission — the schemes just have to
// be declared in Info.plist under LSApplicationQueriesSchemes.
//
// Used by the auto-detect flow so we can preselect a Garmin / Strava /
// Fitbit / Whoop / Oura user without asking them. Result is advisory —
// the app being installed doesn't guarantee the user actively uses it.
// The 3/7/14 day coaching banner catches "installed but not syncing".
@objc(WearableDetectPlugin)
public class WearableDetectPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WearableDetectPlugin"
    public let jsName = "WearableDetect"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "detect", returnType: CAPPluginReturnPromise),
    ]

    // Scheme → key in the response. Keep in sync with the TS type in
    // src/plugins/WearableDetectPlugin.ts. When adding a new vendor,
    // also add its scheme to Info.plist under LSApplicationQueriesSchemes,
    // and its priority to _shared/activity-types.ts SOURCE_PRIORITY.
    //
    // Scheme sources:
    //   gcm-ios-6573  — Garmin Connect Mobile (Apple App Store listing → URL scheme)
    //   strava        — Strava's OAuth deep link, publicly documented
    //   fitbit        — Fitbit Mobile
    //   whoop         — Whoop app
    //   oura          — Oura Ring app
    //
    // canOpenURL returns false on scheme mismatch OR on schemes missing
    // from LSApplicationQueriesSchemes — iOS logs "This app is not
    // allowed to query for scheme X". Info.plist parity is mandatory.
    private static let schemes: [(scheme: String, key: String)] = [
        ("gcm-ios-6573", "garminInstalled"),
        ("strava",       "stravaInstalled"),
        ("fitbit",       "fitbitInstalled"),
        ("whoop",        "whoopInstalled"),
        ("oura",         "ouraInstalled"),
    ]

    @objc func detect(_ call: CAPPluginCall) {
        // canOpenURL must run on the main thread on iOS 15+ or UIKit
        // will log a warning. This handler is called on Capacitor's
        // plugin queue, so hop over explicitly.
        DispatchQueue.main.async {
            var result: [String: Any] = [:]
            for (scheme, key) in Self.schemes {
                if let url = URL(string: "\(scheme)://") {
                    result[key] = UIApplication.shared.canOpenURL(url)
                } else {
                    result[key] = false
                }
            }
            call.resolve(result)
        }
    }
}
