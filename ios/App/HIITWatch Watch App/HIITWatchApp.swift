import SwiftUI
import HealthKit

// Receives the system-level workout prompt when the paired iPhone starts
// an HKWorkoutSession (iOS 26+ / watchOS 26+). Routes to the Ready screen.
class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        if WatchSessionManager.shared.triathlonPlan != nil {
            WorkoutCoordinator.shared.navigateToRaceTab()
        } else {
            let name = Self.label(for: workoutConfiguration.activityType)
            WorkoutCoordinator.shared.receiveMirroredWorkout(named: name)
        }
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

@main
struct HIITWatchApp: App {
    @WKApplicationDelegateAdaptor(WatchAppDelegate.self) var appDelegate

    init() {
        WatchSessionManager.shared.activate()
        // If a triathlon plan was queued while the app was closed, go straight to Race tab
        if WatchSessionManager.shared.triathlonPlan != nil {
            WorkoutCoordinator.shared.navigateToRaceTab()
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(WorkoutCoordinator.shared)
        }
    }
}
