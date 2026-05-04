import SwiftUI

private let hiitOrange = Color(red: 0.976, green: 0.451, blue: 0.086)

struct ActiveWorkoutView: View {
    @State private var isActive = false
    @State private var elapsedSeconds = 0
    @State private var heartRate = 0
    @State private var calories = 0
    @State private var workoutName = ""
    @State private var ticker: Timer? = nil

    var body: some View {
        if isActive {
            activeScreen
        } else {
            idleScreen
        }
    }

    private var activeScreen: some View {
        VStack(spacing: 0) {
            // Workout name
            Text(workoutName.isEmpty ? "ACTIVE" : workoutName.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(hiitOrange)
                .tracking(1.2)
                .lineLimit(1)
                .padding(.top, 6)

            // Timer — dominant element
            Text(timeFormatted)
                .font(.system(size: 44, weight: .black, design: .monospaced))
                .foregroundColor(.white)
                .padding(.vertical, 4)

            // Metrics row
            HStack(spacing: 8) {
                metricTile(value: heartRate > 0 ? "\(heartRate)" : "—",
                           unit: "BPM", icon: "heart.fill", color: .red)
                metricTile(value: calories > 0 ? "\(calories)" : "—",
                           unit: "KCAL", icon: "flame.fill", color: hiitOrange)
            }
            .padding(.horizontal, 4)

            Spacer()

            // End button
            Button(action: stopWorkout) {
                HStack(spacing: 6) {
                    Image(systemName: "stop.fill").font(.system(size: 11))
                    Text("END").font(.system(size: 13, weight: .bold)).tracking(1)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(Color.red.opacity(0.8))
                .cornerRadius(20)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 8)
            .padding(.bottom, 6)
        }
    }

    private var idleScreen: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(hiitOrange.opacity(0.12))
                    .frame(width: 56, height: 56)
                Image(systemName: "bolt.fill")
                    .font(.system(size: 24))
                    .foregroundColor(hiitOrange)
            }
            Text("Ready to Work")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            Text("Start a workout\nfrom Today tab")
                .font(.system(size: 11))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
    }

    private func metricTile(value: String, unit: String, icon: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon).foregroundColor(color).font(.system(size: 13))
            VStack(alignment: .leading, spacing: 0) {
                Text(value).font(.system(size: 18, weight: .bold)).foregroundColor(.white)
                Text(unit).font(.system(size: 8, weight: .medium)).foregroundColor(.gray)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .padding(.horizontal, 10)
        .background(Color.white.opacity(0.07))
        .cornerRadius(10)
    }

    private var timeFormatted: String {
        String(format: "%d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
    }

    private func startTicker() {
        ticker?.invalidate()
        elapsedSeconds = WorkoutManager.shared.elapsedSeconds
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            elapsedSeconds += 1
        }
    }

    private func stopWorkout() {
        ticker?.invalidate(); ticker = nil
        WorkoutManager.shared.end()
    }

    // MARK: - Lifecycle

    func setup() {
        isActive = WorkoutManager.shared.isRunning
        WorkoutManager.shared.onStateChange = { running, name in
            isActive = running
            workoutName = name ?? ""
            if running {
                startTicker()
            } else {
                ticker?.invalidate(); ticker = nil
                elapsedSeconds = 0; heartRate = 0; calories = 0
            }
        }
        WorkoutManager.shared.onHeartRateUpdate = { heartRate = $0 }
        WorkoutManager.shared.onCaloriesUpdate = { calories = $0 }
        if isActive { startTicker() }
    }

    func teardown() {
        WorkoutManager.shared.onStateChange = nil
        WorkoutManager.shared.onHeartRateUpdate = nil
        WorkoutManager.shared.onCaloriesUpdate = nil
        ticker?.invalidate(); ticker = nil
    }
}

// Wrap so lifecycle methods can be called cleanly
struct ActiveWorkoutTab: View {
    var body: some View {
        ActiveWorkoutViewWrapper()
    }
}

private struct ActiveWorkoutViewWrapper: View {
    @State private var inner = ActiveWorkoutView()

    var body: some View {
        inner
            .onAppear { inner.setup() }
            .onDisappear { inner.teardown() }
    }
}
