import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var coordinator: WorkoutCoordinator

    var body: some View {
        TabView(selection: $coordinator.activeTab) {
            TodayView()       .tag(0)
            ActiveWorkoutTab().tag(1)
            TriathlonView()   .tag(2)
            StatsView()       .tag(3)
        }
        .tabViewStyle(.page)
    }
}
