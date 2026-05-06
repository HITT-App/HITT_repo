import SwiftUI
import HealthKit

// Receives the mirrored workout prompt from watchOS when the iPhone
// starts an HKWorkoutSession. Routes the user to the Ready screen.
class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        WorkoutCoordinator.shared.receiveMirroredWorkout(workoutConfiguration)
    }
}

@main
struct HIITWatchApp: App {
    @WKApplicationDelegateAdaptor(WatchAppDelegate.self) var appDelegate

    init() {
        WatchSessionManager.shared.activate()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(WorkoutCoordinator.shared)
        }
    }
}
