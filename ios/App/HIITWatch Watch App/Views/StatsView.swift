import SwiftUI
import HealthKit

private let hiitOrange = Color(red: 0.976, green: 0.451, blue: 0.086)

struct StatsView: View {
    @State private var steps = 0
    @State private var heartRate = 0
    @State private var calories = 0
    @State private var distanceKm = 0.0
    @State private var syncing = false

    private let store = HKHealthStore()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {

                // Header
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(hiitOrange)
                        .frame(width: 4, height: 18)
                    Text("TODAY")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(hiitOrange)
                        .tracking(1.5)
                    Spacer()
                    if syncing {
                        ProgressView()
                            .scaleEffect(0.6)
                            .accentColor(hiitOrange)
                    }
                }

                // Stats card
                VStack(spacing: 0) {
                    statRow(icon: "figure.walk",     color: .green,   label: "Steps",
                            value: steps > 0      ? formatted(steps)                  : "—")
                    divider
                    statRow(icon: "heart.fill",       color: .red,     label: "Heart Rate",
                            value: heartRate > 0  ? "\(heartRate) bpm"                : "—")
                    divider
                    statRow(icon: "flame.fill",        color: hiitOrange, label: "Calories",
                            value: calories > 0   ? "\(calories) kcal"                : "—")
                    divider
                    statRow(icon: "arrow.left.right",  color: .blue,   label: "Distance",
                            value: distanceKm > 0 ? String(format: "%.2f km", distanceKm) : "—")
                }
                .background(Color.white.opacity(0.07))
                .cornerRadius(12)

                // Sync button
                Button(action: { syncStats() }) {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 11))
                            .rotationEffect(syncing ? .degrees(360) : .degrees(0))
                            .animation(syncing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: syncing)
                        Text("Sync Health Data")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(syncing ? .gray : hiitOrange)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(hiitOrange.opacity(0.1))
                    .cornerRadius(20)
                }
                .buttonStyle(.plain)
                .disabled(syncing)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
        .onAppear { syncStats() }
    }

    private var divider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.07))
            .frame(height: 1)
            .padding(.horizontal, 10)
    }

    private func statRow(icon: String, color: Color, label: String, value: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .foregroundColor(color)
                .font(.system(size: 14))
                .frame(width: 20)
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.gray)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
    }

    private func formatted(_ n: Int) -> String {
        let fmt = NumberFormatter()
        fmt.numberStyle = .decimal
        return fmt.string(from: NSNumber(value: n)) ?? "\(n)"
    }

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
}
