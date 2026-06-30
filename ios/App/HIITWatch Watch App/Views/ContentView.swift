import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var coordinator: WorkoutCoordinator

    var body: some View {
        // Always use the same TabView structure. Switching the root view tree
        // when a workout starts destroys ActiveWorkoutView's @State, which is
        // why the previous lock-on-active attempt threw users back to the picker
        // mid-countdown.
        //
        // To prevent accidental horizontal swipes during a live workout we
        // ALWAYS attach a horizontal-drag-eating gesture and gate its effect
        // on coordinator.workoutInProgress at handler time. The modifier
        // itself is unconditional so the view-tree shape never changes — only
        // the boolean inside the closure flips.
        TabView(selection: $coordinator.activeTab) {
            TodayView().tag(0)
            workoutTab.tag(1)
            TriathlonView().tag(2)
        }
        .tabViewStyle(.page)
        // Block horizontal page-swipe while a workout is live so the user
        // can't accidentally swipe out of the workout tab. The high-priority
        // drag gesture is ALWAYS attached (modifier shape stays constant so
        // the view tree never rebuilds), and `including:` toggles whether it
        // actually claims gestures from the underlying TabView. `.subviews`
        // is a no-op pass-through; `.all` consumes the drag before TabView
        // can act on it.
        .highPriorityGesture(
            DragGesture(minimumDistance: 4, coordinateSpace: .local),
            including: coordinator.workoutInProgress ? .all : .subviews
        )
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
