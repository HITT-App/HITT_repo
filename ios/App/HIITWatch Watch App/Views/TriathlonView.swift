import SwiftUI

private let hiitOrange = Color(red: 0.976, green: 0.451, blue: 0.086)
private let legIcons  = ["🌊", "🚴", "🏃"]
private let legLabels = ["SWIM", "BIKE", "RUN"]
private let legColors: [Color] = [.blue, .cyan, .green]

struct TriathlonView: View {
    @State private var plan: TriathlonPlan? = nil
    @State private var currentLeg: Int = 0
    @State private var legState: LegState = .idle
    @State private var elapsed: [Int]   = [0, 0, 0]
    @State private var distKm: [Double] = [0, 0, 0]
    @State private var heartRate: Int   = 0
    @State private var raceFinished     = false

    enum LegState { case idle, active, done }

    var body: some View {
        if raceFinished {
            finishedScreen
        } else if let p = plan {
            raceScreen(p)
        } else {
            noPlanScreen
        }
    }

    // MARK: - No plan

    private var noPlanScreen: some View {
        VStack(spacing: 10) {
            Text("🏅").font(.system(size: 32))
            Text("No Race Loaded")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            Text("Set up your race\nin the HIIT app")
                .font(.system(size: 11))
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
        .onAppear {
            if let p = WatchSessionManager.shared.triathlonPlan {
                loadPlan(p)
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .watchTriathlonReceived)) { note in
            if let p = note.object as? TriathlonPlan { loadPlan(p) }
        }
    }

    // MARK: - Race screen

    private func raceScreen(_ p: TriathlonPlan) -> some View {
        let leg = p.legs[currentLeg]
        let progress = leg.targetKm > 0 ? min(distKm[currentLeg] / leg.targetKm, 1.0) : 0

        return ScrollView {
            VStack(spacing: 10) {
                // Leg dots
                HStack(spacing: 8) {
                    ForEach(0..<p.legs.count, id: \.self) { i in
                        VStack(spacing: 2) {
                            Text(legIcons[i]).font(.system(size: 14))
                            Circle()
                                .fill(i < currentLeg  ? legColors[i] :
                                      i == currentLeg ? hiitOrange : Color.gray.opacity(0.3))
                                .frame(width: 6, height: 6)
                        }
                    }
                }
                .padding(.top, 4)

                Text("\(legLabels[currentLeg]) — LEG \(currentLeg + 1) OF \(p.legs.count)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(legState == .active ? hiitOrange : .gray)
                    .tracking(1.2)

                Text(fmtTime(elapsed[currentLeg]))
                    .font(.system(size: 38, weight: .black, design: .monospaced))
                    .foregroundColor(.white)

                HStack(spacing: 4) {
                    Text(String(format: "%.2f", distKm[currentLeg]))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.white)
                    Text("/").foregroundColor(.gray)
                    Text(String(format: "%.1f km", leg.targetKm))
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                }

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 4)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 6)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(legState == .active ? hiitOrange : Color.gray.opacity(0.4))
                            .frame(width: geo.size.width * progress, height: 6)
                            .animation(.linear(duration: 0.5), value: progress)
                    }
                }
                .frame(height: 6)
                .padding(.horizontal, 4)

                if legState == .active && heartRate > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .foregroundColor(.red).font(.system(size: 11))
                        Text("\(heartRate) bpm")
                            .font(.system(size: 12)).foregroundColor(.gray)
                    }
                }

                Spacer(minLength: 4)
                actionButton(p).padding(.bottom, 6)
            }
            .padding(.horizontal, 8)
        }
        .onReceive(NotificationCenter.default.publisher(for: .watchTriathlonReceived)) { note in
            if let p = note.object as? TriathlonPlan, legState == .idle { loadPlan(p) }
        }
        .onReceive(NotificationCenter.default.publisher(for: .triathlonElapsedTick)) { note in
            guard let info = note.userInfo,
                  let leg = info["leg"] as? Int,
                  let secs = info["secs"] as? Int,
                  leg == currentLeg else { return }
            elapsed[leg] = secs
        }
        .onReceive(NotificationCenter.default.publisher(for: .triathlonDistanceUpdate)) { note in
            guard let info = note.userInfo,
                  let leg = info["leg"] as? Int,
                  let km = info["km"] as? Double else { return }
            distKm[leg] = km
        }
        .onReceive(NotificationCenter.default.publisher(for: .triathlonHRUpdate)) { note in
            if let info = note.userInfo, let bpm = info["bpm"] as? Int {
                heartRate = bpm
            }
        }
    }

    @ViewBuilder
    private func actionButton(_ p: TriathlonPlan) -> some View {
        switch legState {
        case .idle:
            Button(action: { startLeg(p) }) {
                HStack(spacing: 6) {
                    Text(legIcons[currentLeg])
                    Text("NOW \(legLabels[currentLeg])")
                        .font(.system(size: 12, weight: .bold)).tracking(0.8)
                }
                .foregroundColor(.black)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 9)
                .background(hiitOrange)
                .cornerRadius(20)
            }
            .buttonStyle(.plain)

        case .active:
            if currentLeg < p.legs.count - 1 {
                Button(action: { advanceLeg(p) }) {
                    HStack(spacing: 4) {
                        Text("NEXT: \(legLabels[currentLeg + 1])")
                            .font(.system(size: 12, weight: .bold)).tracking(0.8)
                        Text("→")
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(Color.white.opacity(0.12))
                    .cornerRadius(20)
                }
                .buttonStyle(.plain)
            } else {
                Button(action: { finishRace(p) }) {
                    HStack(spacing: 6) {
                        Text("🏅")
                        Text("FINISH RACE")
                            .font(.system(size: 12, weight: .bold)).tracking(0.8)
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(hiitOrange)
                    .cornerRadius(20)
                }
                .buttonStyle(.plain)
            }

        case .done:
            EmptyView()
        }
    }

    // MARK: - Finished screen

    private var finishedScreen: some View {
        VStack(spacing: 8) {
            Text("🏅").font(.system(size: 36))
            Text("RACE COMPLETE")
                .font(.system(size: 13, weight: .black))
                .foregroundColor(hiitOrange).tracking(1.5)
            Text(fmtTime(elapsed.reduce(0, +)))
                .font(.system(size: 28, weight: .black, design: .monospaced))
                .foregroundColor(.white)
            Text("Total time").font(.system(size: 10)).foregroundColor(.gray)
            ForEach(0..<elapsed.count, id: \.self) { i in
                HStack {
                    Text(legIcons[i]).font(.system(size: 12))
                    Text(legLabels[i]).font(.system(size: 11)).foregroundColor(.gray)
                    Spacer()
                    Text(fmtTime(elapsed[i]))
                        .font(.system(size: 11, design: .monospaced)).foregroundColor(.white)
                    Text(String(format: "%.2fkm", distKm[i]))
                        .font(.system(size: 10)).foregroundColor(hiitOrange)
                }
            }
        }
        .padding()
    }

    // MARK: - Race control

    private func loadPlan(_ p: TriathlonPlan) {
        plan = p
        elapsed  = Array(repeating: 0,   count: p.legs.count)
        distKm   = Array(repeating: 0.0, count: p.legs.count)
        currentLeg = 0
        legState = .idle
    }

    private func startLeg(_ p: TriathlonPlan) {
        legState = .active
        TriathlonManager.shared.startLeg(currentLeg, legType: p.legs[currentLeg].type)
    }

    private func advanceLeg(_ p: TriathlonPlan) {
        TriathlonManager.shared.endLeg {
            legState = .idle
            currentLeg += 1
        }
    }

    private func finishRace(_ p: TriathlonPlan) {
        TriathlonManager.shared.endLeg {
            legState = .done
            raceFinished = true
            TriathlonManager.shared.notifyPhoneFinished(p, elapsed: elapsed, distKm: distKm)
        }
    }

    // MARK: - Helpers

    private func fmtTime(_ s: Int) -> String {
        let h = s / 3600; let m = (s % 3600) / 60; let sec = s % 60
        if h > 0 { return String(format: "%d:%02d:%02d", h, m, sec) }
        return String(format: "%02d:%02d", m, sec)
    }
}
