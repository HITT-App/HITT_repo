import Foundation
import Combine
import HealthKit

// Shared state for routing and mirrored workout handoff.
// HIITWatchApp writes here when the iPhone starts a workout session;
// ContentView observes activeTab; ActiveWorkoutView observes pendingConfig.

final class WorkoutCoordinator: NSObject, ObservableObject {
    static let shared = WorkoutCoordinator()

    @Published var activeTab: Int = 0
    // pendingWorkoutName is a String so it's Equatable and works with onChange.
    // nil means no pending mirrored workout.
    @Published var pendingWorkoutName: String? = nil

    private override init() { super.init() }

    func receiveMirroredWorkout(_ config: HKWorkoutConfiguration) {
        let name = Self.label(for: config.activityType)
        DispatchQueue.main.async {
            self.pendingWorkoutName = name
            self.activeTab = 1
        }
    }

    func clearPending() {
        pendingWorkoutName = nil
    }

    private static func label(for type: HKWorkoutActivityType) -> String {
        switch type {
        case .running:                     return "Run"
        case .cycling:                     return "Cycle"
        case .swimming:                    return "Swim"
        case .traditionalStrengthTraining: return "Strength"
        default:                           return "HIIT"
        }
    }
}
