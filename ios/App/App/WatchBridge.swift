import Foundation
import WatchConnectivity

// Sends workout plans to the Apple Watch and receives workout events back.
class WatchBridge: NSObject, WCSessionDelegate {
    static let shared = WatchBridge()

    var onWorkoutEvent: (([String: Any]) -> Void)?

    private override init() {
        super.init()
    }

    func start() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    var isReachable: Bool {
        WCSession.default.isReachable
    }

    // Send today's workout to the Watch
    func sendWorkout(_ workout: [String: Any]) {
        guard WCSession.default.activationState == .activated else { return }
        let payload = ["workout": workout]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: { error in
                // Fall back to application context if message send fails
                try? WCSession.default.updateApplicationContext(payload)
            })
        } else {
            try? WCSession.default.updateApplicationContext(payload)
        }
    }

    // Clear the workout from the Watch
    func clearWorkout() {
        let payload = ["clearWorkout": true]
        try? WCSession.default.updateApplicationContext(payload)
    }

    // MARK: — WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            self?.onWorkoutEvent?(message)
            NotificationCenter.default.post(name: .watchWorkoutEvent, object: message)
        }
    }
}

extension Notification.Name {
    static let watchWorkoutEvent = Notification.Name("hiit.watchWorkoutEvent")
}
