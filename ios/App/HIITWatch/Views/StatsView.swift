import SwiftUI

struct StatsView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .foregroundColor(.green)
                    Text("Today")
                        .font(.headline)
                    Spacer()
                }

                StatRow(
                    icon: "figure.walk",
                    color: .green,
                    label: "Steps",
                    value: sessionManager.steps > 0 ? "\(sessionManager.steps)" : "—"
                )

                StatRow(
                    icon: "heart.fill",
                    color: .red,
                    label: "Heart Rate",
                    value: sessionManager.heartRate > 0 ? "\(sessionManager.heartRate) bpm" : "—"
                )

                StatRow(
                    icon: "flame.fill",
                    color: .orange,
                    label: "Calories",
                    value: sessionManager.calories > 0 ? "\(sessionManager.calories) kcal" : "—"
                )

                StatRow(
                    icon: "arrow.left.right",
                    color: .blue,
                    label: "Distance",
                    value: sessionManager.distanceKm > 0 ? String(format: "%.1f km", sessionManager.distanceKm) : "—"
                )

                Button(action: { sessionManager.requestSync() }) {
                    Label("Sync", systemImage: "arrow.clockwise")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
                .padding(.top, 4)
            }
            .padding()
        }
    }
}

private struct StatRow: View {
    let icon: String
    let color: Color
    let label: String
    let value: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(color)
                .frame(width: 20)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption.bold())
                .foregroundColor(.white)
        }
        .padding(.vertical, 2)
    }
}
