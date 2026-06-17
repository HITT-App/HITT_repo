import Foundation
import HealthKit
import WatchConnectivity

final class WorkoutManager: NSObject {
    static let shared = WorkoutManager()

    private(set) var isRunning = false
    private(set) var elapsedSeconds = 0
    private(set) var currentHeartRate = 0
    private(set) var activeCalories = 0

    var onStateChange: ((_ isRunning: Bool, _ workoutName: String?) -> Void)?
    var onHeartRateUpdate: ((Int) -> Void)?
    var onCaloriesUpdate: ((Int) -> Void)?

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var timer: Timer?
    private var activeWorkout: WatchWorkout?

    private override init() { super.init() }

    // MARK: - Public API

    func start(_ workout: WatchWorkout) {
        guard !isRunning, HKHealthStore.isHealthDataAvailable() else { return }
        let config = HKWorkoutConfiguration()
        config.activityType = .highIntensityIntervalTraining
        config.locationType = .indoor
        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let b = session.associatedWorkoutBuilder()
            session.delegate = self
            b.delegate = self
            b.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            workoutSession = session
            builder = b
            activeWorkout = workout
            session.startActivity(with: Date())
            b.beginCollection(withStart: Date()) { _, _ in }
            startTimer()
            DispatchQueue.main.async { [weak self] in
                self?.isRunning = true
                self?.onStateChange?(true, workout.name)
            }
            notifyPhoneStarted(workout)
        } catch {
            print("WorkoutManager: start failed — \(error)")
        }
    }

    func end() {
        guard isRunning, let session = workoutSession, let b = builder else { return }
        stopTimer()
        let cal = activeCalories
        let hr = currentHeartRate
        let elapsed = elapsedSeconds
        let w = activeWorkout
        session.end()
        b.endCollection(withEnd: Date()) { [weak self] _, _ in
            b.finishWorkout { _, _ in
                DispatchQueue.main.async { [weak self] in
                    self?.isRunning = false
                    self?.elapsedSeconds = 0
                    self?.currentHeartRate = 0
                    self?.activeCalories = 0
                    self?.activeWorkout = nil
                    self?.onStateChange?(false, nil)
                    if let workout = w { self?.notifyPhoneCompleted(workout, calories: cal, hr: hr, duration: elapsed) }
                }
            }
        }
    }

    // MARK: - Private

    private func startTimer() {
        elapsedSeconds = 0
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            self?.elapsedSeconds += 1
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func notifyPhoneStarted(_ workout: WatchWorkout) {
        guard WCSession.isSupported(),
              WCSession.default.activationState == .activated,
              WCSession.default.isReachable else { return }
        WCSession.default.sendMessage(
            ["event": "workoutStarted", "workoutId": workout.id, "workoutName": workout.name],
            replyHandler: nil, errorHandler: nil)
    }

    private func notifyPhoneCompleted(_ workout: WatchWorkout, calories: Int, hr: Int, duration: Int) {
        let payload: [String: Any] = [
            "event": "workoutCompleted",
            "workoutId": workout.id,
            "workoutName": workout.name,
            "calories": calories,
            "averageHeartRate": hr,
            "durationSeconds": duration,
        ]
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: { _ in
                WCSession.default.transferUserInfo(payload)
            })
        } else {
            WCSession.default.transferUserInfo(payload)
        }
    }
}

// MARK: - HKWorkoutSessionDelegate

extension WorkoutManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didChangeTo toState: HKWorkoutSessionState,
                                    from fromState: HKWorkoutSessionState, date: Date) {}

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.stopTimer()
            self?.isRunning = false
            self?.onStateChange?(false, nil)
        }
    }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                                    didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let qType = type as? HKQuantityType else { continue }
            let stats = workoutBuilder.statistics(for: qType)
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                switch qType.identifier {
                case HKQuantityTypeIdentifier.heartRate.rawValue:
                    let v = Int(stats?.mostRecentQuantity()?
                        .doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0)
                    self.currentHeartRate = v
                    self.onHeartRateUpdate?(v)
                case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
                    let v = Int(stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)
                    self.activeCalories = v
                    self.onCaloriesUpdate?(v)
                default: break
                }
            }
        }
    }
}
