import SwiftUI

@main
struct HIITWatchApp: App {
    @StateObject private var sessionManager = WatchSessionManager.shared
    @StateObject private var workoutManager = WorkoutManager.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(sessionManager)
                .environmentObject(workoutManager)
        }
    }
}
