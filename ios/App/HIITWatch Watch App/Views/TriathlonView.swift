import SwiftUI

private let hiitOrange = Color(red: 1,     green: 0.541, blue: 0.149)
private let hiitGold   = Color(red: 1,     green: 0.752, blue: 0.180)
private let hiitGreen  = Color(red: 0.357, green: 0.890, blue: 0.627)
private let swimBlue   = Color(red: 0.353, green: 0.784, blue: 0.980)
private let dimText    = Color(white: 0.541)
private let dimText2   = Color(white: 0.35)

private let legIcons:  [String] = ["wave.3.right", "bicycle", "figure.run"]
private let legLabels: [String] = ["SWIM", "BIKE", "RUN"]
private let legColors: [Color]  = [swimBlue, hiitGreen, hiitGold]
private let legEmoji:  [String] = ["🌊", "🚴", "🏃"]

struct TriathlonView: View {
    @State private var plan: TriathlonPlan? = nil
    @State private var currentLeg: Int = 0
    @State private var legState: LegState = .idle
    @State private var raceStarted = false
    @State private var elapsed: [Int]   = [0, 0, 0]
    @State private var distKm: [Double] = [0, 0, 0]
    @State private var heartRate: Int   = 0
    @State private var raceFinished     = false

    enum LegState { case idle, active, done }

    var body: some View {
        if raceFinished {
            raceSummaryScreen
        } else if let p = plan {
            if raceStarted {
                raceScreen(p)
            } else {
                raceLoadedScreen(p)
            }
        } else {
            noPlanScreen
        }
    }

    // MARK: - No plan

    private var noPlanScreen: some View {
        VStack(spacing: 10) {
            Image(systemName: "medal.fill").font(.system(size: 32)).foregroundColor(hiitGold)
            Text("No Race Loaded")
                .font(.system(size: 14, weight: .bold)).foregroundColor(.white)
            Text("Set up your race\nin the HIIT app")
                .font(.system(size: 11)).foregroundColor(dimText).multilineTextAlignment(.center)
        }
        .onAppear {
            if let p = WatchSessionManager.shared.triathlonPlan { loadPlan(p) }
        }
        .onReceive(NotificationCenter.default.publisher(for: .watchTriathlonReceived)) { note in
            if let p = note.object as? TriathlonPlan { loadPlan(p) }
        }
    }

    // MARK: - Race loaded (pre-start overview)

    private func raceLoadedScreen(_ p: TriathlonPlan) -> some View {
        let legDefs: [(icon: String, color: Color, label: String, km: Double)] = zip(p.legs, zip(legIcons, zip(legColors, legLabels))).map {
            leg, rest in (icon: rest.0, color: rest.1.0, label: rest.1.1, km: leg.targetKm)
        }

        return VStack(spacing: 0) {
            TopLabel("RACE READY", color: hiitGold)
            VStack(alignment: .leading, spacing: 2) {
                Text(p.name)
                    .font(.system(size: 24, weight: .black)).foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.8)
                Text("Tap Start when you're ready")
                    .font(.system(size: 11)).foregroundColor(dimText).padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14).padding(.top, 6)

            VStack(spacing: 7) {
                ForEach(0..<legDefs.count, id: \.self) { i in
                    let leg = legDefs[i]
                    HStack(spacing: 10) {
                        ZStack {
                            Circle().fill(Color.white.opacity(0.06)).frame(width: 30, height: 30)
                            Image(systemName: leg.icon).font(.system(size: 14)).foregroundColor(leg.color)
                        }
                        Text(leg.label)
                            .font(.system(size: 14, weight: .semibold)).foregroundColor(.white)
                        Spacer()
                        HStack(alignment: .lastTextBaseline, spacing: 2) {
                            Text(String(format: leg.km >= 10 ? "%.0f" : "%.1f", leg.km))
                                .font(.system(size: 18, weight: .black)).foregroundColor(.white)
                            Text("km").font(.system(size: 11)).foregroundColor(dimText)
                        }
                    }
                    .padding(.horizontal, 12).padding(.vertical, 9)
                    .background(Color.white.opacity(0.05)).cornerRadius(12)
                }
            }
            .padding(.horizontal, 12).padding(.top, 12)

            Spacer(minLength: 4)

            Button(action: { raceStarted = true }) {
                Text("Start Race")
                    .font(.system(size: 14, weight: .black))
                    .foregroundColor(Color(red: 0.1, green: 0.08, blue: 0.0))
                    .frame(maxWidth: .infinity).padding(.vertical, 11)
                    .background(hiitGold).cornerRadius(22)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 14).padding(.bottom, 14)
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
                            Image(systemName: legIcons[i]).font(.system(size: 13)).foregroundColor(legColors[i])
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
                    Image(systemName: legIcons[currentLeg]).font(.system(size: 12))
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

    // MARK: - Race summary screen

    private var raceSummaryScreen: some View {
        VStack(spacing: 0) {
            TopLabel("FINISHED", color: hiitGold)

            VStack(spacing: 4) {
                Image(systemName: "medal.fill")
                    .font(.system(size: 48)).foregroundColor(hiitGold)
                    .shadow(color: hiitGold.opacity(0.4), radius: 8)
                    .padding(.top, 8)
                Text(fmtTime(elapsed.reduce(0, +)))
                    .font(.system(size: 34, weight: .black, design: .monospaced))
                    .foregroundColor(.white)
                Text("Total time").font(.system(size: 10)).foregroundColor(dimText)
            }

            // Per-leg grid
            HStack(spacing: 5) {
                ForEach(0..<min(elapsed.count, 3), id: \.self) { i in
                    VStack(spacing: 3) {
                        Text(fmtTime(elapsed[i]))
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(legColors[i])
                        Text(legLabels[i])
                            .font(.system(size: 7, weight: .bold)).tracking(1).foregroundColor(dimText2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 7)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal, 12).padding(.top, 14)

            Spacer(minLength: 4)

            Button(action: { raceFinished = false; plan = nil }) {
                Text("Save")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Color(red: 0.1, green: 0.08, blue: 0.0))
                    .frame(maxWidth: .infinity).padding(.vertical, 11)
                    .background(hiitGold).cornerRadius(20)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 14).padding(.bottom, 14)
        }
    }

    // MARK: - Race control

    private func loadPlan(_ p: TriathlonPlan) {
        plan = p
        elapsed    = Array(repeating: 0,   count: p.legs.count)
        distKm     = Array(repeating: 0.0, count: p.legs.count)
        currentLeg = 0
        legState   = .idle
        raceStarted = false
        raceFinished = false
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
