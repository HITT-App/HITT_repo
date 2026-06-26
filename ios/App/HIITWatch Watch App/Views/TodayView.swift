import SwiftUI
import Combine

// MARK: - Design tokens (mirror watch-screens.jsx)

private let hiitOrange     = Color(red: 1,     green: 0.541, blue: 0.149)
private let hiitOrangeDim  = Color(red: 0.227, green: 0.141, blue: 0.071)
private let hiitPurple     = Color(red: 0.655, green: 0.545, blue: 0.980)
private let hiitGreen      = Color(red: 0.357, green: 0.890, blue: 0.627)
private let stepGreen      = Color(red: 0.204, green: 0.780, blue: 0.349)
private let hrRed          = Color(red: 1,     green: 0.231, blue: 0.188)
private let goldYellow     = Color(red: 1,     green: 0.753, blue: 0.180)
private let dimText        = Color(white: 0.541)
private let dimText2       = Color(white: 0.353)
private let tileBg         = Color.white.opacity(0.06)

// MARK: - Root

struct TodayView: View {
    @ObservedObject private var coordinator = WorkoutCoordinator.shared
    @State private var showPicker = false
    @State private var dayType: WatchDayType = WatchSessionManager.shared.todayDayType
    @State private var scheduledName: String? = WatchSessionManager.shared.todayWorkout?.name

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if showPicker {
                ActivityPickerView(
                    onSelect: { activity in
                        showPicker = false
                        coordinator.pendingWorkoutName = activity.name
                        coordinator.activeTab = 1
                    },
                    onCancel: { showPicker = false }
                )
            } else if let pendingName = coordinator.pendingWorkoutName, coordinator.activeTab != 1 {
                IncomingWorkoutScreen(name: pendingName) {
                    coordinator.activeTab = 1
                } onDismiss: {
                    coordinator.clearPending()
                }
            } else if let name = scheduledName {
                ScheduledScreen(name: name) {
                    coordinator.activeTab = 1
                } onPickAnother: {
                    showPicker = true
                }
            } else if dayType == .recovery {
                RecoveryDayScreen { coordinator.activeTab = 1 }
            } else if dayType == .rest {
                DeliberateRestScreen { showPicker = true }
            } else {
                OpenDayScreen(onPickSport: { showPicker = true })
            }
        }
        .onAppear {
            scheduledName = WatchSessionManager.shared.todayWorkout?.name
        }
        .onReceive(NotificationCenter.default.publisher(for: .watchWorkoutReceived)) { note in
            scheduledName = (note.object as? WatchWorkout)?.name
        }
        .onReceive(NotificationCenter.default.publisher(for: .watchDayTypeChanged)) { note in
            if let dt = note.object as? WatchDayType { dayType = dt }
        }
    }
}

// MARK: - Open day (no schedule, no rest flag) — step ring + stats + CTA

private struct OpenDayScreen: View {
    let onPickSport: () -> Void

    // TODO #15: wire to HealthKit for live values. Placeholders for now so the
    // visual is right; missing reads display as "—".
    private let steps = 8214
    private let stepsGoalPct = 0.82
    private let avgHr = 72
    private let cal = 612
    private let streakDays = 12

    var body: some View {
        VStack(spacing: 0) {
            HiitTopLabel("TODAY")

            // Hero row: step ring + steps count
            HStack(spacing: 13) {
                StepRing(progress: stepsGoalPct)
                VStack(alignment: .leading, spacing: 6) {
                    Text(steps.formatted())
                        .font(.system(size: 34, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(.white)
                        .kerning(-1.2)
                    Text("STEPS · \(Int(stepsGoalPct * 100))%")
                        .font(.system(size: 11, weight: .bold))
                        .tracking(1.3)
                        .foregroundColor(dimText)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 14)
            .padding(.top, 10)

            // 3-up stat grid
            HStack(spacing: 6) {
                StatTile(icon: "heart.fill", iconColor: hrRed, value: "\(avgHr)", unit: "bpm", label: "AVG HR")
                StatTile(icon: "flame.fill", iconColor: hiitOrange, value: "\(cal)", unit: nil, label: "CAL")
                StatTile(icon: "trophy.fill", iconColor: goldYellow, value: "\(streakDays)", unit: "d", label: "STREAK")
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)

            Spacer(minLength: 6)

            // Pick a sport CTA
            Button(action: onPickSport) {
                HStack(spacing: 8) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 13, weight: .heavy))
                    Text("Pick a sport")
                        .font(.system(size: 14, weight: .heavy))
                }
                .foregroundColor(Color(red: 0.10, green: 0.04, blue: 0))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 11)
                .background(hiitOrange)
                .cornerRadius(15)
                .shadow(color: hiitOrange.opacity(0.4), radius: 8, y: 0)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 12)
            .padding(.bottom, 6)

            PageDots(count: 5, current: 0)
        }
    }
}

// MARK: - Step ring (64x64 circle with sport icon center)

private struct StepRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.white.opacity(0.08), lineWidth: 6)
            Circle()
                .trim(from: 0, to: progress)
                .stroke(stepGreen, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Image(systemName: "figure.run")
                .font(.system(size: 22, weight: .medium))
                .foregroundColor(stepGreen)
        }
        .frame(width: 60, height: 60)
    }
}

// MARK: - Stat tile (3-up grid)

private struct StatTile: View {
    let icon: String
    let iconColor: Color
    let value: String
    let unit: String?
    let label: String

    var body: some View {
        VStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(iconColor)
            HStack(alignment: .lastTextBaseline, spacing: 1) {
                Text(value)
                    .font(.system(size: 19, weight: .heavy, design: .rounded))
                    .monospacedDigit()
                    .foregroundColor(.white)
                    .kerning(-0.5)
                if let unit {
                    Text(unit)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(dimText)
                }
            }
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            Text(label)
                .font(.system(size: 8, weight: .heavy))
                .tracking(0.7)
                .foregroundColor(dimText2)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(tileBg)
        .cornerRadius(11)
    }
}

// MARK: - Recovery day (coach-suggested)

private struct RecoveryDayScreen: View {
    let onStart: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HiitTopLabel("RECOVERY DAY", color: hiitPurple)
            Spacer()
            ZStack {
                Circle().fill(hiitPurple.opacity(0.15)).frame(width: 80, height: 80)
                    .shadow(color: hiitPurple.opacity(0.25), radius: 14)
                Image(systemName: "wind")
                    .font(.system(size: 38, weight: .light))
                    .foregroundColor(hiitPurple)
            }
            Text("Light yoga")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
                .padding(.top, 8)
            Text("20 min · suggested by coach")
                .font(.system(size: 11))
                .foregroundColor(dimText)
                .multilineTextAlignment(.center)
                .padding(.top, 2)
                .padding(.horizontal, 12)
            Button(action: onStart) {
                Text("Start")
                    .font(.system(size: 14, weight: .heavy))
                    .foregroundColor(Color(red: 0.1, green: 0.04, blue: 0.12))
                    .frame(maxWidth: .infinity).padding(.vertical, 9)
                    .background(hiitPurple).cornerRadius(20)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 14).padding(.top, 12).padding(.bottom, 6)
            PageDots(count: 5, current: 0)
        }
    }
}

// MARK: - Deliberate rest

private struct DeliberateRestScreen: View {
    let onOverride: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            HiitTopLabel("REST DAY", color: hiitGreen)
            VStack(alignment: .leading, spacing: 2) {
                Text("Take it easy")
                    .font(.system(size: 20, weight: .bold)).foregroundColor(.white)
                Text("3rd day this week")
                    .font(.system(size: 11)).foregroundColor(dimText).padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14).padding(.top, 10)

            VStack(alignment: .leading, spacing: 4) {
                Text("READINESS")
                    .font(.system(size: 9, weight: .heavy)).tracking(1.3).foregroundColor(dimText)
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("92")
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(hiitGreen)
                    Text("/ 100")
                        .font(.system(size: 11)).foregroundColor(dimText)
                }
                Text("Sleep 7h 42m · HRV 64")
                    .font(.system(size: 10)).foregroundColor(dimText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .background(hiitGreen.opacity(0.08))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(hiitGreen.opacity(0.25), lineWidth: 1))
            .cornerRadius(12)
            .padding(.horizontal, 12).padding(.top, 10)

            Spacer(minLength: 4)

            Button(action: onOverride) {
                Text("Override · pick sport")
                    .font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 8)
                    .background(Color.white.opacity(0.08)).cornerRadius(16)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 12).padding(.bottom, 6)

            PageDots(count: 5, current: 0)
        }
    }
}

// MARK: - Scheduled workout from iPhone

private struct ScheduledScreen: View {
    let name: String
    let onStart: () -> Void
    let onPickAnother: () -> Void

    private var activity: WatchActivity? {
        WATCH_ACTIVITIES.first { $0.name.lowercased() == name.lowercased() }
            ?? WATCH_ACTIVITIES.first { name.lowercased().contains($0.id) }
    }

    var body: some View {
        VStack(spacing: 0) {
            HiitTopLabel("TODAY · FROM iPHONE")
            Spacer()
            ZStack {
                Circle().fill(hiitOrangeDim).frame(width: 90, height: 90)
                    .shadow(color: hiitOrange.opacity(0.25), radius: 14)
                Image(systemName: activity?.icon ?? "bolt.fill")
                    .font(.system(size: 38, weight: .medium))
                    .foregroundColor(activity?.color ?? hiitOrange)
            }
            Text(name)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
                .padding(.top, 8)
            Text("30 min · sent from iPhone")
                .font(.system(size: 11))
                .foregroundColor(dimText)
                .padding(.top, 2)

            VStack(spacing: 6) {
                Button(action: onStart) {
                    Text("Start")
                        .font(.system(size: 14, weight: .heavy)).tracking(0.8)
                        .foregroundColor(.black).frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(hiitOrange).cornerRadius(20)
                }
                .buttonStyle(.plain)
                Button(action: onPickAnother) {
                    Text("Pick different sport").font(.system(size: 11)).foregroundColor(dimText)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14).padding(.top, 12).padding(.bottom, 6)

            PageDots(count: 5, current: 0)
        }
    }
}

// MARK: - Incoming from iPhone (mirror notification)

private struct IncomingWorkoutScreen: View {
    let name: String
    let onStart: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            RadialGradient(gradient: Gradient(colors: [hiitOrange.opacity(0.25), .clear]),
                           center: .center, startRadius: 20, endRadius: 100).ignoresSafeArea()
            VStack(spacing: 6) {
                Image(systemName: "iphone").font(.system(size: 16)).foregroundColor(hiitOrange).padding(.top, 8)
                Text("FROM iPHONE")
                    .font(.system(size: 9, weight: .heavy)).tracking(1.4).foregroundColor(dimText)
                let act = WATCH_ACTIVITIES.first { name.lowercased().contains($0.id) }
                ZStack {
                    Circle().fill(hiitOrange.opacity(0.2)).frame(width: 48, height: 48)
                    Image(systemName: act?.icon ?? "bolt").font(.system(size: 22)).foregroundColor(hiitOrange)
                }
                .padding(.top, 4)
                Text(name).font(.system(size: 14, weight: .bold)).foregroundColor(.white)
                Text("30 min · ready to start").font(.system(size: 10)).foregroundColor(dimText)
                Spacer(minLength: 4)
                HStack(spacing: 8) {
                    Button(action: onDismiss) {
                        Text("Later").font(.system(size: 12)).foregroundColor(dimText)
                            .frame(maxWidth: .infinity).padding(.vertical, 9)
                            .background(Color.white.opacity(0.08)).cornerRadius(20)
                    }
                    .buttonStyle(.plain)
                    Button(action: onStart) {
                        Text("Start").font(.system(size: 13, weight: .heavy)).foregroundColor(.black)
                            .frame(maxWidth: .infinity).padding(.vertical, 9)
                            .background(hiitOrange).cornerRadius(20)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 10).padding(.bottom, 8)
            }
        }
    }
}

// MARK: - Shared components

// Top label: 4×18 colored pill + bold tracked caps.
struct HiitTopLabel: View {
    let text: String
    let color: Color
    init(_ text: String, color: Color = Color(red: 1, green: 0.541, blue: 0.149)) {
        self.text = text
        self.color = color
    }
    var body: some View {
        HStack(spacing: 7) {
            RoundedRectangle(cornerRadius: 2)
                .fill(color)
                .frame(width: 4, height: 16)
            Text(text)
                .font(.system(size: 12, weight: .heavy))
                .tracking(1.3)
                .foregroundColor(color)
            Spacer(minLength: 0)
        }
        .padding(.leading, 14)
        .padding(.top, 4)
    }
}

struct PageDots: View {
    let count: Int
    let current: Int
    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<count, id: \.self) { i in
                Circle()
                    .fill(i == current ? Color.white : Color.white.opacity(0.28))
                    .frame(width: i == current ? 5 : 4, height: i == current ? 5 : 4)
            }
        }
        .padding(.bottom, 4)
    }
}
