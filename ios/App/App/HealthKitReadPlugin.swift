import Capacitor
import Foundation
import HealthKit

// Reads activity + health data from HealthKit and returns it to JS for
// upsert into Supabase. The iPhone is a passive aggregator — when Garmin
// Connect, Fitbit, Whoop, Oura, etc. write to HealthKit, we mirror those
// rows into our DB so Jarvis can reason about them.
//
// Foreground-sync only in v1: JS calls `queryX(sinceISO)` on app open and
// after every visibility change. Anchored queries + HKObserverQuery come
// later (entitlement + background mode required).
@objc(HealthKitReadPlugin)
public class HealthKitReadPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthKitReadPlugin"
    public let jsName = "HealthKitRead"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "queryWorkouts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryHeartRateAverages", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryDailySteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "querySleep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBackgroundWorkoutSync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBackgroundWorkoutSync", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    // MARK: - queryWorkouts

    @objc func queryWorkouts(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["workouts": []])
            return
        }

        let since = Self.parseISODate(call.getString("sinceISO")) ?? Calendar.current.date(byAdding: .day, value: -30, to: Date())!
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: [])
        let sortByDate = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)

        let query = HKSampleQuery(
            sampleType: HKObjectType.workoutType(),
            predicate: predicate,
            limit: 200,
            sortDescriptors: [sortByDate]
        ) { _, samples, error in
            if let error = error {
                NSLog("[HealthKitReadPlugin] queryWorkouts error: %@", error.localizedDescription)
                call.resolve(["workouts": []])
                return
            }
            let workouts = (samples as? [HKWorkout] ?? [])
            // Attach avg HR to each workout in parallel — one HKStatisticsQuery
            // per workout, gated by DispatchGroup so we resolve the call only
            // when they've all completed. HR samples within the workout's
            // time window are averaged; if a workout has no HR data attached
            // (indoor cycle on a phone-only rig, etc.) the field is omitted.
            let group = DispatchGroup()
            var results = Array<[String: Any]>(repeating: [:], count: workouts.count)
            for (i, w) in workouts.enumerated() {
                group.enter()
                Self.averageHeartRate(for: w, healthStore: self.healthStore) { avg in
                    var dict = Self.serialiseWorkout(w)
                    if let avg = avg { dict["averageHeartRate"] = Int(avg.rounded()) }
                    results[i] = dict
                    group.leave()
                }
            }
            group.notify(queue: .main) {
                call.resolve(["workouts": results])
            }
        }
        healthStore.execute(query)
    }

    /// Compute the average heart rate over a workout's date range from the
    /// user's HKQuantityTypeIdentifier.heartRate samples. Returns nil when
    /// no HR data covers the window (typical for phone-only workouts).
    private static func averageHeartRate(
        for workout: HKWorkout,
        healthStore: HKHealthStore,
        completion: @escaping (Double?) -> Void
    ) {
        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
            completion(nil); return
        }
        let predicate = HKQuery.predicateForSamples(
            withStart: workout.startDate,
            end: workout.endDate,
            options: [.strictStartDate, .strictEndDate]
        )
        let stats = HKStatisticsQuery(
            quantityType: hrType,
            quantitySamplePredicate: predicate,
            options: [.discreteAverage]
        ) { _, result, _ in
            let bpm = result?.averageQuantity()?.doubleValue(for: HKUnit(from: "count/min"))
            completion(bpm)
        }
        healthStore.execute(stats)
    }

    // MARK: - queryHeartRateAverages
    // Returns one entry per calendar day in the window: { date (YYYY-MM-DD), avgBpm, restingBpm? }.
    // Resting HR is sampled by Apple Watch as a separate type (.restingHeartRate).
    @objc func queryHeartRateAverages(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else {
            call.resolve(["days": []])
            return
        }

        let since = Self.parseISODate(call.getString("sinceISO")) ?? Calendar.current.date(byAdding: .day, value: -30, to: Date())!
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: [])

        let interval = DateComponents(day: 1)
        let anchor = Calendar.current.startOfDay(for: since)
        let query = HKStatisticsCollectionQuery(
            quantityType: hrType,
            quantitySamplePredicate: predicate,
            options: [.discreteAverage],
            anchorDate: anchor,
            intervalComponents: interval
        )

        query.initialResultsHandler = { _, collection, error in
            if let error = error {
                NSLog("[HealthKitReadPlugin] HR averages error: %@", error.localizedDescription)
                call.resolve(["days": []])
                return
            }
            guard let collection = collection else {
                call.resolve(["days": []])
                return
            }
            var days: [[String: Any]] = []
            collection.enumerateStatistics(from: since, to: Date()) { stats, _ in
                if let avg = stats.averageQuantity()?.doubleValue(for: HKUnit(from: "count/min")) {
                    days.append([
                        "date": Self.iso8601Day(stats.startDate),
                        "avgBpm": Int(avg.rounded()),
                    ])
                }
            }
            call.resolve(["days": days])
        }
        healthStore.execute(query)
    }

    // MARK: - queryDailySteps
    @objc func queryDailySteps(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.resolve(["days": []])
            return
        }

        let since = Self.parseISODate(call.getString("sinceISO")) ?? Calendar.current.date(byAdding: .day, value: -30, to: Date())!
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: [])
        let anchor = Calendar.current.startOfDay(for: since)

        let query = HKStatisticsCollectionQuery(
            quantityType: stepType,
            quantitySamplePredicate: predicate,
            options: [.cumulativeSum],
            anchorDate: anchor,
            intervalComponents: DateComponents(day: 1)
        )

        query.initialResultsHandler = { _, collection, error in
            if let error = error {
                NSLog("[HealthKitReadPlugin] steps error: %@", error.localizedDescription)
                call.resolve(["days": []])
                return
            }
            guard let collection = collection else {
                call.resolve(["days": []])
                return
            }
            var days: [[String: Any]] = []
            collection.enumerateStatistics(from: since, to: Date()) { stats, _ in
                if let total = stats.sumQuantity()?.doubleValue(for: .count()) {
                    days.append([
                        "date": Self.iso8601Day(stats.startDate),
                        "steps": Int(total.rounded()),
                    ])
                }
            }
            call.resolve(["days": days])
        }
        healthStore.execute(query)
    }

    // MARK: - querySleep
    // Returns one entry per night: { date (YYYY-MM-DD), durationMinutes, sourceBundleId }.
    // Collapses contiguous .asleep* samples per source per night.
    @objc func querySleep(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable(),
              let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.resolve(["nights": []])
            return
        }

        let since = Self.parseISODate(call.getString("sinceISO")) ?? Calendar.current.date(byAdding: .day, value: -30, to: Date())!
        let predicate = HKQuery.predicateForSamples(withStart: since, end: nil, options: [])
        let sortByDate = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)

        let query = HKSampleQuery(
            sampleType: sleepType,
            predicate: predicate,
            limit: 1000,
            sortDescriptors: [sortByDate]
        ) { _, samples, error in
            if let error = error {
                NSLog("[HealthKitReadPlugin] sleep error: %@", error.localizedDescription)
                call.resolve(["nights": []])
                return
            }
            guard let categorySamples = samples as? [HKCategorySample] else {
                call.resolve(["nights": []])
                return
            }

            // Sum asleep-state durations per (night-anchor-date, sourceBundleId),
            // tracking the bedtime (earliest start) and wake time (latest end)
            // per source for that night. Apple anchors a "sleep night" to the
            // morning, so we attribute samples ending after midnight to that
            // day's date.
            struct Agg { var durMin: Double = 0; var first: Date?; var last: Date? }
            var byNight: [String: [String: Agg]] = [:]
            let cal = Calendar.current
            let iso = ISO8601DateFormatter()

            for s in categorySamples {
                if !Self.isAsleepState(s.value) { continue }
                let nightDate = cal.startOfDay(for: s.endDate)
                let dateKey = Self.iso8601Day(nightDate)
                let bundleId = s.sourceRevision.source.bundleIdentifier
                var agg = byNight[dateKey]?[bundleId] ?? Agg()
                agg.durMin += s.endDate.timeIntervalSince(s.startDate) / 60.0
                if agg.first == nil || s.startDate < agg.first! { agg.first = s.startDate }
                if agg.last == nil  || s.endDate   > agg.last!  { agg.last  = s.endDate }
                byNight[dateKey, default: [:]][bundleId] = agg
            }

            var nights: [[String: Any]] = []
            for (date, bySource) in byNight {
                // Pick the source with the longest asleep duration that night —
                // avoids double-counting when two trackers both report.
                if let (bundleId, agg) = bySource.max(by: { $0.value.durMin < $1.value.durMin }),
                   let bedtime = agg.first, let wake = agg.last {
                    nights.append([
                        "date": date,
                        "durationMinutes": Int(agg.durMin.rounded()),
                        "bedtime": iso.string(from: bedtime),
                        "wakeTime": iso.string(from: wake),
                        "sourceBundleId": bundleId,
                    ])
                }
            }
            // Sort newest first for nicer console output
            nights.sort { ($0["date"] as? String ?? "") > ($1["date"] as? String ?? "") }
            call.resolve(["nights": nights])
        }
        healthStore.execute(query)
    }

    // MARK: - Serialisation

    private static func serialiseWorkout(_ w: HKWorkout) -> [String: Any] {
        let device = w.device
        let metadata = w.metadata ?? [:]
        let externalUUID = metadata[HKMetadataKeyExternalUUID] as? String
        let isIndoor = metadata[HKMetadataKeyIndoorWorkout] as? Bool ?? false

        var dict: [String: Any] = [
            "uuid": w.uuid.uuidString,
            "sourceBundleId": w.sourceRevision.source.bundleIdentifier,
            "sourceName": w.sourceRevision.source.name,
            "startedAt": ISO8601DateFormatter().string(from: w.startDate),
            "endedAt": ISO8601DateFormatter().string(from: w.endDate),
            "durationSeconds": Int(w.duration.rounded()),
            "activityType": Self.activityTypeString(w.workoutActivityType),
            "isIndoor": isIndoor,
        ]
        if let energy = w.totalEnergyBurned?.doubleValue(for: .kilocalorie()) {
            dict["calories"] = Int(energy.rounded())
        }
        if let distance = w.totalDistance?.doubleValue(for: .meter()) {
            dict["distanceKm"] = distance / 1000.0
        }
        if let externalUUID = externalUUID {
            dict["externalUUID"] = externalUUID
        }
        if let deviceName = device?.name { dict["deviceName"] = deviceName }
        if let manufacturer = device?.manufacturer { dict["deviceManufacturer"] = manufacturer }
        if let model = device?.model { dict["deviceModel"] = model }
        return dict
    }

    private static func activityTypeString(_ t: HKWorkoutActivityType) -> String {
        switch t {
        case .running: return "running"
        case .walking: return "walking"
        case .cycling: return "cycling"
        case .swimming: return "swimming"
        case .hiking: return "hiking"
        case .rowing: return "rowing"
        case .yoga: return "yoga"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "strength"
        case .highIntensityIntervalTraining: return "hiit"
        case .pilates: return "pilates"
        case .crossTraining: return "cross_training"
        case .elliptical: return "elliptical"
        case .stairs, .stairClimbing: return "stairs"
        case .dance: return "dance"
        case .mixedCardio: return "cardio"
        default: return "other"
        }
    }

    private static func isAsleepState(_ value: Int) -> Bool {
        // Apple introduced fine-grained sleep stages in iOS 16. Treat any of
        // the "actually asleep" values as asleep, ignore inBed.
        if let v = HKCategoryValueSleepAnalysis(rawValue: value) {
            switch v {
            case .asleepUnspecified, .asleepCore, .asleepDeep, .asleepREM, .asleep:
                return true
            default:
                return false
            }
        }
        return false
    }

    private static func parseISODate(_ s: String?) -> Date? {
        guard let s = s else { return nil }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: s) { return d }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: s)
    }

    private static func iso8601Day(_ d: Date) -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        fmt.timeZone = TimeZone(identifier: "UTC")
        return fmt.string(from: d)
    }

    // MARK: - Background HealthKit observer
    //
    // Purpose: iOS wakes our app for ~30s whenever a new HKWorkout sample
    // lands in HealthKit — Apple Watch finishing a workout, Garmin Connect
    // writing via HK, Fitbit / Whoop / Oura pushing to HK. We fetch the
    // new samples, POST them to sync-healthkit-background using a device
    // JWT, and iOS's push arrives on the lock screen before the user
    // reaches for their phone.
    //
    // Auth: the device JWT is minted server-side once (after sign-in) and
    // cached across launches in UserDefaults. Rotates every 90 days on
    // foreground re-mint (handled by JS).

    private static let deviceTokenKey  = "hiit.hk.deviceToken"
    private static let supabaseUrlKey  = "hiit.hk.supabaseUrl"
    private static let anchorDataKey   = "hiit.hk.workoutAnchor"

    /// JS-facing: JS passes in the freshly-minted device JWT + the
    /// Supabase URL, we stash them and start the observer. Idempotent —
    /// calling twice re-registers with the latest token.
    @objc func startBackgroundWorkoutSync(_ call: CAPPluginCall) {
        guard let token = call.getString("deviceToken"),
              let url = call.getString("supabaseUrl") else {
            call.reject("deviceToken and supabaseUrl required")
            return
        }
        UserDefaults.standard.set(token, forKey: Self.deviceTokenKey)
        UserDefaults.standard.set(url, forKey: Self.supabaseUrlKey)
        registerWorkoutObserver()
        call.resolve(["started": true])
    }

    /// Called on sign-out. Turns background delivery off and drops
    /// the cached token so a subsequent user's workouts can't leak.
    @objc func stopBackgroundWorkoutSync(_ call: CAPPluginCall) {
        healthStore.disableBackgroundDelivery(for: HKObjectType.workoutType()) { _, _ in }
        UserDefaults.standard.removeObject(forKey: Self.deviceTokenKey)
        UserDefaults.standard.removeObject(forKey: Self.supabaseUrlKey)
        UserDefaults.standard.removeObject(forKey: Self.anchorDataKey)
        call.resolve(["stopped": true])
    }

    private func registerWorkoutObserver() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        let workoutType = HKObjectType.workoutType()

        healthStore.enableBackgroundDelivery(for: workoutType, frequency: .immediate) { success, error in
            if let error = error {
                NSLog("[HealthKitReadPlugin] enableBackgroundDelivery error: %@", error.localizedDescription)
            } else {
                NSLog("[HealthKitReadPlugin] background delivery enabled: %@", success ? "yes" : "no")
            }
        }

        // HKObserverQuery notifies us whenever workout data changes — the
        // handler runs in the foreground OR when iOS has woken us in
        // background. Call the completionHandler as soon as our work is
        // dispatched so iOS doesn't penalise our next wake for delaying.
        let query = HKObserverQuery(sampleType: workoutType, predicate: nil) { [weak self] _, completionHandler, error in
            defer { completionHandler() }
            if let error = error {
                NSLog("[HealthKitReadPlugin] observer error: %@", error.localizedDescription)
                return
            }
            self?.fetchAndPushNewWorkouts()
        }
        healthStore.execute(query)
    }

    /// Anchored query — HealthKit returns only samples added since the
    /// last anchor, so we don't re-push the same workout every wake.
    private func fetchAndPushNewWorkouts() {
        guard let token = UserDefaults.standard.string(forKey: Self.deviceTokenKey),
              let urlString = UserDefaults.standard.string(forKey: Self.supabaseUrlKey) else {
            NSLog("[HealthKitReadPlugin] no device token or url — skipping background sync")
            return
        }

        let anchor: HKQueryAnchor? = {
            guard let data = UserDefaults.standard.data(forKey: Self.anchorDataKey) else { return nil }
            return try? NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data)
        }()

        let query = HKAnchoredObjectQuery(
            type: HKObjectType.workoutType(),
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, newAnchor, error in
            if let error = error {
                NSLog("[HealthKitReadPlugin] anchored query error: %@", error.localizedDescription)
                return
            }
            let workouts = (samples as? [HKWorkout]) ?? []
            if !workouts.isEmpty {
                self?.postWorkouts(workouts, urlString: urlString, token: token) {
                    if let newAnchor = newAnchor,
                       let data = try? NSKeyedArchiver.archivedData(withRootObject: newAnchor, requiringSecureCoding: true) {
                        UserDefaults.standard.set(data, forKey: Self.anchorDataKey)
                    }
                }
            } else if let newAnchor = newAnchor,
                      let data = try? NSKeyedArchiver.archivedData(withRootObject: newAnchor, requiringSecureCoding: true) {
                UserDefaults.standard.set(data, forKey: Self.anchorDataKey)
            }
        }
        healthStore.execute(query)
    }

    private func postWorkouts(_ workouts: [HKWorkout], urlString: String, token: String, done: @escaping () -> Void) {
        let group = DispatchGroup()
        var payloads: [[String: Any]] = []
        for w in workouts {
            group.enter()
            Self.averageHeartRate(for: w, healthStore: healthStore) { avg in
                var dict: [String: Any] = [
                    "workout_type": Self.activityTypeString(w.workoutActivityType),
                    "duration_seconds": Int(w.duration.rounded()),
                    "start_time": Self.isoTimestamp(w.startDate),
                    "end_time": Self.isoTimestamp(w.endDate),
                    "source_platform": Self.sourcePlatform(for: w),
                    "source_platform_id": w.uuid.uuidString,
                ]
                if let cals = w.totalEnergyBurned?.doubleValue(for: HKUnit.kilocalorie()) {
                    dict["calories"] = Int(cals.rounded())
                }
                if let dist = w.totalDistance?.doubleValue(for: HKUnit.meter()) {
                    dict["distance_m"] = Int(dist.rounded())
                }
                if let avg = avg { dict["hr_avg"] = Int(avg.rounded()) }
                payloads.append(dict)
                group.leave()
            }
        }

        group.notify(queue: .global()) {
            guard !payloads.isEmpty,
                  let url = URL(string: "\(urlString)/functions/v1/sync-healthkit-background") else {
                done(); return
            }
            var req = URLRequest(url: url)
            req.httpMethod = "POST"
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let body: [String: Any] = ["workouts": payloads]
            req.httpBody = try? JSONSerialization.data(withJSONObject: body)

            URLSession.shared.dataTask(with: req) { _, response, error in
                if let error = error {
                    NSLog("[HealthKitReadPlugin] background POST error: %@", error.localizedDescription)
                } else if let http = response as? HTTPURLResponse {
                    NSLog("[HealthKitReadPlugin] background POST → %d (%d workouts)", http.statusCode, payloads.count)
                }
                done()
            }.resume()
        }
    }

    private static func activityTypeString(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "running"
        case .cycling: return "cycling"
        case .walking: return "walking"
        case .swimming: return "swimming"
        case .yoga: return "yoga"
        case .hiking: return "hiking"
        case .traditionalStrengthTraining, .functionalStrengthTraining: return "strength"
        case .highIntensityIntervalTraining: return "hiit"
        case .rowing: return "rowing"
        case .other: return "other"
        default: return "other"
        }
    }

    /// Map the workout's source bundle-id to our canonical source_platform
    /// enum. Mirrors the mapping in sync-healthkit's server-side helper.
    private static func sourcePlatform(for workout: HKWorkout) -> String {
        let bundle = workout.sourceRevision.source.bundleIdentifier.lowercased()
        if bundle.contains("com.apple.health") { return "apple_health_native" }
        if bundle.hasPrefix("com.apple.") { return "apple_watch" }
        if bundle.contains("garmin") { return "garmin" }
        if bundle.contains("fitbit") { return "fitbit" }
        if bundle.contains("whoop") { return "whoop" }
        if bundle.contains("oura") { return "oura" }
        if bundle.contains("polar") { return "polar" }
        if bundle.contains("coros") { return "coros" }
        if bundle.contains("wahoo") { return "wahoo" }
        return "healthkit_other"
    }

    private static func isoTimestamp(_ d: Date) -> String {
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fmt.string(from: d)
    }
}
