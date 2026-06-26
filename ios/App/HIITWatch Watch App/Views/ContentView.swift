import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var coordinator: WorkoutCoordinator

    var body: some View {
        if coordinator.workoutInProgress {
            // While a live workout is running, pin to the workout tab and drop
            // the horizontal page swipe so the user can't accidentally swipe
            // out to Today / Triathlon / Stats mid-set.
            workoutTab
        } else {
            TabView(selection: $coordinator.activeTab) {
                TodayView().tag(0)
                workoutTab.tag(1)
                TriathlonView().tag(2)
            }
            .tabViewStyle(.page)
            .onReceive(coordinator.$pendingStructuredWorkout) { workout in
                if workout != nil { coordinator.activeTab = 1 }
            }
        }
    }

    @ViewBuilder
    private var workoutTab: some View {
        if let sw = coordinator.pendingStructuredWorkout {
            StructuredWorkoutView(workout: sw)
        } else {
            ActiveWorkoutTab()
        }
    }
}
