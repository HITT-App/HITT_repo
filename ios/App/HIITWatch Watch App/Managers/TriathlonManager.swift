import Foundation
import HealthKit
import WatchConnectivity

extension Notification.Name {
    static let triathlonElapsedTick    = Notification.Name("hiit.triathlonElapsed")
    static let triathlonDistanceUpdate = Notification.Name("hiit.triathlonDist")
    static let triathlonHRUpdate       = Notification.Name("hiit.triathlonHR")
}

final class TriathlonManager: NSObject {
    static let shared = TriathlonManager()

    private let store = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var timer: Timer?
    private(set) var currentLeg = 0
    private var elapsedSeconds = 0

    private override init() { super.init() }

    func startLeg(_ legIndex: Int, legType: String) {
        currentLeg = legIndex
        elapsedSeconds = 0
        guard HKHealthStore.isHealthDataAvailable() else { return }

        let config = HKWorkoutConfiguration()
        config.activityType = hkActivityType(legType)
        config.locationType = legType == "swim" ? .indoor : .outdoor

        do {
            let s = try HKWorkoutSession(healthStore: store, configuration: config)
            let b = s.associatedWorkoutBuilder()
            s.delegate = self
            b.delegate = self
            b.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
            session = s
            builder = b
            s.startActivity(with: Date())
            b.beginCollection(withStart: Date()) { _, _ in }
        } catch {
            print("TriathlonManager: leg start failed — \(error)")
        }

        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            self.elapsedSeconds += 1
            let leg = self.currentLeg
            let secs = self.elapsedSeconds
            NotificationCenter.default.post(
                name: .triathlonElapsedTick,
                object: nil,
                userInfo: ["leg": leg, "secs": secs]
            )
        }
    }

    func endLeg(completion: @escaping () -> Void) {
        timer?.invalidate()
        timer = nil
        guard let s = session, let b = builder else {
            DispatchQueue.main.async { completion() }
            return
        }
        let capturedBuilder = b
        session = nil
        builder = nil
        s.end()
        capturedBuilder.endCollection(withEnd: Date()) { _, _ in
            capturedBuilder.finishWorkout { _, _ in
                DispatchQueue.main.async { completion() }
            }
        }
    }

    func notifyPhoneFinished(_ plan: TriathlonPlan, elapsed: [Int], distKm: [Double]) {
        sendCompletionPayload(event: "triathlonCompleted", plan: plan, elapsed: elapsed, distKm: distKm)
    }

    // User tapped Share on the Watch summary screen. The phone listens for
    // this and generates a share card image, then presents the iOS share sheet.
    func requestPhoneShare(_ plan: TriathlonPlan, elapsed: [Int], distKm: [Double]) {
        sendCompletionPayload(event: "triathlonShareRequested", plan: plan, elapsed: elapsed, distKm: distKm)
    }

    private func sendCompletionPayload(event: String, plan: TriathlonPlan, elapsed: [Int], distKm: [Double]) {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
        var legResults: [[String: Any]] = []
        for i in 0..<plan.legs.count {
            legResults.append([
                "type": plan.legs[i].type,
                "elapsedSeconds": elapsed[i],
                "distanceKm": distKm[i]
            ])
        }
        let payload: [String: Any] = [
            "event": event,
            "raceName": plan.name,
            "legs": legResults
        ]
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(payload, replyHandler: nil, errorHandler: { _ in
                WCSession.default.transferUserInfo(payload)
            })
        } else {
            WCSession.default.transferUserInfo(payload)
        }
    }

    private func hkActivityType(_ legType: String) -> HKWorkoutActivityType {
        switch legType {
        case "swim": return .swimming
        case "bike": return .cycling
        default:     return .running
        }
    }
}

extension TriathlonManager: HKWorkoutSessionDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didChangeTo toState: HKWorkoutSessionState,
                                    from fromState: HKWorkoutSessionState,
                                    date: Date) {}

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.timer?.invalidate()
            self?.timer = nil
        }
    }
}

extension TriathlonManager: HKLiveWorkoutBuilderDelegate {
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
                    let bpm = Int(stats?.mostRecentQuantity()?
                        .doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0)
                    NotificationCenter.default.post(
                        name: .triathlonHRUpdate,
                        object: nil,
                        userInfo: ["bpm": bpm]
                    )
                case HKQuantityTypeIdentifier.distanceSwimming.rawValue,
                     HKQuantityTypeIdentifier.distanceCycling.rawValue,
                     HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
                    let km = (stats?.sumQuantity()?.doubleValue(for: .meter()) ?? 0) / 1000.0
                    NotificationCenter.default.post(
                        name: .triathlonDistanceUpdate,
                        object: nil,
                        userInfo: ["leg": self.currentLeg, "km": km]
                    )
                default: break
                }
            }
        }
    }
}
