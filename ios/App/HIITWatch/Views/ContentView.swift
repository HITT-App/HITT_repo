import SwiftUI

struct ContentView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        TabView {
            TodayView()
            ActiveWorkoutView()
            StatsView()
        }
        .tabViewStyle(.page)
    }
}
