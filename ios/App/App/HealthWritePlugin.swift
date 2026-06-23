import Capacitor
import CoreLocation
import Foundation
import HealthKit

@objc(HealthWritePlugin)
public class HealthWritePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthWritePlugin"
    public let jsName = "HealthWrite"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkoutWithRoute", returnType: CAPPluginReturnPromise),
    ]

    private let healthStore = HKHealthStore()

    // MARK: - requestAuth

    @objc func requestAuth(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["ok": false, "reason": "unavailable"])
            return
        }

        let workoutType = HKObjectType.workoutType()
        let routeType = HKSeriesType.workoutRoute()

        // If the user has explicitly denied workout sharing previously, iOS won't show the
        // prompt again — return denied without re-requesting.
        if healthStore.authorizationStatus(for: workoutType) == .sharingDenied {
            call.resolve(["ok": false, "reason": "denied"])
            return
        }

        var shareTypes: Set<HKSampleType> = [workoutType, routeType]
        if let distRun = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) {
            shareTypes.insert(distRun)
        }
        if let distCycle = HKQuantityType.quantityType(forIdentifier: .distanceCycling) {
            shareTypes.insert(distCycle)
        }
        if let energy = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
            shareTypes.insert(energy)
        }

        healthStore.requestAuthorization(toShare: shareTypes, read: []) { [weak self] success, error in
            guard let self = self else { return }
            if let error = error {
                NSLog("[HealthWritePlugin] auth error: %@", error.localizedDescription)
                call.resolve(["ok": false, "reason": "error"])
                return
            }

            let workoutStatus = self.healthStore.authorizationStatus(for: workoutType)
            let routeStatus = self.healthStore.authorizationStatus(for: routeType)

            if workoutStatus == .sharingAuthorized && routeStatus == .sharingAuthorized {
                call.resolve(["ok": true])
            } else if workoutStatus == .sharingDenied || routeStatus == .sharingDenied {
                call.resolve(["ok": false, "reason": "denied"])
            } else if success {
                // Some installs report .notDetermined immediately after a fresh prompt — treat as ok
                call.resolve(["ok": true])
            } else {
                call.resolve(["ok": false, "reason": "denied"])
            }
        }
    }

    // MARK: - saveWorkoutWithRoute

    @objc func saveWorkoutWithRoute(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["ok": false, "reason": "unavailable"])
            return
        }

        let activityTypeRaw = (call.getString("activityType") ?? "other").lowercased()
        let startedAtMs = call.getDouble("startedAt") ?? 0
        let endedAtMs = call.getDouble("endedAt") ?? 0
        let distanceMeters = call.getDouble("distanceMeters") ?? 0
        let calories = call.getDouble("calories")
        let positions = call.getArray("positions") ?? []
        let metadataIn = call.getObject("metadata") ?? [:]

        guard startedAtMs > 0, endedAtMs > startedAtMs else {
            call.resolve(["ok": false, "reason": "invalid_dates"])
            return
        }

        // Permission gate — don't trigger HK to crash silently
        let workoutType = HKObjectType.workoutType()
        if healthStore.authorizationStatus(for: workoutType) == .sharingDenied {
            call.resolve(["ok": false, "reason": "permission_denied"])
            return
        }

        let startDate = Date(timeIntervalSince1970: startedAtMs / 1000.0)
        let endDate = Date(timeIntervalSince1970: endedAtMs / 1000.0)

        let (hkType, isOutdoor) = Self.mapActivityType(activityTypeRaw)

        let config = HKWorkoutConfiguration()
        config.activityType = hkType
        config.locationType = isOutdoor ? .outdoor : .unknown

        // Build metadata dict. Custom keys are allowed by HealthKit.
        var workoutMetadata: [String: Any] = [:]
        for (k, v) in metadataIn {
            workoutMetadata[k] = v
        }
        workoutMetadata["HITT_SOURCE"] = "phone"
        if isOutdoor {
            workoutMetadata[HKMetadataKeyIndoorWorkout] = false
        }

        let builder = HKWorkoutBuilder(
            healthStore: healthStore,
            configuration: config,
            device: HKDevice.local()
        )

        builder.beginCollection(withStart: startDate) { [weak self] success, error in
            guard let self = self else { return }
            if let error = error {
                NSLog("[HealthWritePlugin] beginCollection error: %@", error.localizedDescription)
                call.resolve(["ok": false, "reason": "begin_failed"])
                return
            }
            if !success {
                call.resolve(["ok": false, "reason": "begin_failed"])
                return
            }

            // Distance sample
            var samplesToAdd: [HKSample] = []
            if distanceMeters > 0 {
                let distQuantityType: HKQuantityType? = {
                    switch hkType {
                    case .cycling:
                        return HKQuantityType.quantityType(forIdentifier: .distanceCycling)
                    case .running, .walking, .hiking:
                        return HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)
                    default:
                        return HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)
                    }
                }()

                if let distType = distQuantityType {
                    let qty = HKQuantity(unit: .meter(), doubleValue: distanceMeters)
                    let sample = HKQuantitySample(
                        type: distType, quantity: qty, start: startDate, end: endDate
                    )
                    samplesToAdd.append(sample)
                }
            }

            // Calories sample
            if let calVal = calories, calVal > 0,
               let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
                let qty = HKQuantity(unit: .kilocalorie(), doubleValue: calVal)
                let sample = HKQuantitySample(
                    type: energyType, quantity: qty, start: startDate, end: endDate
                )
                samplesToAdd.append(sample)
            }

            let addSamplesThenFinish: () -> Void = {
                let finalize: () -> Void = {
                    if !workoutMetadata.isEmpty {
                        builder.addMetadata(workoutMetadata) { _, _ in
                            self.endAndFinish(
                                builder: builder,
                                endDate: endDate,
                                positions: positions,
                                call: call
                            )
                        }
                    } else {
                        self.endAndFinish(
                            builder: builder,
                            endDate: endDate,
                            positions: positions,
                            call: call
                        )
                    }
                }

                if samplesToAdd.isEmpty {
                    finalize()
                } else {
                    builder.add(samplesToAdd) { _, error in
                        if let error = error {
                            NSLog("[HealthWritePlugin] add samples error: %@", error.localizedDescription)
                        }
                        finalize()
                    }
                }
            }

            addSamplesThenFinish()
        }
    }

    private func endAndFinish(
        builder: HKWorkoutBuilder,
        endDate: Date,
        positions: [Any],
        call: CAPPluginCall
    ) {
        builder.endCollection(withEnd: endDate) { [weak self] _, endError in
            guard let self = self else { return }
            if let endError = endError {
                NSLog("[HealthWritePlugin] endCollection error: %@", endError.localizedDescription)
                call.resolve(["ok": false, "reason": "end_failed"])
                return
            }

            builder.finishWorkout { workout, finishError in
                if let finishError = finishError {
                    NSLog("[HealthWritePlugin] finishWorkout error: %@", finishError.localizedDescription)
                    call.resolve(["ok": false, "reason": "finish_failed"])
                    return
                }
                guard let workout = workout else {
                    call.resolve(["ok": false, "reason": "no_workout"])
                    return
                }

                // Attach route if we have enough positions
                let locations = Self.parseLocations(positions)
                if locations.count >= 2 {
                    let routeBuilder = HKWorkoutRouteBuilder(healthStore: self.healthStore, device: HKDevice.local())
                    routeBuilder.insertRouteData(locations) { inserted, insertError in
                        if let insertError = insertError {
                            NSLog("[HealthWritePlugin] insertRouteData error: %@", insertError.localizedDescription)
                        }
                        if !inserted {
                            // Still resolve ok — workout itself was saved
                            call.resolve(["ok": true, "uuid": workout.uuid.uuidString])
                            return
                        }
                        routeBuilder.finishRoute(with: workout, metadata: nil) { _, finishRouteError in
                            if let finishRouteError = finishRouteError {
                                NSLog("[HealthWritePlugin] finishRoute error: %@", finishRouteError.localizedDescription)
                            }
                            call.resolve(["ok": true, "uuid": workout.uuid.uuidString])
                        }
                    }
                } else {
                    call.resolve(["ok": true, "uuid": workout.uuid.uuidString])
                }
            }
        }
    }

    // MARK: - Helpers

    private static func mapActivityType(_ raw: String) -> (HKWorkoutActivityType, Bool) {
        switch raw {
        case "running", "jogging", "run":
            return (.running, true)
        case "walking", "walk":
            return (.walking, true)
        case "cycling", "ride", "cycle":
            return (.cycling, true)
        case "hike", "hiking":
            return (.hiking, true)
        default:
            return (.other, false)
        }
    }

    private static func parseLocations(_ positions: [Any]) -> [CLLocation] {
        var out: [CLLocation] = []
        for raw in positions {
            guard let p = raw as? [String: Any] else { continue }
            let latAny = p["lat"]
            let lngAny = p["lng"]
            guard let lat = (latAny as? Double) ?? (latAny as? NSNumber)?.doubleValue,
                  let lng = (lngAny as? Double) ?? (lngAny as? NSNumber)?.doubleValue else {
                continue
            }
            let tsAny = p["ts"]
            let tsMs = (tsAny as? Double) ?? (tsAny as? NSNumber)?.doubleValue ?? Date().timeIntervalSince1970 * 1000
            let altAny = p["alt"]
            let altitude = (altAny as? Double) ?? (altAny as? NSNumber)?.doubleValue ?? 0
            let accAny = p["accuracy"]
            let accuracyValue = (accAny as? Double) ?? (accAny as? NSNumber)?.doubleValue ?? 10
            // Upstream Kalman filter already gates 60m initial / 30m active; this catches only
            // catastrophically bad fixes if JS ever forwards real accuracy through.
            if accuracyValue <= 0 || accuracyValue > 200 { continue }

            let coord = CLLocationCoordinate2D(latitude: lat, longitude: lng)
            let date = Date(timeIntervalSince1970: tsMs / 1000.0)
            let loc = CLLocation(
                coordinate: coord,
                altitude: altitude,
                horizontalAccuracy: accuracyValue,
                verticalAccuracy: accuracyValue,
                timestamp: date
            )
            out.append(loc)
        }
        return out
    }
}
