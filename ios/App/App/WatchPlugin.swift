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

    @objc private func onWatchEvent(_ notification: Notification) {
        guard let event = notification.object as? [String: Any] else { return }
        notifyListeners("workoutEvent", data: event)
    }
}
