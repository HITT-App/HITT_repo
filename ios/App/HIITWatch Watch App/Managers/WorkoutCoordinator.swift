import Foundation
import Combine

// Shared state for routing and mirrored workout handoff.
// WatchSessionManager writes here when the iPhone sends a mirror message;
// ContentView observes activeTab; ActiveWorkoutView observes pendingWorkoutName.

final class WorkoutCoordinator: NSObject, ObservableObject {
    static let shared = WorkoutCoordinator()

    @Published var activeTab: Int = 0
    @Published var pendingWorkoutName: String? = nil

    private override init() { super.init() }

    func receiveMirroredWorkout(named name: String) {
        DispatchQueue.main.async {
            self.pendingWorkoutName = name
            self.activeTab = 1
        }
    }

    func clearPending() {
        DispatchQueue.main.async {
            self.pendingWorkoutName = nil
        }
    }
}
