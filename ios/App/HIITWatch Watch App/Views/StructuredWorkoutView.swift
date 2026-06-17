import SwiftUI
import WatchKit

private let swOrange = Color(red: 1,    green: 0.541, blue: 0.149)
private let swRed    = Color(red: 1,    green: 0.271, blue: 0.227)
private let swGold   = Color(red: 1,    green: 0.690, blue: 0.125)
private let swYellow = Color(red: 1,    green: 0.753, blue: 0.180)
private let swDim    = Color(white: 0.541)

private let SET_REST_DEFAULT      = 20   // seconds between sets
private let EXERCISE_REST_DEFAULT = 40   // seconds between exercises

private func swFmt(_ s: Int) -> String {
    String(format: "%02d:%02d", s / 60, s % 60)
}

private enum SWPhase { case ready, countdown, exercise, rest, paused, done }

struct StructuredWorkoutView: View {
    let workout: WatchWorkout

    @State private var phase: SWPhase = .ready
    @State private var exerciseIndex = 0
    @State private var setIndex = 0
    @State private var stepSeconds = 0        // countdown for timed exercise / rest
    @State private var restIsExerciseBreak = false
    @State private var countdownVal = 3
    @State private var heartRate = 0
    @State private var calories = 0
    @State private var totalElapsed = 0
    @State private var prePhase: SWPhase = .exercise
    @State private var mainTicker: Timer?
    @State private var showEndConfirm = false

    private var currentExercise: WatchExercise? {
        guard exerciseIndex < workout.exercises.count else { return nil }
        return workout.exercises[exerciseIndex]
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if showEndConfirm {
                endConfirmView
            } else {
                switch phase {
                case .ready:     readyView
                case .countdown: countdownView
                case .exercise:  exerciseView
                case .rest:      restView
                case .paused:    pausedView
                case .done:      doneView
                }
            }
        }
        .onAppear {
            WorkoutManager.shared.onHeartRateUpdate = { bpm in heartRate = bpm }
            WorkoutManager.shared.onCaloriesUpdate  = { cal in calories = cal }
        }
        .onDisappear {
            WorkoutManager.shared.onHeartRateUpdate = nil
            WorkoutManager.shared.onCaloriesUpdate  = nil
            mainTicker?.invalidate()
            mainTicker = nil
        }
    }

    // MARK: - Ready

    private var readyView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("READY TO START")
                        .font(.system(size: 9, weight: .bold)).tracking(1.2).foregroundColor(swOrange)
                    Text(workout.name)
                        .font(.system(size: 15, weight: .black)).foregroundColor(.white).lineLimit(2)
                    Text("\(workout.exercises.count) exercise\(workout.exercises.count == 1 ? "" : "s")")
                        .font(.system(size: 10)).foregroundColor(swDim)
                }
                .padding(.horizontal, 14).padding(.top, 10).padding(.bottom, 8)

                ForEach(Array(workout.exercises.enumerated()), id: \.element.id) { idx, ex in
                    HStack(spacing: 8) {
                        Text("\(idx + 1)")
                            .font(.system(size: 10, weight: .bold)).foregroundColor(swOrange)
                            .frame(width: 16, alignment: .trailing)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(ex.name)
                                .font(.system(size: 12, weight: .semibold)).foregroundColor(.white).lineLimit(1)
                            Text(ex.setsRepsLabel)
                                .font(.system(size: 10)).foregroundColor(swDim)
                        }
                    }
                    .padding(.horizontal, 14).padding(.vertical, 5)
                    if idx < workout.exercises.count - 1 {
                        Divider().background(Color.white.opacity(0.08)).padding(.leading, 38)
                    }
                }

                Button(action: startCountdown) {
                    Text("START  →")
                        .font(.system(size: 14, weight: .black)).tracking(1).foregroundColor(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 11)
                        .background(swOrange).cornerRadius(22)
                }
                .buttonStyle(.plain).padding(.horizontal, 12).padding(.top, 12).padding(.bottom, 10)
            }
        }
    }

    // MARK: - Countdown

    private var countdownView: some View {
        VStack {
            Spacer()
            Text(workout.name.uppercased())
                .font(.system(size: 10, weight: .semibold)).tracking(1).foregroundColor(swOrange)
                .padding(.bottom, 4)
            ZStack {
                Circle().stroke(swOrange.opacity(0.2), lineWidth: 5).frame(width: 96, height: 96)
                Circle().stroke(swOrange, lineWidth: 5).frame(width: 96, height: 96)
                    .opacity(countdownVal > 0 ? 1 : 0)
                Text(countdownVal > 0 ? "\(countdownVal)" : "GO!")
                    .font(.system(size: countdownVal > 0 ? 62 : 34, weight: .black, design: .rounded))
                    .foregroundColor(countdownVal > 0 ? .white : swOrange)
            }
            Text("Get ready…").font(.system(size: 11)).foregroundColor(swDim).padding(.top, 8)
            Spacer()
        }
    }

    // MARK: - Exercise

    private var exerciseView: some View {
        let ex = currentExercise
        let totalSets = ex?.sets ?? 1
        let isTimed = ex?.durationSeconds != nil

        return VStack(spacing: 0) {
            HStack {
                Label(heartRate > 0 ? "\(heartRate)" : "—", systemImage: "heart.fill")
                    .font(.system(size: 10)).foregroundColor(swRed)
                Spacer()
                Label("\(calories)", systemImage: "flame.fill")
                    .font(.system(size: 10)).foregroundColor(swGold)
            }
            .padding(.horizontal, 12).padding(.top, 8)

            Spacer()

            Text(ex?.name ?? "")
                .font(.system(size: 18, weight: .black)).foregroundColor(.white)
                .multilineTextAlignment(.center).padding(.horizontal, 10).lineLimit(2)

            Text("Set \(setIndex + 1) of \(totalSets)")
                .font(.system(size: 11, weight: .semibold)).foregroundColor(swOrange).padding(.top, 3)

            Spacer(minLength: 6)

            if isTimed {
                Text(swFmt(stepSeconds))
                    .font(.system(size: 46, weight: .black, design: .monospaced)).foregroundColor(.white)
            } else if let reps = ex?.reps {
                VStack(spacing: 2) {
                    Text("\(reps)")
                        .font(.system(size: 52, weight: .black, design: .monospaced)).foregroundColor(swOrange)
                    Text("REPS")
                        .font(.system(size: 9, weight: .bold)).tracking(1.5).foregroundColor(swDim)
                }
            }

            Spacer(minLength: 6)

            HStack(spacing: 8) {
                Button(action: {
                    prePhase = .exercise
                    phase = .paused
                }) {
                    Image(systemName: "pause.fill")
                        .font(.system(size: 15)).foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 11)
                        .background(Color.white.opacity(0.1)).cornerRadius(18)
                }
                .buttonStyle(.plain)

                Button(action: completeSet) {
                    Text("Done ✓")
                        .font(.system(size: 14, weight: .bold)).foregroundColor(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 11)
                        .background(swOrange).cornerRadius(18)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 10).padding(.bottom, 10)
        }
    }

    // MARK: - Rest

    private var restView: some View {
        VStack(spacing: 0) {
            Text("REST")
                .font(.system(size: 10, weight: .black)).tracking(2).foregroundColor(swDim)
                .padding(.top, 10)

            Spacer()

            ZStack {
                Circle().stroke(Color.white.opacity(0.08), lineWidth: 5).frame(width: 76, height: 76)
                Text(swFmt(stepSeconds))
                    .font(.system(size: 32, weight: .black, design: .monospaced)).foregroundColor(.white)
            }

            Spacer(minLength: 4)

            if let ex = currentExercise {
                VStack(spacing: 2) {
                    Text(restIsExerciseBreak ? "NEXT EXERCISE" : "NEXT SET")
                        .font(.system(size: 8, weight: .bold)).tracking(1.2).foregroundColor(swDim)
                    Text(ex.name)
                        .font(.system(size: 13, weight: .bold)).foregroundColor(swOrange).lineLimit(1)
                    Text(restIsExerciseBreak ? ex.setsRepsLabel : "Set \(setIndex + 1) of \(ex.sets ?? 1)")
                        .font(.system(size: 10)).foregroundColor(swDim)
                }
                .padding(.vertical, 4)
            }

            Spacer(minLength: 4)

            Button(action: skipRest) {
                Text("Skip →")
                    .font(.system(size: 12, weight: .semibold)).foregroundColor(swOrange)
                    .frame(maxWidth: .infinity).padding(.vertical, 9)
                    .background(Color.white.opacity(0.06)).cornerRadius(16)
            }
            .buttonStyle(.plain).padding(.horizontal, 12).padding(.bottom, 10)
        }
    }

    // MARK: - Paused

    private var pausedView: some View {
        VStack(spacing: 12) {
            Text("PAUSED")
                .font(.system(size: 11, weight: .black)).tracking(1.5).foregroundColor(swYellow)
            Text(swFmt(totalElapsed))
                .font(.system(size: 34, weight: .black, design: .monospaced)).foregroundColor(.white)
            HStack(spacing: 12) {
                Button(action: { showEndConfirm = true }) {
                    Image(systemName: "stop.fill")
                        .font(.system(size: 17)).foregroundColor(.white)
                        .frame(width: 46, height: 46).background(swRed).cornerRadius(23)
                }
                .buttonStyle(.plain)
                Button(action: { phase = prePhase }) {
                    Image(systemName: "play.fill")
                        .font(.system(size: 17)).foregroundColor(.black)
                        .frame(width: 46, height: 46).background(swOrange).cornerRadius(23)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Done

    private var doneView: some View {
        CompletionView(
            variant: .celebrate(elapsedSeconds: totalElapsed, calories: calories, workoutName: workout.name),
            onDone: { WorkoutCoordinator.shared.clearStructuredWorkout() }
        )
    }

    // MARK: - End confirm

    private var endConfirmView: some View {
        VStack(spacing: 8) {
            Text("END WORKOUT?")
                .font(.system(size: 11, weight: .black)).tracking(1).foregroundColor(swRed)
            Text(swFmt(totalElapsed))
                .font(.system(size: 30, weight: .black, design: .monospaced)).foregroundColor(.white)
            VStack(spacing: 7) {
                Button(action: {
                    showEndConfirm = false
                    mainTicker?.invalidate(); mainTicker = nil
                    WorkoutManager.shared.end()
                    phase = .done
                }) {
                    Text("End & Save")
                        .font(.system(size: 13, weight: .bold)).foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(swRed).cornerRadius(18)
                }
                .buttonStyle(.plain)
                Button(action: { showEndConfirm = false }) {
                    Text("Resume").font(.system(size: 12)).foregroundColor(swDim)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
        }
    }

    // MARK: - Logic

    private func startCountdown() {
        phase = .countdown
        countdownVal = 3
        tickCountdown()
    }

    private func tickCountdown() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            if countdownVal > 0 {
                countdownVal -= 1
                tickCountdown()
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { beginSession() }
            }
        }
    }

    private func beginSession() {
        guard !workout.exercises.isEmpty else {
            WorkoutCoordinator.shared.clearStructuredWorkout(); return
        }
        WorkoutManager.shared.start(WatchWorkout(
            id: workout.id, name: workout.name,
            durationMinutes: workout.durationMinutes, exercises: workout.exercises
        ))
        exerciseIndex = 0
        setIndex = 0
        totalElapsed = WorkoutManager.shared.elapsedSeconds
        startMainTimer()
        enterExercisePhase()
    }

    private func enterExercisePhase() {
        if let dur = currentExercise?.durationSeconds { stepSeconds = dur }
        phase = .exercise
        WKInterfaceDevice.current().play(.click)
    }

    private func completeSet() {
        guard let ex = currentExercise else { return }
        let totalSets = ex.sets ?? 1
        WKInterfaceDevice.current().play(.success)

        if setIndex + 1 < totalSets {
            // More sets — increment so rest view shows "next set"
            setIndex += 1
            restIsExerciseBreak = false
            stepSeconds = ex.restAfterSetSeconds ?? SET_REST_DEFAULT
            phase = .rest
        } else if exerciseIndex + 1 < workout.exercises.count {
            // Last set, more exercises — advance so rest view shows "next exercise"
            exerciseIndex += 1
            setIndex = 0
            restIsExerciseBreak = true
            stepSeconds = ex.restAfterExerciseSeconds ?? EXERCISE_REST_DEFAULT
            phase = .rest
            WKInterfaceDevice.current().play(.notification)
        } else {
            finishWorkout()
        }
    }

    private func skipRest() {
        enterExercisePhase()
    }

    private func finishWorkout() {
        mainTicker?.invalidate(); mainTicker = nil
        WorkoutManager.shared.end()
        WKInterfaceDevice.current().play(.retry)
        phase = .done
    }

    // MARK: - Timer

    private func startMainTimer() {
        mainTicker?.invalidate()
        mainTicker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            guard phase != .paused, phase != .done, phase != .ready, phase != .countdown else { return }
            totalElapsed += 1
            switch phase {
            case .exercise:
                guard currentExercise?.durationSeconds != nil else { return }
                if stepSeconds > 0 { stepSeconds -= 1 } else { completeSet() }
            case .rest:
                if stepSeconds > 0 { stepSeconds -= 1 } else { skipRest() }
            default: break
            }
        }
    }
}
