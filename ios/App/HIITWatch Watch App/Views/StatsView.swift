import SwiftUI
import HealthKit

private let hiitOrange = Color(red: 1,    green: 0.541, blue: 0.149)
private let hiitRed    = Color(red: 1,    green: 0.271, blue: 0.227)
private let hiitGold   = Color(red: 1,    green: 0.690, blue: 0.125)
private let hiitGreen  = Color(red: 0.357, green: 0.890, blue: 0.627)
private let dimText    = Color(white: 0.541)

struct StatsView: View {
    @State private var steps = 0
    @State private var heartRate = 0
    @State private var calories = 0
    @State private var distanceKm = 0.0
    @State private var syncing = false

    private let store = HKHealthStore()

    // Steps target for ring progress
    private let stepsGoal = 10_000
    private var stepsProgress: Double { min(1.0, Double(steps) / Double(stepsGoal)) }

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {

                TopLabel("TODAY")

                // Hero ring — steps
                ZStack {
                    Circle()
                        .stroke(hiitGreen.opacity(0.15), lineWidth: 6)
                        .frame(width: 72, height: 72)
                    Circle()
                        .trim(from: 0, to: stepsProgress)
                        .stroke(hiitGreen, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                        .frame(width: 72, height: 72)
                        .rotationEffect(.degrees(-90))
                        .shadow(color: hiitGreen.opacity(0.5), radius: 4)
                    Image(systemName: "figure.walk")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(hiitGreen)
                }

                VStack(spacing: 2) {
                    Text(formatted(steps))
                        .font(.system(size: 20, weight: .black, design: .monospaced))
                        .foregroundColor(.white)
                    Text("STEPS · \(Int(stepsProgress * 100))%")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(1)
                        .foregroundColor(dimText)
                }

                // 3-column stats row
                HStack(spacing: 6) {
                    StatBox(value: heartRate > 0 ? "\(heartRate)" : "—",
                            unit: "BPM", color: hiitRed, icon: "heart.fill")
                    StatBox(value: calories > 0 ? "\(calories)" : "—",
                            unit: "CAL", color: hiitOrange, icon: "flame.fill")
                    StatBox(value: distanceKm > 0.01 ? String(format: "%.1f", distanceKm) : "—",
                            unit: "KM", color: hiitGold, icon: "arrow.left.right")
                }
                .padding(.horizontal, 8)

                // Sync button
                Button(action: syncStats) {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 10))
                            .rotationEffect(syncing ? .degrees(360) : .degrees(0))
                            .animation(syncing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: syncing)
                        Text(syncing ? "Syncing…" : "Refresh")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundColor(syncing ? dimText : hiitOrange)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(hiitOrange.opacity(0.1))
                    .cornerRadius(20)
                }
                .buttonStyle(.plain)
                .disabled(syncing)
                .padding(.horizontal, 8)
            }
            .padding(.vertical, 4)
        }
        .onAppear { syncStats() }
    }

    // MARK: - Data

    private func syncStats() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        syncing = true
        let start = Calendar.current.startOfDay(for: Date())
        let group = DispatchGroup()
        group.enter()
        querySum(.stepCount, unit: .count(), start: start) { steps = Int($0); group.leave() }
        group.enter()
        querySum(.activeEnergyBurned, unit: .kilocalorie(), start: start) { calories = Int($0); group.leave() }
        group.enter()
        querySum(.distanceWalkingRunning, unit: HKUnit.meterUnit(with: .kilo), start: start) { distanceKm = $0; group.leave() }
        group.enter()
        queryLatest(.heartRate, unit: HKUnit.count().unitDivided(by: .minute())) { heartRate = Int($0); group.leave() }
        group.notify(queue: .main) { syncing = false }
    }

    private func querySum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, start: Date,
                          completion: @escaping (Double) -> Void) {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { completion(0); return }
        let pred = HKQuery.predicateForSamples(withStart: start, end: Date())
        store.execute(HKStatisticsQuery(quantityType: type, quantitySamplePredicate: pred,
                                        options: .cumulativeSum) { _, s, _ in
            DispatchQueue.main.async { completion(s?.sumQuantity()?.doubleValue(for: unit) ?? 0) }
        })
    }

    private func queryLatest(_ id: HKQuantityTypeIdentifier, unit: HKUnit,
                             completion: @escaping (Double) -> Void) {
        guard let type = HKQuantityType.quantityType(forIdentifier: id) else { completion(0); return }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        store.execute(HKSampleQuery(sampleType: type, predicate: nil, limit: 1,
                                    sortDescriptors: [sort]) { _, samples, _ in
            let v = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: unit) ?? 0
            DispatchQueue.main.async { completion(v) }
        })
    }

    private func formatted(_ n: Int) -> String {
        let fmt = NumberFormatter(); fmt.numberStyle = .decimal
        return fmt.string(from: NSNumber(value: n)) ?? "\(n)"
    }
}

private struct StatBox: View {
    let value: String; let unit: String; let color: Color; let icon: String
    var body: some View {
        VStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 12)).foregroundColor(color)
            Text(value).font(.system(size: 14, weight: .bold, design: .monospaced)).foregroundColor(.white)
            Text(unit).font(.system(size: 7, weight: .semibold)).foregroundColor(dimText)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 8)
        .background(Color.white.opacity(0.06)).cornerRadius(10)
    }
}
