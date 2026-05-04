import SwiftUI

struct TodayView: View {
    @State private var workout: WatchWorkout? = nil

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "bolt.fill").foregroundColor(.yellow)
                    Text("Today").font(.headline)
                }
                if let w = workout {
                    Text(w.name).font(.title3.bold())
                    Text("\(w.durationMinutes) min").font(.caption).foregroundColor(.gray)
                    ForEach(w.exercises.prefix(4)) { ex in
                        HStack {
                            Circle().fill(Color.yellow).frame(width: 6, height: 6)
                            Text(ex.name).font(.caption2).foregroundColor(.secondary)
                            Spacer()
                            Text(ex.setsRepsLabel).font(.caption2).foregroundColor(.gray)
                        }
                    }
                    NavigationLink("Start") {
                        ActiveWorkoutView()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.yellow)
                } else {
                    Text("No workout today").font(.caption).foregroundColor(.gray)
                }
            }
            .padding()
        }
        .onReceive(NotificationCenter.default.publisher(for: .watchWorkoutReceived)) { note in
            workout = note.object as? WatchWorkout
        }
    }
}
