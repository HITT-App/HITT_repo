import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var coordinator: WorkoutCoordinator

    var body: some View {
        TabView(selection: $coordinator.activeTab) {
            TodayView().tag(0)
            workoutTab.tag(1)
            TriathlonView().tag(2)
            StatsView().tag(3)
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
