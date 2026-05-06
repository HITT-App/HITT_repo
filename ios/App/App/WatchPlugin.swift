import Capacitor
import Foundation

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

    // MARK: - Watch mirroring via WatchConnectivity
    // Sends a message to the Watch app telling it to navigate to the Ready screen.
    // When iOS 26 / watchOS 26 are public we can upgrade this to full HealthKit mirroring.

    @objc func startMirroredWorkout(_ call: CAPPluginCall) {
        let name = call.getString("workoutName") ?? "HIIT Workout"
        let type = call.getString("activityType") ?? "hiit"
        WatchBridge.shared.sendRawMessage([
            "mirrorWorkout": ["name": name, "activityType": type]
        ])
        call.resolve(["mirroring": true])
    }

    @objc func endMirroredWorkout(_ call: CAPPluginCall) {
        WatchBridge.shared.sendRawMessage(["clearMirrorWorkout": true])
        call.resolve()
    }
}
