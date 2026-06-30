import SwiftUI
import Combine
import WatchKit

// Design-spec colours
private let hiitOrange = Color(red: 1,    green: 0.541, blue: 0.149)
private let hiitRed    = Color(red: 1,    green: 0.271, blue: 0.227)
private let hiitGold   = Color(red: 1,    green: 0.690, blue: 0.125)
private let hiitYellow = Color(red: 1,    green: 0.753, blue: 0.180)
private let dimText    = Color(white: 0.541)
private let dimText2   = Color(white: 0.353)
private let rowBg      = Color(white: 1, opacity: 0.06)

// MARK: - Phase & Overlay

private enum WorkoutPhase {
    case idle, ready, countdown, active, paused
}

private enum WorkoutOverlay {
    case none, endConfirm, switchPicker, switchConfirm, completion, startPicker
}

// MARK: - HR Zone helpers

private func hrZone(_ bpm: Int) -> Int {
    if bpm < 115 { return 1 }
    if bpm < 133 { return 2 }
    if bpm < 152 { return 3 }
    if bpm < 171 { return 4 }
    return 5
}

private let zoneColors: [Color] = [
    Color(hex:"#60A5FA"), Color(hex:"#4ADE80"),
    Color(hex:"#FBBF24"), Color(hex:"#FB923C"), Color(hex:"#EF4444")
]

// MARK: - ActiveWorkoutView

struct ActiveWorkoutView: View {
    @ObservedObject private var coordinator = WorkoutCoordinator.shared

    @State private var phase: WorkoutPhase = .idle
    @State private var elapsedSeconds = 0
    @State private var heartRate = 0
    @State private var calories = 0
    @State private var distanceKm = 0.0
    @State private var workoutName = ""
    @State private var workoutColor = hiitOrange
    @State private var workoutIcon = "bolt"
    @State private var ticker: Timer? = nil
    @State private var countdownValue = 3
    @State private var page = 0    // 0=metrics, 1=HR zones, 2=controls

    // Overlay states (EndConfirm, Switch, Completion sit on top of phase views)
    @State private var overlay: WorkoutOverlay = .none
    @State private var switchTarget: WatchActivity? = nil
    @State private var completionElapsed = 0
    @State private var completionCalories = 0

    private let pageCount = 3

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            Group {
                // Overlays take precedence over phase views
                switch overlay {
                case .endConfirm:    endConfirmScreen
                case .switchPicker:  switchPickerView
                case .switchConfirm: switchConfirmScreen
                case .completion:    completionScreen
                case .startPicker:   startPickerView
                case .none:
                    switch phase {
                    case .idle:      idleScreen
                    case .ready:     readyScreen
                    case .countdown: countdownScreen
                    case .active:    activeScreen
                    case .paused:    pausedScreen
                    }
                }
            }
        }
        .onReceive(coordinator.$pendingWorkoutName) { name in
            guard let name else { return }
            if phase == .idle || phase == .ready {
                setActivity(name: name)
                phase = .ready
            }
        }
        .onAppear { setup() }
        .onDisappear { teardown() }
    }

    // MARK: - End confirm screen

    private var endConfirmScreen: some View {
        VStack(spacing: 0) {
            TopLabel("END WORKOUT?", color: hiitRed)
            VStack(alignment: .leading, spacing: 4) {
                Text(timeFormatted(elapsedSeconds))
                    .font(.system(size: 50, weight: .black, design: .monospaced))
                    .foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                Text(String(format: "%.2f KM · %d CAL", distanceKm, calories))
                    .font(.system(size: 11, weight: .semibold)).tracking(1.2).foregroundColor(dimText)
                    .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14).padding(.top, 8)

            Spacer(minLength: 4)

            VStack(spacing: 7) {
                Button(action: { confirmEnd(save: true) }) {
                    Text("End & Save")
                        .font(.system(size: 15, weight: .bold)).foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 11)
                        .background(hiitRed).cornerRadius(20)
                }
                .buttonStyle(.plain)

                Button(action: { confirmEnd(save: false) }) {
                    Text("Discard")
                        .font(.system(size: 14, weight: .semibold)).foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 9)
                        .background(Color.white.opacity(0.08)).cornerRadius(18)
                }
                .buttonStyle(.plain)

                Button(action: { overlay = .none }) {
                    Text("Resume")
                        .font(.system(size: 12)).foregroundColor(dimText)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14).padding(.bottom, 14)
        }
    }

    // MARK: - Switch activity picker

    private var switchPickerView: some View {
        ActivityPickerView(
            onSelect: { activity in
                switchTarget = activity
                overlay = .switchConfirm
            },
            onCancel: { overlay = .none }
        )
    }

    // MARK: - Start activity picker (from idle / standalone use)

    private var startPickerView: some View {
        ActivityPickerView(
            onSelect: { activity in
                setActivity(name: activity.name)
                overlay = .none
                phase = .ready
            },
            onCancel: { overlay = .none }
        )
    }

    // MARK: - Switch activity confirm

    private var switchConfirmScreen: some View {
        let fromActivity = WATCH_ACTIVITIES.first {
            workoutName.lowercased().contains($0.id) || workoutName.lowercased() == $0.name.lowercased()
        }
        let toActivity = switchTarget

        return VStack(spacing: 0) {
            TopLabel("SWITCH ACTIVITY", color: dimText)

            HStack(spacing: 16) {
                // From (dim)
                VStack(spacing: 6) {
                    ZStack {
                        Circle().fill(Color.white.opacity(0.06)).frame(width: 56, height: 56)
                        Image(systemName: fromActivity?.icon ?? "bolt")
                            .font(.system(size: 24)).foregroundColor(fromActivity?.color ?? hiitOrange)
                    }
                    Text(fromActivity?.name ?? workoutName)
                        .font(.system(size: 11)).foregroundColor(dimText)
                }
                .opacity(0.5)

                Image(systemName: "chevron.right").foregroundColor(hiitOrange).font(.system(size: 16))

                // To (bright)
                VStack(spacing: 6) {
                    ZStack {
                        Circle().fill(hiitOrange.opacity(0.15)).frame(width: 68, height: 68)
                            .shadow(color: hiitOrange.opacity(0.3), radius: 8)
                        Image(systemName: toActivity?.icon ?? "bolt")
                            .font(.system(size: 28)).foregroundColor(toActivity?.color ?? hiitOrange)
                    }
                    Text(toActivity?.name ?? "").font(.system(size: 13, weight: .bold)).foregroundColor(.white)
                }
            }
            .padding(.top, 12)

            Text("Time keeps running.\nNew activity logs separately.")
                .font(.system(size: 11)).foregroundColor(dimText)
                .multilineTextAlignment(.center).padding(.horizontal, 16).padding(.top, 10)

            Spacer(minLength: 4)

            HStack(spacing: 8) {
                Button(action: { overlay = .none }) {
                    Text("Cancel")
                        .font(.system(size: 12)).foregroundColor(dimText)
                        .frame(maxWidth: .infinity).padding(.vertical, 9)
                        .background(Color.white.opacity(0.08)).cornerRadius(18)
                }
                .buttonStyle(.plain)

                Button(action: {
                    if let to = switchTarget { confirmSwitch(to: to) }
                }) {
                    Text("Switch")
                        .font(.system(size: 13, weight: .bold)).foregroundColor(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 9)
                        .background(hiitOrange).cornerRadius(18)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12).padding(.bottom, 14)
        }
    }

    // MARK: - Completion screen

    private var completionScreen: some View {
        CompletionView(
            variant: .celebrate(elapsedSeconds: completionElapsed, calories: completionCalories, workoutName: workoutName),
            onDone: {
                overlay = .none
                phase = .idle
                coordinator.clearPending()
                coordinator.activeTab = 0
            },
            onShare: {
                // Ad-hoc Watch activity — no HITT DB workoutId available, so we
                // synthesize one from the name + timestamp so iPhone-side
                // dedup logic still treats it as a unique share event.
                let synthId = "watch-\(Int(Date().timeIntervalSince1970))-\(workoutName.replacingOccurrences(of: " ", with: "-").lowercased())"
                WorkoutManager.shared.notifyPhoneShareRequested(
                    workoutId: synthId,
                    workoutName: workoutName,
                    calories: completionCalories,
                    durationSeconds: completionElapsed
                )
            }
        )
    }

    // MARK: - Idle

    private var idleScreen: some View {
        VStack(spacing: 10) {
            Spacer()
            ZStack {
                Circle().fill(hiitOrange.opacity(0.12)).frame(width: 56, height: 56)
                Image(systemName: "bolt.fill").font(.system(size: 24)).foregroundColor(hiitOrange)
            }
            Text("Ready to Work").font(.system(size: 14, weight: .bold)).foregroundColor(.white)
            Text("Pick a sport to start")
                .font(.system(size: 11)).foregroundColor(dimText)
                .multilineTextAlignment(.center)
            Button(action: { overlay = .startPicker }) {
                Text("PICK SPORT")
                    .font(.system(size: 13, weight: .black)).tracking(1)
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity).padding(.vertical, 9)
                    .background(hiitOrange).cornerRadius(20)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 14).padding(.top, 6)
            Spacer()
        }
    }

    // MARK: - Ready (plan received from iPhone)

    private var readyScreen: some View {
        VStack(spacing: 0) {
            TopLabel("READY TO START", color: hiitOrange)
            Spacer()
            ZStack {
                Circle().fill(workoutColor.opacity(0.18)).frame(width: 56, height: 56).blur(radius: 8)
                Image(systemName: workoutIcon).font(.system(size: 26, weight: .medium)).foregroundColor(workoutColor)
            }
            .padding(.bottom, 6)
            Text(workoutName.isEmpty ? "HIIT" : workoutName.uppercased())
                .font(.system(size: 13, weight: .bold)).tracking(0.8).foregroundColor(.white)
            Text("Synced from iPhone").font(.system(size: 10)).foregroundColor(dimText).padding(.bottom, 14)
            Spacer()
            Button(action: startCountdown) {
                Text("READY  →")
                    .font(.system(size: 14, weight: .black)).tracking(1.2).foregroundColor(.black)
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(hiitOrange).cornerRadius(22)
            }
            .buttonStyle(.plain).padding(.horizontal, 10).padding(.bottom, 10)
        }
    }

    // MARK: - Countdown

    private var countdownScreen: some View {
        VStack {
            Spacer()
            Text(workoutName.isEmpty ? "" : workoutName)
                .font(.system(size: 11, weight: .semibold)).tracking(1).foregroundColor(workoutColor)
                .padding(.bottom, 4)
            ZStack {
                Circle().stroke(hiitOrange.opacity(0.2), lineWidth: 5).frame(width: 96, height: 96)
                Circle().stroke(hiitOrange, lineWidth: 5).frame(width: 96, height: 96)
                    .shadow(color: hiitOrange.opacity(0.6), radius: 8)
                    .opacity(countdownValue > 0 ? 1 : 0)
                Text(countdownValue > 0 ? "\(countdownValue)" : "GO!")
                    .font(.system(size: countdownValue > 0 ? 62 : 34, weight: .black, design: .rounded))
                    .foregroundColor(countdownValue > 0 ? .white : hiitOrange)
            }
            Text("Get ready…").font(.system(size: 11)).foregroundColor(dimText).padding(.top, 8)
            Spacer()
        }
    }

    // MARK: - Active (3 pages)

    private var activeScreen: some View {
        // Vertical paging on watchOS 10+ lets the crown drive metrics / HR / controls
        // so the inner TabView doesn't fight the outer ContentView's horizontal swipe.
        // On older watchOS we keep the original horizontal page style.
        Group {
            if #available(watchOS 10.0, *) {
                TabView(selection: $page) {
                    metricsPage.tag(0)
                    hrZonePage.tag(1)
                    controlsPage.tag(2)
                }
                .tabViewStyle(.verticalPage)
            } else {
                TabView(selection: $page) {
                    metricsPage.tag(0)
                    hrZonePage.tag(1)
                    controlsPage.tag(2)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
    }

    // Page 1 — Main metrics
    private var metricsPage: some View {
        VStack(spacing: 0) {
            // Sport header
            HStack(spacing: 5) {
                Image(systemName: workoutIcon).font(.system(size: 9)).foregroundColor(workoutColor)
                Text(workoutName.uppercased()).font(.system(size: 9, weight: .semibold)).tracking(0.8).foregroundColor(workoutColor).lineLimit(1)
                Spacer()
                Circle().fill(hiitRed).frame(width: 4, height: 4)
                    .opacity(elapsedSeconds % 2 == 0 ? 1 : 0.3)
            }
            .padding(.horizontal, 10).padding(.top, 4).padding(.bottom, 2)

            // Elapsed time — large but fits
            Text(timeFormatted(elapsedSeconds))
                .font(.system(size: 30, weight: .black, design: .monospaced))
                .foregroundColor(.white)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
                .frame(maxWidth: .infinity)
                .padding(.bottom, 4)

            // 2x2 metrics grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 4) {
                MetricTile(value: heartRate > 0 ? "\(heartRate)" : "—", unit: "BPM",
                           color: hiitRed, icon: "heart.fill")
                MetricTile(value: String(format: "%.2f", distanceKm), unit: "KM",
                           color: workoutColor, icon: "figure.run")
                MetricTile(value: pace, unit: "/KM",
                           color: .white, icon: "speedometer")
                MetricTile(value: "\(calories)", unit: "CAL",
                           color: hiitGold, icon: "flame.fill")
            }
            .padding(.horizontal, 6)
        }
    }

    // Page 2 — HR Zones
    private var hrZonePage: some View {
        VStack(spacing: 4) {
            let zone = hrZone(heartRate)
            TopLabel("HEART · ZONE \(zone)", color: hiitRed)
            Text(heartRate > 0 ? "\(heartRate)" : "—")
                .font(.system(size: 64, weight: .black, design: .monospaced))
                .foregroundColor(hiitRed).frame(maxWidth: .infinity)
            Text("AVG \(avgHR) · MAX \(maxHR)")
                .font(.system(size: 10)).foregroundColor(dimText).padding(.bottom, 6)

            HStack(spacing: 4) {
                ForEach(1...5, id: \.self) { z in
                    Capsule()
                        .fill(z == zone ? zoneColors[z - 1] : Color.white.opacity(0.12))
                        .frame(height: z == zone ? 20 : 14)
                        .shadow(color: z == zone ? zoneColors[z - 1].opacity(0.8) : .clear, radius: 4)
                        .overlay(
                            Text("Z\(z)").font(.system(size: 7, weight: .bold))
                                .foregroundColor(z == zone ? .black : dimText)
                        )
                }
            }
            .padding(.horizontal, 12)
        }
    }

    // Page 3 — Controls
    private var controlsPage: some View {
        VStack(spacing: 0) {
            TopLabel("CONTROLS", color: dimText)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ControlButton(icon: "pause.fill", label: "Pause",  color: hiitYellow) { togglePause() }
                ControlButton(icon: "stop.fill",  label: "End",    color: hiitRed)    { overlay = .endConfirm }
                ControlButton(icon: "arrow.triangle.2.circlepath", label: "Switch", color: hiitOrange) { overlay = .switchPicker }
                ControlButton(icon: "drop.fill",  label: "Lock",   color: .white)     {
                    WKInterfaceDevice.current().enableWaterLock()
                }
            }
            .padding(.horizontal, 10).padding(.top, 4)
        }
    }

    // MARK: - Paused

    private var pausedScreen: some View {
        ZStack {
            RadialGradient(gradient: Gradient(colors: [hiitYellow.opacity(0.15), .clear]),
                           center: .center, startRadius: 10, endRadius: 90).ignoresSafeArea()
            VStack(spacing: 0) {
                TopLabel("PAUSED · \(workoutName.uppercased())", color: hiitYellow)
                Text(timeFormatted(elapsedSeconds))
                    .font(.system(size: 40, weight: .black, design: .monospaced))
                    .foregroundColor(hiitYellow).padding(.vertical, 4)
                Text(String(format: "%.2f KM · %d CAL", distanceKm, calories))
                    .font(.system(size: 11)).foregroundColor(dimText).padding(.bottom, 10)
                HStack(spacing: 10) {
                    Button(action: { overlay = .endConfirm }) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 20)).foregroundColor(.white)
                            .frame(width: 52, height: 52).background(hiitRed).cornerRadius(26)
                            .shadow(color: hiitRed.opacity(0.4), radius: 6)
                    }
                    .buttonStyle(.plain)
                    Button(action: togglePause) {
                        Image(systemName: "play.fill")
                            .font(.system(size: 20)).foregroundColor(.black)
                            .frame(width: 52, height: 52).background(hiitOrange).cornerRadius(26)
                            .shadow(color: hiitOrange.opacity(0.5), radius: 6)
                    }
                    .buttonStyle(.plain)
                }
                Text("Side button to resume").font(.system(size: 9)).foregroundColor(dimText2).padding(.top, 6)
            }
        }
    }

    // MARK: - Countdown logic

    private func startCountdown() {
        phase = .countdown
        countdownValue = 3
        tick()
    }

    private func tick() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) {
            if countdownValue > 0 {
                countdownValue -= 1
                tick()
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { beginWorkout() }
            }
        }
    }

    private func beginWorkout() {
        let activity = WATCH_ACTIVITIES.first {
            workoutName.lowercased().contains($0.id) || workoutName.lowercased() == $0.name.lowercased()
        }
        let outdoor = activity?.isOutdoor ?? false
        var w = WatchWorkout(id: UUID().uuidString,
                             name: workoutName.isEmpty ? "Workout" : workoutName,
                             durationMinutes: 60,
                             exercises: [])
        w.activityKind = activity?.id
        coordinator.clearPending()
        WorkoutManager.shared.start(w, outdoor: outdoor)
        phase = .active
        page = 0
        WorkoutCoordinator.shared.workoutInProgress = true
        startTicker()
    }

    private func togglePause() {
        phase = phase == .paused ? .active : .paused
        if phase == .active { startTicker() } else { ticker?.invalidate(); ticker = nil }
    }

    private func stopWorkout() {
        ticker?.invalidate(); ticker = nil
        WorkoutManager.shared.end()
        phase = .idle
        WorkoutCoordinator.shared.workoutInProgress = false
        coordinator.clearPending()
        coordinator.activeTab = 0
    }

    private func confirmEnd(save: Bool) {
        if save {
            completionElapsed = elapsedSeconds
            completionCalories = calories
        }
        ticker?.invalidate(); ticker = nil
        WorkoutManager.shared.end()
        elapsedSeconds = 0; heartRate = 0; calories = 0; distanceKm = 0
        maxHR = 0; totalHR = 0; hrSamples = 0
        phase = .idle
        overlay = save ? .completion : .none
        WorkoutCoordinator.shared.workoutInProgress = false
        if !save {
            // Discarding sends them straight home; on a save the completion
            // screen handles the "Done" → home transition itself.
            coordinator.clearPending()
            coordinator.activeTab = 0
        }
    }

    private func confirmSwitch(to activity: WatchActivity) {
        // End current segment without full reset, start new activity
        setActivity(name: activity.name)
        overlay = .none
        switchTarget = nil
        // The ticker keeps running — WorkoutManager stays active
    }

    private func startTicker() {
        ticker?.invalidate()
        elapsedSeconds = WorkoutManager.shared.elapsedSeconds
        distanceKm = WorkoutManager.shared.currentDistanceKm
        // Distance is now fed by HKLiveWorkoutBuilder via onDistanceUpdate
        // (set up in setup()); the ticker only advances the clock display.
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            self.elapsedSeconds += 1
        }
    }

    private func setActivity(name: String) {
        workoutName = name
        if let act = WATCH_ACTIVITIES.first(where: { name.lowercased().contains($0.id) })
                  ?? WATCH_ACTIVITIES.first(where: { name.lowercased() == $0.name.lowercased() }) {
            workoutColor = act.color
            workoutIcon  = act.icon
        } else {
            workoutColor = hiitOrange
            workoutIcon  = "bolt"
        }
    }

    // MARK: - Helpers

    private var pace: String {
        guard distanceKm > 0.05 else { return "—" }
        let sPerKm = Double(elapsedSeconds) / distanceKm
        return String(format: "%d:%02d", Int(sPerKm) / 60, Int(sPerKm) % 60)
    }

    @State private var maxHR = 0
    @State private var totalHR = 0
    @State private var hrSamples = 0
    private var avgHR: Int { hrSamples > 0 ? totalHR / hrSamples : 0 }

    // MARK: - Lifecycle

    private func setup() {
        if WorkoutManager.shared.isRunning { phase = .active; startTicker() }
        else if let name = coordinator.pendingWorkoutName { setActivity(name: name); phase = .ready }

        WorkoutManager.shared.onStateChange = { running, name in
            WorkoutCoordinator.shared.workoutInProgress = running
            if running { self.phase = .active; if let n = name { self.setActivity(name: n) }; self.startTicker() }
            else { self.ticker?.invalidate(); self.ticker = nil
                   self.elapsedSeconds = 0; self.heartRate = 0; self.calories = 0; self.distanceKm = 0
                   self.phase = self.coordinator.pendingWorkoutName != nil ? .ready : .idle }
        }
        WorkoutManager.shared.onHeartRateUpdate = { bpm in
            self.heartRate = bpm
            self.totalHR += bpm; self.hrSamples += 1
            if bpm > self.maxHR { self.maxHR = bpm }
        }
        WorkoutManager.shared.onCaloriesUpdate = { self.calories = $0 }
        WorkoutManager.shared.onDistanceUpdate = { self.distanceKm = $0 }
    }

    private func teardown() {
        WorkoutManager.shared.onStateChange = nil
        WorkoutManager.shared.onHeartRateUpdate = nil
        WorkoutManager.shared.onCaloriesUpdate = nil
        WorkoutManager.shared.onDistanceUpdate = nil
        ticker?.invalidate(); ticker = nil
    }
}

// MARK: - Sub-views

private struct MetricTile: View {
    let value: String; let unit: String; let color: Color; let icon: String
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon).foregroundColor(color).font(.system(size: 9))
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                Text(unit)
                    .font(.system(size: 7, weight: .medium))
                    .foregroundColor(dimText)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 5).padding(.horizontal, 6)
        .background(rowBg).cornerRadius(8)
    }
}

private struct ControlButton: View {
    let icon: String; let label: String; let color: Color; let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon).font(.system(size: 16)).foregroundColor(color)
                Text(label).font(.system(size: 8, weight: .medium)).foregroundColor(dimText)
            }
            .frame(maxWidth: .infinity).padding(.vertical, 10)
            .background(rowBg).cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

private func timeFormatted(_ s: Int) -> String {
    let h = s / 3600; let m = (s % 3600) / 60; let sec = s % 60
    if h > 0 { return String(format: "%d:%02d:%02d", h, m, sec) }
    return String(format: "%02d:%02d", m, sec)
}

// MARK: - Tab entry point (lifecycle now lives on ActiveWorkoutView itself)

struct ActiveWorkoutTab: View {
    var body: some View { ActiveWorkoutView() }
}
