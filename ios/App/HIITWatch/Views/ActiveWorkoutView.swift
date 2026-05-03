import SwiftUI

struct ActiveWorkoutView: View {
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        VStack(spacing: 10) {
            if workoutManager.isActive {
                // Live workout screen
                VStack(spacing: 4) {
                    Text(workoutManager.elapsedTimeFormatted)
                        .font(.system(size: 36, weight: .bold, design: .monospaced))
                        .foregroundColor(.yellow)

                    HStack(spacing: 16) {
                        MetricTile(
                            value: "\(workoutManager.currentHeartRate)",
                            unit: "BPM",
                            icon: "heart.fill",
                            color: .red
                        )
                        MetricTile(
                            value: "\(workoutManager.activeCalories)",
                            unit: "CAL",
                            icon: "flame.fill",
                            color: .orange
                        )
                    }

                    if let workout = workoutManager.activeWorkout {
                        Text(workout.name)
                            .font(.caption2)
                            .foregroundColor(.gray)
                            .lineLimit(1)
                    }

                    Button(action: { workoutManager.endWorkout() }) {
                        Label("End", systemImage: "stop.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.red)
                    .padding(.top, 4)
                }
                .padding()
            } else {
                // Idle state
                VStack(spacing: 8) {
                    Image(systemName: "timer")
                        .font(.title)
                        .foregroundColor(.gray)
                    Text("No active\nworkout")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                    Text("Start from Today")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
}

private struct MetricTile: View {
    let value: String
    let unit: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.caption)
            Text(value)
                .font(.title3.bold())
                .foregroundColor(.white)
            Text(unit)
                .font(.system(size: 9))
                .foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(6)
        .background(Color.white.opacity(0.08))
        .cornerRadius(8)
    }
}
