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
    ]

    private var workoutEventListeners: [String: CAPPluginCall] = [:]
    // iOS 26+: real HKWorkoutSession that triggers the Watch face prompt
    private var mirrorSession: AnyObject?
    private let hkStore = HKHealthStore()

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onWatchEvent(_:)),
            name: .watchWorkoutEvent,
            object: nil
        )
        // Request the full HealthKit scope once at launch — covers workouts,
        // routes, distance, energy, heart rate. Without this, HKWorkoutSession
        // creation for triathlon (and other mirrored workouts) silently fails,
        // and the user otherwise has to grant each permission piecemeal.
        Self.requestComprehensiveHealthAuth(hkStore: hkStore)
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
        let name = call.getString("workoutName") ?? "HIIT Workout"
        let type = call.getString("activityType") ?? "hiit"

        // Always send WCSession message as fallback / supplement
        WatchBridge.shared.sendRawMessage([
            "mirrorWorkout": ["name": name, "activityType": type]
        ])

        guard #available(iOS 17.0, *), HKHealthStore.isHealthDataAvailable() else {
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
        // will produce; if any required types aren't authorised the session
        // creation throws silently.
        let shareTypes: Set<HKSampleType> = Self.shareTypesForMirroring()
        hkStore.requestAuthorization(toShare: shareTypes, read: []) { [weak self] granted, error in
            guard let self else { call.resolve(["mirroring": false]); return }
            guard granted else {
                NSLog("[WatchPlugin] mirror auth denied: %@", error?.localizedDescription ?? "no error")
                call.resolve(["mirroring": false]); return
            }
            do {
                let session = try HKWorkoutSession(healthStore: self.hkStore, configuration: config)
                self.mirrorSession = session
                // startActivity triggers the iPhone → Watch mirror invitation.
                // The Watch app's WKApplicationDelegate.handle(_:) fires and
                // routes to the Race tab when activityType == .swimBikeRun.
                session.startActivity(with: .now)
                NSLog("[WatchPlugin] mirror session started type=%d outdoor=%@",
                      activityType.rawValue,
                      config.locationType == .outdoor ? "yes" : "no")
                call.resolve(["mirroring": true])
            } catch {
                NSLog("[WatchPlugin] HKWorkoutSession creation failed: %@", error.localizedDescription)
                call.resolve(["mirroring": false])
            }
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
        if #available(iOS 26.0, *) {
            (mirrorSession as? HKWorkoutSession)?.end()
        }
        mirrorSession = nil
        call.resolve()
    }

    private static func hkActivityType(for str: String) -> HKWorkoutActivityType {
        switch str {
        case "running":   return .running
        case "cycling":   return .cycling
        case "swimming":  return .swimming
        case "strength":  return .traditionalStrengthTraining
        case "triathlon":
            if #available(iOS 16.0, *) { return .swimBikeRun }
            return .swimming
        default:          return .highIntensityIntervalTraining
        }
    }
}
