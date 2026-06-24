import Foundation
import HealthKit
import CoreLocation
import WatchConnectivity

final class WorkoutManager: NSObject {
    static let shared = WorkoutManager()

    private(set) var isRunning = false
    private(set) var elapsedSeconds = 0
    private(set) var currentHeartRate = 0
    private(set) var activeCalories = 0
    private(set) var currentDistanceKm = 0.0

    var onStateChange: ((_ isRunning: Bool, _ workoutName: String?) -> Void)?
    var onHeartRateUpdate: ((Int) -> Void)?
    var onCaloriesUpdate: ((Int) -> Void)?
    var onDistanceUpdate: ((Double) -> Void)?  // kilometres, GPS-derived via HKLiveWorkoutBuilder

    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var routeBuilder: HKWorkoutRouteBuilder?
    private var locationManager: CLLocationManager?
    private var timer: Timer?
    private var activeWorkout: WatchWorkout?
    private var isOutdoor = false

    private override init() { super.init() }

    // MARK: - Public API

    /// Request read access for live workout metrics + write access for finished workouts.
    /// Must be called once at app launch so HKStatisticsQuery / HKLiveWorkoutBuilder
    /// actually return data instead of silently delivering zeros.
    func requestInitialAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }

        var readTypes: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKObjectType.activitySummaryType(),
        ]
        let readQuantityIds: [HKQuantityTypeIdentifier] = [
            .heartRate,
            .activeEnergyBurned,
            .distanceWalkingRunning,
            .distanceCycling,
            .stepCount,
        ]
        for id in readQuantityIds {
            if let t = HKQuantityType.quantityType(forIdentifier: id) {
                readTypes.insert(t)
            }
        }

        let shareTypes: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
        ]

        healthStore.requestAuthorization(toShare: shareTypes, read: readTypes) { _, _ in }
    }

    /// Receive iPhone-initiated workout sessions and route the Watch UI.
    /// This is the belt-and-braces backup to WKApplicationDelegate.handle — that
    /// API only fires on a cold launch, whereas this handler fires whenever the
    /// app is running too, so we catch the case where the user already has the
    /// HIIT Watch app open and the iPhone starts a session.
    @available(watchOS 10.0, *)
    func enableWorkoutMirroring() {
        healthStore.workoutSessionMirroringStartHandler = { mirroredSession in
            let activityType = mirroredSession.workoutConfiguration.activityType
            NSLog("[HIIT.WorkoutMirror] iPhone started session type=\(activityType.rawValue)")
            DispatchQueue.main.async {
                let isTriathlon: Bool
                if #available(watchOS 9.0, *) {
                    isTriathlon = activityType == .swimBikeRun
                } else {
                    isTriathlon = false
                }
                if isTriathlon || WatchSessionManager.shared.triathlonPlan != nil {
                    WorkoutCoordinator.shared.navigateToRaceTab()
                }
            }
        }
    }

    func start(_ workout: WatchWorkout) {
        start(workout, outdoor: false)
    }

    func start(_ workout: WatchWorkout, outdoor: Bool) {
        guard !isRunning, HKHealthStore.isHealthDataAvailable() else { return }

        let activityType: HKWorkoutActivityType = outdoor
            ? hkActivityType(for: workout.activityKind)
            : .highIntensityIntervalTraining

        let config = HKWorkoutConfiguration()
        config.activityType = activityType
        config.locationType = outdoor ? .outdoor : .indoor

        if outdoor {
            requestRouteAuthorization { [weak self] in
                self?.beginSession(workout, config: config, outdoor: true)
            }
        } else {
            beginSession(workout, config: config, outdoor: false)
        }
    }

    func end() {
        guard isRunning, let session = workoutSession, let b = builder else { return }
        stopTimer()
        let cal = activeCalories
        let hr = currentHeartRate
        let elapsed = elapsedSeconds
        let w = activeWorkout
        let rb = routeBuilder
        let wasOutdoor = isOutdoor

        if wasOutdoor {
            locationManager?.stopUpdatingLocation()
            locationManager?.delegate = nil
            locationManager = nil
        }

        session.end()
        b.endCollection(withEnd: Date()) { [weak self] _, _ in
            b.finishWorkout { [weak self] hkWorkout, _ in
                let finalize: () -> Void = {
                    DispatchQueue.main.async {
                        self?.isRunning = false
                        self?.elapsedSeconds = 0
                        self?.currentHeartRate = 0
                        self?.activeCalories = 0
                        self?.currentDistanceKm = 0
                        self?.activeWorkout = nil
                        self?.routeBuilder = nil
                        self?.isOutdoor = false
                        self?.onStateChange?(false, nil)
                        if let workout = w {
                            self?.notifyPhoneCompleted(workout, calories: cal, hr: hr, duration: elapsed)
                        }
                    }
                }
                if wasOutdoor, let rb = rb, let hkWorkout = hkWorkout {
                    rb.finishRoute(with: hkWorkout, metadata: nil) { _, _ in finalize() }
                } else {
                    finalize()
                }
            }
        }
    }

    // MARK: - Private

    private func beginSession(_ workout: WatchWorkout, config: HKWorkoutConfiguration, outdoor: Bool) {
        do {
            let session = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            let b = session.associatedWorkoutBuilder()
            session.delegate = self
            b.delegate = self
            b.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            workoutSession = session
            builder = b
            activeWorkout = workout
            isOutdoor = outdoor

            if outdoor {
                routeBuilder = HKWorkoutRouteBuilder(healthStore: healthStore, device: nil)
                let lm = CLLocationManager()
                lm.delegate = self
                lm.desiredAccuracy = kCLLocationAccuracyBest
                lm.distanceFilter = kCLDistanceFilterNone
                lm.activityType = .fitness
                locationManager = lm
                switch lm.authorizationStatus {
                case .authorizedWhenInUse, .authorizedAlways:
                    lm.startUpdatingLocation()
                case .notDetermined:
                    lm.requestWhenInUseAuthorization()
                    // startUpdatingLocation kicks off from locationManagerDidChangeAuthorization
                default:
                    break
                }
            }

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

    private func requestRouteAuthorization(completion: @escaping () -> Void) {
        let typesToShare: Set<HKSampleType> = [
            HKSeriesType.workoutRoute(),
            HKObjectType.workoutType(),
        ]
        healthStore.requestAuthorization(toShare: typesToShare, read: nil) { _, _ in
            DispatchQueue.main.async { completion() }
        }
    }

    private func hkActivityType(for kind: String?) -> HKWorkoutActivityType {
        switch kind?.lowercased() {
        case "run", "running":   return .running
        case "walk", "walking":  return .walking
        case "ride", "cycling":  return .cycling
        default:                 return .other
        }
    }

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
                case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue,
                     HKQuantityTypeIdentifier.distanceCycling.rawValue:
                    let km = stats?.sumQuantity()?.doubleValue(for: HKUnit.meterUnit(with: .kilo)) ?? 0
                    self.currentDistanceKm = km
                    self.onDistanceUpdate?(km)
                default: break
                }
            }
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension WorkoutManager: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager,
                                     didUpdateLocations locations: [CLLocation]) {
        let filtered = locations.filter { $0.horizontalAccuracy > 0 && $0.horizontalAccuracy <= 20 }
        guard !filtered.isEmpty else { return }
        DispatchQueue.main.async { [weak self] in
            guard let rb = self?.routeBuilder else { return }
            rb.insertRouteData(filtered) { _, _ in }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager,
                                     didFailWithError error: Error) {
        print("WorkoutManager: location error — \(error.localizedDescription)")
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.isRunning, self.isOutdoor else { return }
            manager.startUpdatingLocation()
        }
    }
}
