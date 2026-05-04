import SwiftUI
import HealthKit

struct StatsView: View {
    @State private var steps = 0
    @State private var heartRate = 0
    @State private var calories = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "chart.bar.fill").foregroundColor(.green)
                    Text("Today").font(.headline)
                    Spacer()
                }
                statRow(icon: "figure.walk", color: .green, label: "Steps", value: steps > 0 ? "\(steps)" : "—")
                statRow(icon: "heart.fill", color: .red, label: "Heart Rate", value: heartRate > 0 ? "\(heartRate) bpm" : "—")
                statRow(icon: "flame.fill", color: .orange, label: "Calories", value: calories > 0 ? "\(calories) kcal" : "—")
                Button(action: fetchStats) {
                    Label("Sync", systemImage: "arrow.clockwise").font(.caption)
                }
                .buttonStyle(.bordered)
                .padding(.top, 4)
            }
            .padding()
        }
        .onAppear { fetchStats() }
    }

    private func statRow(icon: String, color: Color, label: String, value: String) -> some View {
        HStack {
            Image(systemName: icon).foregroundColor(color).frame(width: 20)
            Text(label).font(.caption).foregroundColor(.secondary)
            Spacer()
            Text(value).font(.caption.bold())
        }
        .padding(.vertical, 2)
    }

    private func fetchStats() {
        let store = HKHealthStore()
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        func query(_ id: HKQuantityTypeIdentifier, unit: HKUnit, completion: @escaping (Int) -> Void) {
            guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
            let pred = HKQuery.predicateForSamples(withStart: start, end: Date())
            let q = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: pred, options: .cumulativeSum) { _, s, _ in
                DispatchQueue.main.async { completion(Int(s?.sumQuantity()?.doubleValue(for: unit) ?? 0)) }
            }
            store.execute(q)
        }
        query(.stepCount, unit: .count()) { steps = $0 }
        query(.activeEnergyBurned, unit: .kilocalorie()) { calories = $0 }

        guard let hrType = HKQuantityType.quantityType(forIdentifier: .heartRate) else { return }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let hrQ = HKSampleQuery(sampleType: hrType, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            let v = (samples?.first as? HKQuantitySample)?.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())) ?? 0
            DispatchQueue.main.async { heartRate = Int(v) }
        }
        store.execute(hrQ)
    }
}
