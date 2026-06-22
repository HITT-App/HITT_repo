import Foundation
import WatchConnectivity

// MARK: - Shared data models

struct WatchWorkout: Identifiable, Codable {
    let id: String
    let name: String
    let durationMinutes: Int
    let exercises: [WatchExercise]
    var activityKind: String? = nil
}

struct WatchExercise: Identifiable, Codable {
    let id: String
    let name: String
    let sets: Int?
    let reps: Int?
    let durationSeconds: Int?
    let restAfterSetSeconds: Int?
    let restAfterExerciseSeconds: Int?

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

enum WatchDayType: String { case open, recovery, rest }

extension Notification.Name {
    static let watchWorkoutReceived           = Notification.Name("hiit.watchWorkoutReceived")
    static let watchStructuredWorkoutReceived = Notification.Name("hiit.watchStructuredWorkoutReceived")
    static let watchTriathlonReceived         = Notification.Name("hiit.watchTriathlonReceived")
    static let watchDayTypeChanged            = Notification.Name("hiit.watchDayTypeChanged")
}

// MARK: - WatchSessionManager

final class WatchSessionManager: NSObject {
    static let shared = WatchSessionManager()

    private(set) var todayWorkout: WatchWorkout?
    private(set) var triathlonPlan: TriathlonPlan?
    private(set) var todayDayType: WatchDayType = .open

    private static let planKey              = "hiit.triathlonPlan"
    private static let workoutKey           = "hiit.todayWorkout"
    private static let structuredWorkoutKey = "hiit.structuredWorkout"

    private override init() {
        super.init()
        // Restore today's workout that arrived while the app was closed
        if let data = UserDefaults.standard.data(forKey: Self.workoutKey),
           let saved = try? JSONDecoder().decode(WatchWorkout.self, from: data) {
            todayWorkout = saved
        }
        // Restore pending structured workout
        if let data = UserDefaults.standard.data(forKey: Self.structuredWorkoutKey),
           let saved = try? JSONDecoder().decode(WatchWorkout.self, from: data) {
            WorkoutCoordinator.shared.pendingStructuredWorkout = saved
        }
        // Restore triathlon plan that arrived while the app was closed
        if let data = UserDefaults.standard.data(forKey: Self.planKey),
           let saved = try? JSONDecoder().decode(TriathlonPlan.self, from: data) {
            triathlonPlan = saved
        }
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    private func applyMessage(_ message: [String: Any]) {
        // Standard workout — persist so it survives Watch app restarts
        if let workoutData = message["workout"] as? [String: Any],
           let data = try? JSONSerialization.data(withJSONObject: workoutData),
           let decoded = try? JSONDecoder().decode(WatchWorkout.self, from: data) {
            todayWorkout = decoded
            if let encoded = try? JSONEncoder().encode(decoded) {
                UserDefaults.standard.set(encoded, forKey: Self.workoutKey)
            }
            NotificationCenter.default.post(name: .watchWorkoutReceived, object: decoded)
        }

        // Clear workout
        if let cleared = message["clearWorkout"] as? Bool, cleared {
            todayWorkout = nil
            UserDefaults.standard.removeObject(forKey: Self.workoutKey)
            NotificationCenter.default.post(name: .watchWorkoutReceived, object: nil)
        }

        // Triathlon plan — also auto-navigate to the Race tab
        if let planData = message["triathlon"] as? [String: Any],
           let data = try? JSONSerialization.data(withJSONObject: planData),
           let decoded = try? JSONDecoder().decode(TriathlonPlan.self, from: data) {
            triathlonPlan = decoded
            // Persist so the plan survives Watch app restarts
            if let encoded = try? JSONEncoder().encode(decoded) {
                UserDefaults.standard.set(encoded, forKey: Self.planKey)
            }
            NotificationCenter.default.post(name: .watchTriathlonReceived, object: decoded)
            WorkoutCoordinator.shared.navigateToRaceTab()
        }

        // Day type (open / recovery / rest)
        if let t = message["dayType"] as? String, let dt = WatchDayType(rawValue: t) {
            todayDayType = dt
            NotificationCenter.default.post(name: .watchDayTypeChanged, object: dt)
        }

        // Structured workout — full exercise sequence from the phone
        if let swData = message["structuredWorkout"] as? [String: Any],
           let data = try? JSONSerialization.data(withJSONObject: swData),
           let decoded = try? JSONDecoder().decode(WatchWorkout.self, from: data) {
            if let encoded = try? JSONEncoder().encode(decoded) {
                UserDefaults.standard.set(encoded, forKey: Self.structuredWorkoutKey)
            }
            WorkoutCoordinator.shared.receiveStructuredWorkout(decoded)
            NotificationCenter.default.post(name: .watchStructuredWorkoutReceived, object: decoded)
        }

        // Mirror workout — iPhone started a workout, show Ready screen on Watch.
        // Skip if a triathlon plan is pending — the Race tab takes priority.
        if let mirror = message["mirrorWorkout"] as? [String: Any],
           let name = mirror["name"] as? String,
           triathlonPlan == nil {
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

    // Handles transferUserInfo deliveries (queued, never overwritten — used for triathlon plans)
    nonisolated func session(_ session: WCSession,
                             didReceiveUserInfo userInfo: [String: Any]) {
        DispatchQueue.main.async { [weak self] in self?.applyMessage(userInfo) }
    }
}
