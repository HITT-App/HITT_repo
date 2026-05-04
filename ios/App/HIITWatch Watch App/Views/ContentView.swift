import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            TodayView()
            ActiveWorkoutTab()
            TriathlonView()
            StatsView()
        }
        .tabViewStyle(.page)
    }
}
