import SwiftUI
import HealthKit
import WatchKit

// Receives the system-level workout prompt when the paired iPhone calls
// HKHealthStore.startWatchApp(with:). Routes to the Race tab for triathlons.
class WatchAppDelegate: NSObject, WKApplicationDelegate {
    func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
        let isTriathlon: Bool
        if #available(watchOS 9.0, *) {
            isTriathlon = workoutConfiguration.activityType == .swimBikeRun
        } else {
            isTriathlon = false
        }

        if isTriathlon || WatchSessionManager.shared.triathlonPlan != nil {
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
        // Request read+write HealthKit auth up front so heart rate, calories,
        // and distance actually appear in Stats / Active Workout screens.
        WorkoutManager.shared.requestInitialAuthorization()
        // Subscribe to iPhone-initiated workouts so a Watch already running
        // wakes up and routes correctly when the user taps Send to Watch.
        if #available(watchOS 10.0, *) {
            WorkoutManager.shared.enableWorkoutMirroring()
        }
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
