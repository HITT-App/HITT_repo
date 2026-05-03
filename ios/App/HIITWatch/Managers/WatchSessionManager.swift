import Foundation
import WatchConnectivity
import HealthKit

// Shared data models
struct WatchWorkout: Identifiable, Codable {
    let id: String
    let name: String
    let durationMinutes: Int
    let exercises: [WatchExercise]
}

struct WatchExercise: Identifiable, Codable {
    let id: String
    let name: String
    let sets: Int?
    let reps: Int?
    let durationSeconds: Int?

    var setsRepsLabel: String {
        if let sets, let reps {
            return "\(sets)×\(reps)"
        } else if let dur = durationSeconds {
            return "\(dur)s"
        }
        return ""
    }
}

class WatchSessionManager: NSObject, ObservableObject {
    static let shared = WatchSessionManager()

    @Published var todayWorkout: WatchWorkout?
    @Published var steps: Int = 0
    @Published var heartRate: Int = 0
    @Published var calories: Int = 0
    @Published var distanceKm: Double = 0.0

    private let healthStore = HKHealthStore()
    private var session: WCSession?

    private override init() {
        super.init()
        activateSession()
        requestHealthPermissions()
    }

    // MARK: — WatchConnectivity

    private func activateSession() {
        guard WCSession.isSupported() else { return }
        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    func requestSync() {
        session?.sendMessage(["action": "syncStats"], replyHandler: { [weak self] reply in
            DispatchQueue.main.async {
                self?.applyStatsReply(reply)
            }
        }, errorHandler: nil)
        fetchTodayHealthData()
    }

    private func applyStatsReply(_ reply: [String: Any]) {
        if let s = reply["steps"] as? Int { steps = s }
        if let hr = reply["heartRate"] as? Int { heartRate = hr }
        if let cal = reply["calories"] as? Int { calories = cal }
        if let dist = reply["distanceKm"] as? Double { distanceKm = dist }
    }

    // MARK: — HealthKit

    private func requestHealthPermissions() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let types: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .distanceWalkingRunning)!,
        ]
        healthStore.requestAuthorization(toShare: [], read: types) { _, _ in
            self.fetchTodayHealthData()
        }
    }

    func fetchTodayHealthData() {
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())

        querySum(.stepCount, unit: .count(), start: startOfDay) { [weak self] value in
            DispatchQueue.main.async { self?.steps = Int(value) }
        }
        querySum(.activeEnergyBurned, unit: .kilocalorie(), start: startOfDay) { [weak self] value in
            DispatchQueue.main.async { self?.calories = Int(value) }
        }
        querySum(.distanceWalkingRunning, unit: .meterUnit(with: .kilo), start: startOfDay) { [weak self] value in
            DispatchQueue.main.async { self?.distanceKm = value }
        }
        queryLatest(.heartRate, unit: HKUnit.count().unitDivided(by: .minute())) { [weak self] value in
            DispatchQueue.main.async { self?.heartRate = Int(value) }
        }
    }

    private func querySum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, start: Date, completion: @escaping (Double) -> Void) {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date())
        let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, stats, _ in
            completion(stats?.sumQuantity()?.doubleValue(for: unit) ?? 0)
        }
        healthStore.execute(query)
    }

    private func queryLatest(_ id: HKQuantityTypeIdentifier, unit: HKUnit, completion: @escaping (Double) -> Void) {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            let value = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit) ?? 0
            completion(value)
        }
        healthStore.execute(query)
    }
}

// MARK: — WCSessionDelegate

extension WatchSessionManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            requestSync()
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { [weak self] in
            if let workoutData = message["workout"] as? [String: Any],
               let data = try? JSONSerialization.data(withJSONObject: workoutData),
               let workout = try? JSONDecoder().decode(WatchWorkout.self, from: data) {
                self?.todayWorkout = workout
            }
            if let cleared = message["clearWorkout"] as? Bool, cleared {
                self?.todayWorkout = nil
            }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        self.session(session, didReceiveMessage: applicationContext)
    }
}
