import SwiftUI
import Combine

private let hiitOrange = Color(red: 0.976, green: 0.451, blue: 0.086)

// MARK: - Phase

private enum WorkoutPhase {
    case idle
    case ready      // Mirrored plan received — waiting for user to tap READY
    case countdown  // 3-2-1 countdown before recording starts
    case active     // Workout is recording
}

// MARK: - ActiveWorkoutView

struct ActiveWorkoutView: View {
    @ObservedObject private var coordinator = WorkoutCoordinator.shared

    @State private var phase: WorkoutPhase = .idle
    @State private var elapsedSeconds = 0
    @State private var heartRate = 0
    @State private var calories = 0
    @State private var workoutName = ""
    @State private var ticker: Timer? = nil
    @State private var countdownValue = 3

    var body: some View {
        Group {
            switch phase {
            case .idle:      idleScreen
            case .ready:     readyScreen
            case .countdown: countdownScreen
            case .active:    activeScreen
            }
        }
        .onReceive(coordinator.$pendingWorkoutName) { name in
            guard let name else { return }
            if phase == .idle || phase == .ready {
                workoutName = name
                phase = .ready
            }
        }
    }

    // MARK: - Idle

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
            Text("Start a workout\nfrom the iPhone")
                .font(.system(size: 11))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Ready (mirrored plan received)

    private var readyScreen: some View {
        VStack(spacing: 10) {
            Text("🏋️")
                .font(.system(size: 32))
            Text(workoutName.isEmpty ? "WORKOUT" : workoutName.uppercased())
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .tracking(1.2)
                .lineLimit(1)
            Text("Synced from iPhone")
                .font(.system(size: 10))
                .foregroundColor(.gray)

            Spacer(minLength: 6)

            Button(action: startCountdown) {
                Text("READY  →")
                    .font(.system(size: 14, weight: .black))
                    .tracking(1.2)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(hiitOrange)
                    .cornerRadius(22)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 6)
        }
        .padding(.vertical, 10)
    }

    // MARK: - Countdown

    private var countdownScreen: some View {
        VStack {
            Spacer()
            ZStack {
                Circle()
                    .stroke(hiitOrange.opacity(0.2), lineWidth: 4)
                    .frame(width: 100, height: 100)
                Text(countdownValue > 0 ? "\(countdownValue)" : "GO!")
                    .font(.system(size: countdownValue > 0 ? 64 : 36,
                                  weight: .black,
                                  design: .rounded))
                    .foregroundColor(countdownValue > 0 ? .white : hiitOrange)
            }
            Spacer()
        }
    }

    // MARK: - Active

    private var activeScreen: some View {
        VStack(spacing: 0) {
            Text(workoutName.isEmpty ? "ACTIVE" : workoutName.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(hiitOrange)
                .tracking(1.2)
                .lineLimit(1)
                .padding(.top, 6)

            Text(timeFormatted)
                .font(.system(size: 44, weight: .black, design: .monospaced))
                .foregroundColor(.white)
                .padding(.vertical, 4)

            HStack(spacing: 8) {
                metricTile(value: heartRate > 0 ? "\(heartRate)" : "—",
                           unit: "BPM", icon: "heart.fill", color: .red)
                metricTile(value: calories > 0 ? "\(calories)" : "—",
                           unit: "KCAL", icon: "flame.fill", color: hiitOrange)
            }
            .padding(.horizontal, 4)

            Spacer()

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

    // MARK: - Countdown logic

    private func startCountdown() {
        phase = .countdown
        countdownValue = 3
        tick()
    }

    private func tick() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            if self.countdownValue > 0 {
                self.countdownValue -= 1
                self.tick()
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    self.beginWorkout()
                }
            }
        }
    }

    private func beginWorkout() {
        let w = WatchWorkout(
            id: UUID().uuidString,
            name: workoutName.isEmpty ? "Workout" : workoutName,
            durationMinutes: 60,
            exercises: []
        )
        coordinator.clearPending()
        WorkoutManager.shared.start(w)
        phase = .active
        startTicker()
    }

    // MARK: - Workout control

    private func stopWorkout() {
        ticker?.invalidate(); ticker = nil
        WorkoutManager.shared.end()
        phase = .idle
    }

    private func startTicker() {
        ticker?.invalidate()
        elapsedSeconds = WorkoutManager.shared.elapsedSeconds
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            self.elapsedSeconds += 1
        }
    }

    private var timeFormatted: String {
        String(format: "%d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
    }

    // MARK: - Lifecycle (called from wrapper)

    func setup() {
        if WorkoutManager.shared.isRunning {
            phase = .active
            startTicker()
        } else if let name = coordinator.pendingWorkoutName {
            workoutName = name
            phase = .ready
        }

        WorkoutManager.shared.onStateChange = { running, name in
            if running {
                self.phase = .active
                self.workoutName = name ?? ""
                self.startTicker()
            } else {
                self.ticker?.invalidate(); self.ticker = nil
                self.elapsedSeconds = 0; self.heartRate = 0; self.calories = 0
                self.phase = self.coordinator.pendingWorkoutName != nil ? .ready : .idle
            }
        }
        WorkoutManager.shared.onHeartRateUpdate = { self.heartRate = $0 }
        WorkoutManager.shared.onCaloriesUpdate  = { self.calories = $0 }
    }

    func teardown() {
        WorkoutManager.shared.onStateChange     = nil
        WorkoutManager.shared.onHeartRateUpdate = nil
        WorkoutManager.shared.onCaloriesUpdate  = nil
        ticker?.invalidate(); ticker = nil
    }
}

// MARK: - Wrapper

struct ActiveWorkoutTab: View {
    var body: some View { ActiveWorkoutViewWrapper() }
}

private struct ActiveWorkoutViewWrapper: View {
    @State private var inner = ActiveWorkoutView()

    var body: some View {
        inner
            .onAppear  { inner.setup() }
            .onDisappear { inner.teardown() }
    }
}
