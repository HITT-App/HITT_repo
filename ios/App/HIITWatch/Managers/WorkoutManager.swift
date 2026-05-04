import Foundation
import HealthKit

// Manages a live HKWorkoutSession on the Watch.
// Views own their own @State; this class handles the HealthKit session only.
class WorkoutManager: NSObject {

    static let shared = WorkoutManager()
    private let healthStore = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?

    var onHeartRateUpdate: ((Int) -> Void)?
    var onCaloriesUpdate: ((Int) -> Void)?
    var onSessionEnded: ((HKWorkout?) -> Void)?

    func start(_ workout: WatchWorkout) {
        let config = HKWorkoutConfiguration()
        config.activityType = .highIntensityIntervalTraining
        config.locationType = .indoor
        do {
            let s = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let b = s.associatedWorkoutBuilder()
            b.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            s.delegate = self
            b.delegate = self
            session = s
            builder = b
            s.startActivity(with: Date())
            b.beginCollection(withStart: Date()) { _, _ in }
        } catch {
            print("WorkoutManager: failed to start — \(error)")
        }
    }

    func end() {
        guard let session else { return }
        session.end()
    }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
    func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        if toState == .ended {
            builder?.endCollection(withEnd: date) { [weak self] _, _ in
                self?.builder?.finishWorkout { workout, _ in
                    DispatchQueue.main.async { self?.onSessionEnded?(workout) }
                }
            }
        }
    }
    func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {}
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
    func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
    func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let qType = type as? HKQuantityType else { continue }
            let stats = workoutBuilder.statistics(for: qType)
            DispatchQueue.main.async { [weak self] in
                switch qType.identifier {
                case HKQuantityTypeIdentifier.heartRate.rawValue:
                    let v = stats?.mostRecentQuantity()?.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0
                    self?.onHeartRateUpdate?(Int(v))
                case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
                    let v = stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
                    self?.onCaloriesUpdate?(Int(v))
                default: break
                }
            }
        }
    }
}
