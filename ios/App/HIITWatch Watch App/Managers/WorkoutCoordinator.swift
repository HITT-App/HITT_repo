import Foundation
import Combine

final class WorkoutCoordinator: NSObject, ObservableObject {
    static let shared = WorkoutCoordinator()

    @Published var activeTab: Int = 0
    @Published var pendingWorkoutName: String? = nil
    @Published var pendingStructuredWorkout: WatchWorkout? = nil
    // When true, ContentView pins to the workout tab and disables the
    // horizontal swipe so the user can't accidentally leave a live workout.
    @Published var workoutInProgress: Bool = false

    private override init() { super.init() }

    func receiveMirroredWorkout(named name: String) {
        DispatchQueue.main.async {
            self.pendingWorkoutName = name
            self.activeTab = 1
        }
    }

    func receiveStructuredWorkout(_ workout: WatchWorkout) {
        DispatchQueue.main.async {
            self.pendingStructuredWorkout = workout
            self.activeTab = 1
        }
    }

    func navigateToRaceTab() {
        DispatchQueue.main.async { self.activeTab = 2 }
    }

    func clearPending() {
        DispatchQueue.main.async {
            self.pendingWorkoutName = nil
        }
    }

    func clearStructuredWorkout() {
        DispatchQueue.main.async {
            self.pendingStructuredWorkout = nil
            UserDefaults.standard.removeObject(forKey: "hiit.structuredWorkout")
            self.activeTab = 0
        }
    }
}
