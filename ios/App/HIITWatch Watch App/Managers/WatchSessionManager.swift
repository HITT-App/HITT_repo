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
    private static let dayTypeKey           = "hiit.todayDayType"

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
        // Restore locally-set day type (e.g. user marked today as rest on watch)
        if let raw = UserDefaults.standard.string(forKey: Self.dayTypeKey),
           let dt = WatchDayType(rawValue: raw) {
            todayDayType = dt
        }
    }

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    /// Locally override today's day type (e.g. "Mark as rest" from the watch).
    /// Persists so it survives restarts; iPhone-pushed updates still win on next message.
    func setLocalDayType(_ type: WatchDayType) {
        todayDayType = type
        UserDefaults.standard.set(type.rawValue, forKey: Self.dayTypeKey)
        NotificationCenter.default.post(name: .watchDayTypeChanged, object: type)
    }

    // Decode helper that logs both success and failure with the JSON error,
    // so a silent decode bug surfaces in Console.app instead of vanishing.
    // Filter Console with subsystem `[HIIT.WCSession]` to see the full chain.
    private func decode<T: Decodable>(_ type: T.Type, from raw: [String: Any], key: String) -> T? {
        do {
            let data = try JSONSerialization.data(withJSONObject: raw)
            let decoded = try JSONDecoder().decode(T.self, from: data)
            NSLog("[HIIT.WCSession] decoded key=\(key) as \(T.self) ✓")
            return decoded
        } catch {
            NSLog("[HIIT.WCSession] decode FAILED key=\(key) as \(T.self) — \(error)")
            return nil
        }
    }

    private func applyMessage(_ message: [String: Any]) {
        NSLog("[HIIT.WCSession] applyMessage keys=\(Array(message.keys))")

        // Standard workout — persist so it survives Watch app restarts
        if let workoutData = message["workout"] as? [String: Any],
           let decoded = decode(WatchWorkout.self, from: workoutData, key: "workout") {
            todayWorkout = decoded
            if let encoded = try? JSONEncoder().encode(decoded) {
                UserDefaults.standard.set(encoded, forKey: Self.workoutKey)
            }
            NotificationCenter.default.post(name: .watchWorkoutReceived, object: decoded)
            NSLog("[HIIT.WCSession] posted .watchWorkoutReceived name=\(decoded.name)")
        }

        // Clear workout
        if let cleared = message["clearWorkout"] as? Bool, cleared {
            todayWorkout = nil
            UserDefaults.standard.removeObject(forKey: Self.workoutKey)
            NotificationCenter.default.post(name: .watchWorkoutReceived, object: nil)
            NSLog("[HIIT.WCSession] posted .watchWorkoutReceived (cleared)")
        }

        // Triathlon plan — also auto-navigate to the Race tab
        if let planData = message["triathlon"] as? [String: Any],
           let decoded = decode(TriathlonPlan.self, from: planData, key: "triathlon") {
            triathlonPlan = decoded
            // Persist so the plan survives Watch app restarts
            if let encoded = try? JSONEncoder().encode(decoded) {
                UserDefaults.standard.set(encoded, forKey: Self.planKey)
            }
            NotificationCenter.default.post(name: .watchTriathlonReceived, object: decoded)
            NSLog("[HIIT.WCSession] posted .watchTriathlonReceived name=\(decoded.name) legs=\(decoded.legs.count)")
            WorkoutCoordinator.shared.navigateToRaceTab()
        }

        // Day type (open / recovery / rest)
        if let t = message["dayType"] as? String, let dt = WatchDayType(rawValue: t) {
            todayDayType = dt
            NotificationCenter.default.post(name: .watchDayTypeChanged, object: dt)
            NSLog("[HIIT.WCSession] posted .watchDayTypeChanged value=\(t)")
        }

        // Structured workout — full exercise sequence from the phone
        if let swData = message["structuredWorkout"] as? [String: Any],
           let decoded = decode(WatchWorkout.self, from: swData, key: "structuredWorkout") {
            if let encoded = try? JSONEncoder().encode(decoded) {
                UserDefaults.standard.set(encoded, forKey: Self.structuredWorkoutKey)
            }
            WorkoutCoordinator.shared.receiveStructuredWorkout(decoded)
            NotificationCenter.default.post(name: .watchStructuredWorkoutReceived, object: decoded)
            NSLog("[HIIT.WCSession] posted .watchStructuredWorkoutReceived name=\(decoded.name) exercises=\(decoded.exercises.count)")
        }

        // Mirror workout — iPhone started a workout, show Ready screen on Watch.
        // Skip if a triathlon plan is pending — the Race tab takes priority.
        if let mirror = message["mirrorWorkout"] as? [String: Any],
           let name = mirror["name"] as? String,
           triathlonPlan == nil {
            WorkoutCoordinator.shared.receiveMirroredWorkout(named: name)
            NSLog("[HIIT.WCSession] mirrorWorkout received name=\(name)")
        }

        // Clear mirror
        if let clear = message["clearMirrorWorkout"] as? Bool, clear {
            WorkoutCoordinator.shared.clearPending()
            NSLog("[HIIT.WCSession] clearMirrorWorkout received")
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchSessionManager: WCSessionDelegate {
    nonisolated func session(_ session: WCSession,
                             activationDidCompleteWith state: WCSessionActivationState,
                             error: Error?) {
        NSLog("[HIIT.WCSession] activated state=\(state.rawValue) error=\(error?.localizedDescription ?? "none") reachable=\(session.isReachable)")
    }

    nonisolated func session(_ session: WCSession,
                             didReceiveMessage message: [String: Any]) {
        NSLog("[HIIT.WCSession] ← sendMessage (no reply) keys=\(Array(message.keys))")
        DispatchQueue.main.async { [weak self] in self?.applyMessage(message) }
    }

    nonisolated func session(_ session: WCSession,
                             didReceiveMessage message: [String: Any],
                             replyHandler: @escaping ([String: Any]) -> Void) {
        NSLog("[HIIT.WCSession] ← sendMessage (with reply) keys=\(Array(message.keys))")
        DispatchQueue.main.async { [weak self] in self?.applyMessage(message) }
        replyHandler([:])
    }

    nonisolated func session(_ session: WCSession,
                             didReceiveApplicationContext ctx: [String: Any]) {
        NSLog("[HIIT.WCSession] ← updateApplicationContext keys=\(Array(ctx.keys))")
        DispatchQueue.main.async { [weak self] in self?.applyMessage(ctx) }
    }

    // Handles transferUserInfo deliveries (queued, never overwritten — used for triathlon plans)
    nonisolated func session(_ session: WCSession,
                             didReceiveUserInfo userInfo: [String: Any]) {
        NSLog("[HIIT.WCSession] ← transferUserInfo keys=\(Array(userInfo.keys))")
        DispatchQueue.main.async { [weak self] in self?.applyMessage(userInfo) }
    }
}
