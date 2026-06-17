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

    // Send a structured workout (full exercise sequence) to the Watch.
    // Uses transferUserInfo so delivery is guaranteed even when Watch isn't reachable.
    func sendStructuredWorkout(_ workout: [String: Any]) {
        guard WCSession.default.activationState == .activated else { return }
        let payload = ["structuredWorkout": workout]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: { [weak self] _ in
                self?.transferQueued(payload)
            })
        } else {
            transferQueued(payload)
        }
    }

    // Clear the workout from the Watch
    func clearWorkout() {
        let payload = ["clearWorkout": true]
        try? WCSession.default.updateApplicationContext(payload)
    }

    // Send any arbitrary message (used for triathlon plans, etc.)
    // Uses transferUserInfo when Watch isn't reachable so the plan is queued
    // and delivered reliably — unlike updateApplicationContext which is overwritten.
    func sendRawMessage(_ message: [String: Any]) {
        guard WCSession.default.activationState == .activated else { return }
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: nil, errorHandler: { [weak self] _ in
                self?.transferQueued(message)
            })
        } else {
            transferQueued(message)
        }
    }

    private func transferQueued(_ message: [String: Any]) {
        // transferUserInfo queues all transfers in order and never overwrites —
        // the Watch app receives it the next time it becomes reachable.
        WCSession.default.transferUserInfo(message)
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

    // Receives payloads queued via transferUserInfo when the phone was not reachable.
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        guard userInfo["event"] != nil else { return }
        DispatchQueue.main.async { [weak self] in
            self?.onWorkoutEvent?(userInfo)
            NotificationCenter.default.post(name: .watchWorkoutEvent, object: userInfo)
        }
    }

    // Receives fallback payloads sent via updateApplicationContext (legacy path,
    // kept for compatibility with any older Watch app versions in the field).
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard applicationContext["event"] != nil else { return }
        DispatchQueue.main.async { [weak self] in
            self?.onWorkoutEvent?(applicationContext)
            NotificationCenter.default.post(name: .watchWorkoutEvent, object: applicationContext)
        }
    }
}

extension Notification.Name {
    static let watchWorkoutEvent = Notification.Name("hiit.watchWorkoutEvent")
}
