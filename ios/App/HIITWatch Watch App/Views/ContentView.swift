import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var coordinator: WorkoutCoordinator

    var body: some View {
        // Always use the same TabView structure. Switching the root view tree
        // when a workout starts destroys ActiveWorkoutView's @State, which is
        // why the previous lock-on-active attempt threw users back to the picker
        // mid-countdown. Locking the horizontal swipe without losing view state
        // needs a different approach — see task #16.
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

    @ViewBuilder
    private var workoutTab: some View {
        if let sw = coordinator.pendingStructuredWorkout {
            StructuredWorkoutView(workout: sw)
        } else {
            ActiveWorkoutTab()
        }
    }
}
