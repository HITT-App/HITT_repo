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
        guard WCSession.isSupported() else {
            NSLog("[HIIT.WCSession] WCSession.isSupported=false — abort activate")
            return
        }
        WCSession.default.delegate = self
        WCSession.default.activate()
        NSLog("[HIIT.WCSession] iPhone activate() called")
    }

    var isReachable: Bool {
        WCSession.default.isReachable
    }

    // Send today's workout to the Watch
    func sendWorkout(_ workout: [String: Any]) {
        guard WCSession.default.activationState == .activated else {
            NSLog("[HIIT.WCSession] → sendWorkout aborted — session not activated")
            return
        }
        let payload = ["workout": workout]
        send(payload, label: "workout", asState: true)
    }

    // Send a structured workout (full exercise sequence) to the Watch.
    // Uses transferUserInfo so delivery is guaranteed even when Watch isn't reachable.
    func sendStructuredWorkout(_ workout: [String: Any]) {
        guard WCSession.default.activationState == .activated else {
            NSLog("[HIIT.WCSession] → sendStructuredWorkout aborted — session not activated")
            return
        }
        let payload = ["structuredWorkout": workout]
        send(payload, label: "structuredWorkout", asState: true)
    }

    // Clear the workout from the Watch
    func clearWorkout() {
        let payload = ["clearWorkout": true]
        do {
            try WCSession.default.updateApplicationContext(payload)
            NSLog("[HIIT.WCSession] → updateApplicationContext keys=clearWorkout")
        } catch {
            NSLog("[HIIT.WCSession] → updateApplicationContext FAILED keys=clearWorkout — \(error)")
        }
    }

    // Keys whose payload represents *current state* of the loaded plan. For these
    // the right fallback is updateApplicationContext (delivers the latest snapshot
    // as soon as the Watch wakes, overwriting any previous value). transferUserInfo
    // is wrong here — it's a queue designed for events, can be deferred for minutes,
    // and the Watch app being "open but not reachable" doesn't drain it promptly.
    private static let stateKeys: Set<String> = ["triathlon", "workout", "structuredWorkout", "dayType"]

    // Send any arbitrary message. Routes based on the payload's top-level key:
    //   • state keys (triathlon plan, day type, etc.) → sendMessage if reachable,
    //     else updateApplicationContext (overwrites — latest wins).
    //   • event keys (mirrorWorkout, clearMirrorWorkout) → sendMessage if reachable,
    //     else transferUserInfo (queued — order preserved).
    func sendRawMessage(_ message: [String: Any]) {
        guard WCSession.default.activationState == .activated else {
            NSLog("[HIIT.WCSession] → sendRawMessage aborted — session not activated keys=\(Array(message.keys))")
            return
        }
        let isState = message.keys.contains { Self.stateKeys.contains($0) }
        send(message, label: Array(message.keys).joined(separator: ","), asState: isState)
    }

    // Unified send + transport logging. Each message logs which delivery path was
    // chosen, the WCSession state at the time, and any error from the send call.
    private func send(_ payload: [String: Any], label: String, asState: Bool) {
        let session = WCSession.default
        let reachable = session.isReachable
        let installed = session.isWatchAppInstalled
        let paired = session.isPaired
        NSLog("[HIIT.WCSession] → send label=\(label) reachable=\(reachable) installed=\(installed) paired=\(paired) asState=\(asState)")

        if reachable {
            session.sendMessage(payload, replyHandler: nil, errorHandler: { [weak self] error in
                NSLog("[HIIT.WCSession] → sendMessage FAILED label=\(label) — \(error.localizedDescription) — falling back")
                self?.fallback(payload, label: label, asState: asState)
            })
            NSLog("[HIIT.WCSession] → sendMessage queued label=\(label)")
            // Also set application context for state payloads so a missed sendMessage
            // (e.g. Watch app backgrounded right after the call) still recovers the
            // latest snapshot when the Watch wakes up. Belt-and-braces.
            if asState {
                do {
                    try session.updateApplicationContext(payload)
                    NSLog("[HIIT.WCSession] → updateApplicationContext (mirror) label=\(label)")
                } catch {
                    NSLog("[HIIT.WCSession] → updateApplicationContext mirror FAILED label=\(label) — \(error)")
                }
            }
        } else {
            fallback(payload, label: label, asState: asState)
        }
    }

    private func fallback(_ payload: [String: Any], label: String, asState: Bool) {
        if asState {
            do {
                try WCSession.default.updateApplicationContext(payload)
                NSLog("[HIIT.WCSession] → updateApplicationContext label=\(label) (state fallback)")
            } catch {
                NSLog("[HIIT.WCSession] → updateApplicationContext FAILED label=\(label) — \(error)")
            }
        } else {
            transferQueued(payload, label: label)
        }
    }

    private func transferQueued(_ message: [String: Any], label: String = "?") {
        // transferUserInfo queues all transfers in order and never overwrites —
        // the Watch app receives it the next time it becomes reachable. NOTE:
        // delivery is best-effort and may be deferred minutes by power management.
        let transfer = WCSession.default.transferUserInfo(message)
        NSLog("[HIIT.WCSession] → transferUserInfo label=\(label) id=\(ObjectIdentifier(transfer).hashValue) isTransferring=\(transfer.isTransferring)")
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
