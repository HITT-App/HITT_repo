import Foundation
import WatchConnectivity

// MARK: - Shared data models

struct WatchWorkout: Identifiable, Codable {
    let id: String
    let name: String
    let durationMinutes: Int
    let exercises: [WatchExercise]
}

struct WatchExercise: Identifiable, Codable {
    let id: String
    let name: String
    let sets: Int?
    let reps: Int?
    let durationSeconds: Int?

    var setsRepsLabel: String {
        if let s = sets, let r = reps { return "\(s)×\(r)" }
        if let dur = durationSeconds { return "\(dur)s" }
        return ""
    }
}

// Triathlon plan sent from the iPhone app
struct TriathlonPlan: Codable {
    let name: String
    let legs: [TriathlonLegDef]
}

struct TriathlonLegDef: Codable {
    let type: String          // "swim" | "bike" | "run"
    let targetKm: Double
}

extension Notification.Name {
    static let watchWorkoutReceived    = Notification.Name("hiit.watchWorkoutReceived")
    static let watchTriathlonReceived  = Notification.Name("hiit.watchTriathlonReceived")
}

// MARK: - WatchSessionManager

final class WatchSessionManager: NSObject {
    static let shared = WatchSessionManager()

    private(set) var todayWorkout: WatchWorkout?
    private(set) var triathlonPlan: TriathlonPlan?

    private override init() { super.init() }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    private func applyMessage(_ message: [String: Any]) {
        // Standard workout
        if let workoutData = message["workout"] as? [String: Any],
           let data = try? JSONSerialization.data(withJSONObject: workoutData),
           let decoded = try? JSONDecoder().decode(WatchWorkout.self, from: data) {
            todayWorkout = decoded
            NotificationCenter.default.post(name: .watchWorkoutReceived, object: decoded)
        }

        // Clear workout
        if let cleared = message["clearWorkout"] as? Bool, cleared {
            todayWorkout = nil
            NotificationCenter.default.post(name: .watchWorkoutReceived, object: nil)
        }

        // Triathlon plan — also auto-navigate to the Race tab
        if let planData = message["triathlon"] as? [String: Any],
           let data = try? JSONSerialization.data(withJSONObject: planData),
           let decoded = try? JSONDecoder().decode(TriathlonPlan.self, from: data) {
            triathlonPlan = decoded
            NotificationCenter.default.post(name: .watchTriathlonReceived, object: decoded)
            WorkoutCoordinator.shared.navigateToRaceTab()
        }

        // Mirror workout — iPhone started a workout, show Ready screen on Watch
        if let mirror = message["mirrorWorkout"] as? [String: Any],
           let name = mirror["name"] as? String {
            WorkoutCoordinator.shared.receiveMirroredWorkout(named: name)
        }

        // Clear mirror
        if let clear = message["clearMirrorWorkout"] as? Bool, clear {
            WorkoutCoordinator.shared.clearPending()
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchSessionManager: WCSessionDelegate {
    nonisolated func session(_ session: WCSession,
                             activationDidCompleteWith state: WCSessionActivationState,
                             error: Error?) {}

    nonisolated func session(_ session: WCSession,
                             didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { [weak self] in self?.applyMessage(message) }
    }

    nonisolated func session(_ session: WCSession,
                             didReceiveMessage message: [String: Any],
                             replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { [weak self] in self?.applyMessage(message) }
        replyHandler([:])
    }

    nonisolated func session(_ session: WCSession,
                             didReceiveApplicationContext ctx: [String: Any]) {
        DispatchQueue.main.async { [weak self] in self?.applyMessage(ctx) }
    }
}
