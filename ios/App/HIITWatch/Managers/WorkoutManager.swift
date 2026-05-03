import Foundation
import HealthKit
import WatchConnectivity

class WorkoutManager: NSObject, ObservableObject {
    static let shared = WorkoutManager()

    @Published var isActive = false
    @Published var elapsedSeconds: Int = 0
    @Published var currentHeartRate: Int = 0
    @Published var activeCalories: Int = 0
    @Published var activeWorkout: WatchWorkout?

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var timer: Timer?
    private var startDate: Date?

    var elapsedTimeFormatted: String {
        let m = elapsedSeconds / 60
        let s = elapsedSeconds % 60
        return String(format: "%d:%02d", m, s)
    }

    private override init() {
        super.init()
    }

    func startWorkout(_ workout: WatchWorkout) {
        guard !isActive else { return }
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let configuration = HKWorkoutConfiguration()
        configuration.activityType = .highIntensityIntervalTraining
        configuration.locationType = .indoor

        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
            let builder = session.associatedWorkoutBuilder()

            session.delegate = self
            builder.delegate = self
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: configuration)

            workoutSession = session
            self.builder = builder
            activeWorkout = workout
            startDate = Date()

            session.startActivity(with: Date())
            builder.beginCollection(withStart: Date()) { _, _ in }

            startTimer()

            DispatchQueue.main.async { [weak self] in
                self?.isActive = true
            }

            notifyPhoneWorkoutStarted(workout)
        } catch {
            print("WorkoutManager: failed to start session — \(error)")
        }
    }

    func endWorkout() {
        guard isActive, let session = workoutSession, let builder = builder else { return }

        let end = Date()
        session.end()
        builder.endCollection(withEnd: end) { [weak self] _, _ in
            builder.finishWorkout { workout, _ in
                DispatchQueue.main.async { [weak self] in
                    self?.isActive = false
                    self?.elapsedSeconds = 0
                    self?.currentHeartRate = 0
                    self?.activeCalories = 0
                    self?.stopTimer()
                    if let workout {
                        self?.notifyPhoneWorkoutCompleted(workout)
                    }
                    self?.activeWorkout = nil
                }
            }
        }
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            DispatchQueue.main.async { self?.elapsedSeconds += 1 }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func notifyPhoneWorkoutStarted(_ workout: WatchWorkout) {
        guard WCSession.default.isReachable else { return }
        WCSession.default.sendMessage([
            "event": "workoutStarted",
            "workoutId": workout.id,
            "workoutName": workout.name,
        ], replyHandler: nil, errorHandler: nil)
    }

    private func notifyPhoneWorkoutCompleted(_ workout: HKWorkout) {
        let duration = Int(workout.duration)
        let calories = Int(workout.statistics(for: HKQuantityType(.activeEnergyBurned))?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)
        let hr = currentHeartRate

        let payload: [String: Any] = [
            "event": "workoutCompleted",
            "durationSeconds": duration,
            "calories": calories,
            "averageHeartRate": hr,
        ]

        if WCSession.default.isReachable {
            WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: nil)
        } else {
            try? WCSession.default.updateApplicationContext(payload)
        }
    }
}

// MARK: — HKWorkoutSessionDelegate

extension WorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {}
    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.isActive = false
            self?.stopTimer()
        }
    }
}

// MARK: — HKLiveWorkoutBuilderDelegate

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }
            let stats = workoutBuilder.statistics(for: quantityType)

            DispatchQueue.main.async { [weak self] in
                switch quantityType.identifier {
                case HKQuantityTypeIdentifier.heartRate.rawValue:
                    let hr = stats?.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0
                    self?.currentHeartRate = Int(hr)
                case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
                    let cal = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                    self?.activeCalories = Int(cal)
                default:
                    break
                }
            }
        }
    }
}
