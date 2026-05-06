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
        CAPPluginMethod(name: "startMirroredWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endMirroredWorkout", returnType: CAPPluginReturnPromise),
    ]

    private var workoutEventListeners: [String: CAPPluginCall] = [:]
    private var mirrorSession: HKWorkoutSession?
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
        call.resolve([
            "available": WatchBridge.shared.isReachable
        ])
    }

    @objc func sendWorkout(_ call: CAPPluginCall) {
        guard let workout = call.getObject("workout") else {
            call.reject("Missing workout object")
            return
        }
        WatchBridge.shared.sendWorkout(workout)
        call.resolve()
    }

    @objc func clearWorkout(_ call: CAPPluginCall) {
        WatchBridge.shared.clearWorkout()
        call.resolve()
    }

    @objc func sendMessage(_ call: CAPPluginCall) {
        guard let message = call.getObject("message") else {
            call.reject("Missing message")
            return
        }
        WatchBridge.shared.sendRawMessage(message)
        call.resolve()
    }

    @objc private func onWatchEvent(_ notification: Notification) {
        guard let event = notification.object as? [String: Any] else { return }
        notifyListeners("workoutEvent", data: event)
    }

    // MARK: - HealthKit mirroring (iOS 17+)
    // Starting an HKWorkoutSession on iPhone causes watchOS to show a workout prompt
    // automatically and call handle(_:workoutConfiguration:) in the Watch app delegate.

    @objc func startMirroredWorkout(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *), HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["mirroring": false])
            return
        }
        let typeStr = call.getString("activityType") ?? "hiit"
        let config = HKWorkoutConfiguration()
        config.activityType = Self.hkActivityType(for: typeStr)
        config.locationType = .indoor

        hkStore.requestAuthorization(toShare: [HKObjectType.workoutType()], read: []) { [weak self] granted, _ in
            guard granted, let self else {
                call.resolve(["mirroring": false])
                return
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
    }

    @objc func endMirroredWorkout(_ call: CAPPluginCall) {
        mirrorSession?.end()
        mirrorSession = nil
        call.resolve()
    }

    private static func hkActivityType(for str: String) -> HKWorkoutActivityType {
        switch str {
        case "running":  return .running
        case "cycling":  return .cycling
        case "swimming": return .swimming
        case "strength": return .traditionalStrengthTraining
        default:         return .highIntensityIntervalTraining
        }
    }
}
