import Capacitor
import Foundation
import HealthKit

@objc(WatchPlugin)
public class WatchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchPlugin"
    public let jsName = "Watch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendMessage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendStructuredWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startMirroredWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endMirroredWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareHealthAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSimulator", returnType: CAPPluginReturnPromise),
    ]

    /// Returns true when running in the iOS Simulator. Used by JS to skip
    /// Live Activity starts — iOS 26 sim has a recurring XPC crash in the
    /// widget extension that takes down the parent app. Real devices unaffected.
    @objc func isSimulator(_ call: CAPPluginCall) {
        #if targetEnvironment(simulator)
        call.resolve(["isSimulator": true])
        #else
        call.resolve(["isSimulator": false])
        #endif
    }

    private var workoutEventListeners: [String: CAPPluginCall] = [:]
    // iOS 26+: real HKWorkoutSession that triggers the Watch face prompt
    private var mirrorSession: AnyObject?
    private let hkStore = HKHealthStore()
    // HKWorkoutSession.end() has a ~8s teardown window where the session is still
    // persisting data. Starting another mirrored session inside that window causes
    // HealthKit to reject silently. Track the last end time so startMirroredWorkout
    // can delay until teardown is safely complete.
    private var lastMirroringEndAt: Date?
    private static let mirroringEndCooldown: TimeInterval = 8

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onWatchEvent(_:)),
            name: .watchWorkoutEvent,
            object: nil
        )
    }

    /// Public Capacitor method — JS calls this AFTER sign-in so the comprehensive
    /// HealthKit auth prompt doesn't appear before the user has authenticated.
    /// Idempotent — iOS skips the UI on types that are already determined.
    @objc func prepareHealthAuth(_ call: CAPPluginCall) {
        Self.requestComprehensiveHealthAuth(hkStore: hkStore)
        call.resolve()
    }

    private static func requestComprehensiveHealthAuth(hkStore: HKHealthStore) {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        var shareTypes: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
        ]
        var readTypes: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.activitySummaryType(),
        ]

        let writeQuantityIds: [HKQuantityTypeIdentifier] = [
            .activeEnergyBurned,
            .distanceWalkingRunning,
            .distanceCycling,
            .distanceSwimming,
        ]
        for id in writeQuantityIds {
            if let t = HKQuantityType.quantityType(forIdentifier: id) {
                shareTypes.insert(t)
            }
        }

        let readQuantityIds: [HKQuantityTypeIdentifier] = [
            .heartRate,
            .stepCount,
            .activeEnergyBurned,
            .distanceWalkingRunning,
            .distanceCycling,
            .distanceSwimming,
        ]
        for id in readQuantityIds {
            if let t = HKQuantityType.quantityType(forIdentifier: id) {
                readTypes.insert(t)
            }
        }

        hkStore.requestAuthorization(toShare: shareTypes, read: readTypes) { granted, error in
            NSLog("[WatchPlugin] Comprehensive HK auth granted=%@ error=%@",
                  granted ? "true" : "false",
                  error?.localizedDescription ?? "none")
        }
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": WatchBridge.shared.isReachable])
    }

    @objc func sendWorkout(_ call: CAPPluginCall) {
        guard let workout = call.getObject("workout") else {
            call.reject("Missing workout object"); return
        }
        WatchBridge.shared.sendWorkout(workout)
        call.resolve()
    }

    @objc func sendStructuredWorkout(_ call: CAPPluginCall) {
        guard let workout = call.getObject("workout") else {
            call.reject("Missing workout object"); return
        }
        WatchBridge.shared.sendStructuredWorkout(workout)
        call.resolve()
    }

    @objc func clearWorkout(_ call: CAPPluginCall) {
        WatchBridge.shared.clearWorkout()
        call.resolve()
    }

    @objc func sendMessage(_ call: CAPPluginCall) {
        guard let message = call.getObject("message") else {
            call.reject("Missing message"); return
        }
        WatchBridge.shared.sendRawMessage(message)
        call.resolve()
    }

    @objc private func onWatchEvent(_ notification: Notification) {
        guard let event = notification.object as? [String: Any] else { return }
        notifyListeners("workoutEvent", data: event)
    }

    // MARK: - Watch mirroring
    // iOS 26+: starts a real HKWorkoutSession which causes watchOS to show the
    //          workout prompt on the Watch face and auto-launch the Watch app.
    // Fallback: WCSession message navigates the Watch app if already open.

    @objc func startMirroredWorkout(_ call: CAPPluginCall) {
        // If a previous mirrored session ended inside the HK teardown window,
        // delay until it completes — otherwise HealthKit silently rejects the
        // new session. Happy path (no recent end) falls straight through.
        if let endedAt = lastMirroringEndAt {
            let elapsed = Date().timeIntervalSince(endedAt)
            if elapsed < Self.mirroringEndCooldown {
                let remaining = Self.mirroringEndCooldown - elapsed
                NSLog("[WatchPlugin] start delayed %.2fs for HK teardown cooldown", remaining)
                DispatchQueue.main.asyncAfter(deadline: .now() + remaining) { [weak self] in
                    self?.lastMirroringEndAt = nil
                    self?.startMirroredWorkout(call)
                }
                return
            }
            lastMirroringEndAt = nil
        }

        let name = call.getString("workoutName") ?? "HIIT Workout"
        let type = call.getString("activityType") ?? "hiit"

        // Always send WCSession message as fallback / supplement
        WatchBridge.shared.sendRawMessage([
            "mirrorWorkout": ["name": name, "activityType": type]
        ])

        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["mirroring": false]); return
        }

        let activityType = Self.hkActivityType(for: type)
        let config = HKWorkoutConfiguration()
        config.activityType = activityType
        // Outdoor location is required for the Watch to receive the mirroring
        // prompt for outdoor activity types (.swimBikeRun / .running / .cycling /
        // .swimming). Setting .indoor here makes iOS skip the Watch invitation.
        config.locationType = Self.locationType(for: activityType)

        // Auth scope is comprehensive enough to cover the session + samples it
        // will produce. We only fire the auth prompt if at least one required
        // type is still .notDetermined — otherwise iOS would no-op anyway, but
        // avoiding the call removes a class of races where the dialog flashes
        // briefly even with everything already granted.
        let shareTypes: Set<HKSampleType> = Self.shareTypesForMirroring()
        let needsPrompt = shareTypes.contains { hkStore.authorizationStatus(for: $0) == .notDetermined }
        let proceed: (Bool, Error?) -> Void = { [weak self] granted, error in
            guard let self else { call.resolve(["mirroring": false]); return }
            guard granted else {
                NSLog("[WatchPlugin] mirror auth denied: %@", error?.localizedDescription ?? "no error")
                call.resolve(["mirroring": false]); return
            }
            // Apple's documented API for iPhone-initiated Watch workout launch.
            // Fires the paired Watch's WKApplicationDelegate.handle(_:) with the
            // configuration — which our Watch app already routes to Race tab for
            // .swimBikeRun. HKWorkoutSession.startActivity (what we tried first)
            // only starts a local iPhone session and never notifies the Watch.
            self.hkStore.startWatchApp(with: config) { success, error in
                if let error = error {
                    NSLog("[WatchPlugin] startWatchApp error: %@", error.localizedDescription)
                }
                NSLog("[WatchPlugin] startWatchApp success=%@ type=%d outdoor=%@",
                      success ? "yes" : "no",
                      activityType.rawValue,
                      config.locationType == .outdoor ? "yes" : "no")
                call.resolve(["mirroring": success])
            }
        }
        if needsPrompt {
            hkStore.requestAuthorization(toShare: shareTypes, read: [], completion: proceed)
        } else {
            proceed(true, nil)
        }
    }

    private static func shareTypesForMirroring() -> Set<HKSampleType> {
        var types: Set<HKSampleType> = [HKObjectType.workoutType(), HKSeriesType.workoutRoute()]
        let ids: [HKQuantityTypeIdentifier] = [
            .activeEnergyBurned, .distanceWalkingRunning, .distanceCycling, .distanceSwimming,
        ]
        for id in ids {
            if let t = HKQuantityType.quantityType(forIdentifier: id) { types.insert(t) }
        }
        return types
    }

    private static func locationType(for activity: HKWorkoutActivityType) -> HKWorkoutSessionLocationType {
        switch activity {
        case .running, .cycling, .walking, .hiking, .swimming:
            return .outdoor
        default:
            if #available(iOS 16.0, *), activity == .swimBikeRun { return .outdoor }
            return .indoor
        }
    }

    @objc func endMirroredWorkout(_ call: CAPPluginCall) {
        WatchBridge.shared.sendRawMessage(["clearMirrorWorkout": true])
        // Stamp BEFORE the end call so the cooldown window starts at the moment
        // teardown begins, not after it returns.
        lastMirroringEndAt = Date()
        if #available(iOS 26.0, *) {
            (mirrorSession as? HKWorkoutSession)?.end()
        }
        mirrorSession = nil
        call.resolve()
    }

    private static func hkActivityType(for str: String) -> HKWorkoutActivityType {
        switch str {
        case "running", "jogging":   return .running
        case "walking":              return .walking
        case "cycling", "cycle":     return .cycling
        case "swimming":             return .swimming
        case "hiking", "hike":       return .hiking
        case "rowing":               return .rowing
        case "strength", "gym":      return .traditionalStrengthTraining
        case "yoga":                 return .yoga
        case "triathlon":
            if #available(iOS 16.0, *) { return .swimBikeRun }
            return .swimming
        default:                     return .highIntensityIntervalTraining
        }
    }
}
