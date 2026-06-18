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

        if #available(iOS 26.0, *), HKHealthStore.isHealthDataAvailable() {
            let config = HKWorkoutConfiguration()
            config.activityType = Self.hkActivityType(for: type)
            config.locationType = .indoor

            hkStore.requestAuthorization(toShare: [HKObjectType.workoutType()], read: []) { [weak self] granted, _ in
                guard granted, let self else {
                    call.resolve(["mirroring": false]); return
                }
                do {
                    let session = try HKWorkoutSession(healthStore: self.hkStore, configuration: config)
                    self.mirrorSession = session
                    session.startActivity(with: .now)
                    call.resolve(["mirroring": true])
                } catch {
                    call.resolve(["mirroring": false])
                }
            }
        } else {
            call.resolve(["mirroring": false])
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
