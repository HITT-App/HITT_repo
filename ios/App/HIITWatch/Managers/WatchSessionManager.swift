import Foundation
import WatchConnectivity
import HealthKit

// Shared data models
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
        if let sets, let reps { return "\(sets)×\(reps)" }
        if let dur = durationSeconds { return "\(dur)s" }
        return ""
    }
}

// Lightweight message bus — views poll or receive via NotificationCenter
enum WatchBus {
    static func postWorkout(_ workout: WatchWorkout?) {
        NotificationCenter.default.post(
            name: .watchWorkoutReceived,
            object: workout
        )
    }
}

extension Notification.Name {
    static let watchWorkoutReceived = Notification.Name("watch.workoutReceived")
}
