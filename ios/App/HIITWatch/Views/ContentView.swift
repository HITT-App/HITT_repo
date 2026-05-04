import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            TodayView()
            ActiveWorkoutView()
            StatsView()
        }
        .tabViewStyle(.page)
    }
}
