import SwiftUI

struct ActiveWorkoutView: View {
    @State private var isActive = false
    @State private var elapsedSeconds = 0
    @State private var heartRate = 0
    @State private var calories = 0
    @State private var timer: Timer? = nil

    var body: some View {
        VStack(spacing: 10) {
            if isActive {
                Text(timeFormatted).font(.system(size: 36, weight: .bold, design: .monospaced)).foregroundColor(.yellow)
                HStack(spacing: 16) {
                    metricTile(value: "\(heartRate)", unit: "BPM", icon: "heart.fill", color: .red)
                    metricTile(value: "\(calories)", unit: "CAL", icon: "flame.fill", color: .orange)
                }
                Button("End") {
                    stopWorkout()
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
            } else {
                Image(systemName: "timer").font(.title).foregroundColor(.gray)
                Text("No active workout").font(.caption).foregroundColor(.gray)
            }
        }
        .padding()
    }

    private var timeFormatted: String {
        String(format: "%d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
    }

    func startWorkout() {
        isActive = true
        elapsedSeconds = 0
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            elapsedSeconds += 1
        }
        WorkoutManager.shared.onHeartRateUpdate = { hr in heartRate = hr }
        WorkoutManager.shared.onCaloriesUpdate = { cal in calories = cal }
    }

    private func stopWorkout() {
        timer?.invalidate()
        timer = nil
        isActive = false
        WorkoutManager.shared.end()
    }

    private func metricTile(value: String, unit: String, icon: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Image(systemName: icon).foregroundColor(color).font(.caption)
            Text(value).font(.title3.bold())
            Text(unit).font(.system(size: 9)).foregroundColor(.gray)
        }
        .frame(maxWidth: .infinity)
        .padding(6)
        .background(Color.white.opacity(0.08))
        .cornerRadius(8)
    }
}
