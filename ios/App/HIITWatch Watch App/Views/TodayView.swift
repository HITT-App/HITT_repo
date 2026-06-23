import SwiftUI
import Combine

private let hiitOrange = Color(red: 1,     green: 0.541, blue: 0.149)
private let hiitPurple = Color(red: 0.655, green: 0.545, blue: 0.980)
private let hiitGreen  = Color(red: 0.357, green: 0.890, blue: 0.627)
private let dimText    = Color(white: 0.541)
private let dimText2   = Color(white: 0.35)

struct TodayView: View {
    @ObservedObject private var coordinator = WorkoutCoordinator.shared
    @State private var showPicker = false
    @State private var dayType: WatchDayType = WatchSessionManager.shared.todayDayType
    // State-backed so SwiftUI re-renders when a workout arrives (computed props don't trigger updates)
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
                NothingScheduledScreen(
                    onPickSport: { showPicker = true },
                    onMarkRest: {
                        WatchSessionManager.shared.setLocalDayType(.rest)
                        dayType = .rest
                    }
                )
            }
        }
        .onAppear {
            // Reload from manager in case it was restored from UserDefaults before the view appeared
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

// MARK: - Nothing scheduled (open day)

private struct NothingScheduledScreen: View {
    let onPickSport: () -> Void
    let onMarkRest: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            TopLabel("TODAY", color: dimText)
            VStack(alignment: .leading, spacing: 2) {
                Text("Nothing\nscheduled")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                Text("Pick how today goes")
                    .font(.system(size: 12))
                    .foregroundColor(dimText)
                    .padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14)
            .padding(.top, 10)

            VStack(spacing: 8) {
                Button(action: onPickSport) {
                    HStack(spacing: 10) {
                        Image(systemName: "bolt.fill").font(.system(size: 14))
                        Text("Quick start").font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(hiitOrange)
                    .overlay(RoundedRectangle(cornerRadius: 13).stroke(hiitOrange, lineWidth: 1.5))
                    .cornerRadius(13)
                }
                .buttonStyle(.plain)

                Button(action: onMarkRest) {
                    HStack(spacing: 10) {
                        Image(systemName: "moon.fill").font(.system(size: 14)).foregroundColor(hiitPurple)
                        Text("Mark as rest").font(.system(size: 13)).foregroundColor(.white)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(Color.white.opacity(0.05)).cornerRadius(13)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12).padding(.top, 14).padding(.bottom, 10)

            PageDots(count: 4, current: 0)
        }
    }
}

// MARK: - Recovery day (coach suggested)

private struct RecoveryDayScreen: View {
    let onStart: () -> Void

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 0) {
                TopLabel("RECOVERY DAY", color: hiitPurple)
                Spacer()
                ZStack {
                    Circle()
                        .fill(hiitPurple.opacity(0.15))
                        .frame(width: 80, height: 80)
                        .shadow(color: hiitPurple.opacity(0.25), radius: 16)
                    Image(systemName: "wind")
                        .font(.system(size: 38, weight: .light))
                        .foregroundColor(hiitPurple)
                }
                Text("Light yoga")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.top, 10)
                Text("20 min · suggested by coach")
                    .font(.system(size: 12))
                    .foregroundColor(dimText)
                    .multilineTextAlignment(.center)
                    .padding(.top, 3)
                    .padding(.horizontal, 16)

                Button(action: onStart) {
                    Text("Start")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(red: 0.1, green: 0.04, blue: 0.12))
                        .frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(hiitPurple).cornerRadius(20)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 14).padding(.top, 14).padding(.bottom, 10)

                PageDots(count: 4, current: 0)
            }
        }
    }
}

// MARK: - Deliberate rest day

private struct DeliberateRestScreen: View {
    let onOverride: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            TopLabel("REST DAY", color: hiitGreen)
            VStack(alignment: .leading, spacing: 2) {
                Text("Take it easy")
                    .font(.system(size: 20, weight: .bold)).foregroundColor(.white)
                Text("3rd day this week")
                    .font(.system(size: 11)).foregroundColor(dimText).padding(.top, 2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14).padding(.top, 10)

            // Readiness card
            VStack(alignment: .leading, spacing: 4) {
                Text("READINESS")
                    .font(.system(size: 9, weight: .bold)).tracking(1.3).foregroundColor(dimText)
                HStack(alignment: .lastTextBaseline, spacing: 4) {
                    Text("92")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(hiitGreen)
                    Text("/ 100")
                        .font(.system(size: 12)).foregroundColor(dimText)
                }
                Text("Sleep 7h 42m · HRV 64")
                    .font(.system(size: 10)).foregroundColor(dimText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(10)
            .background(hiitGreen.opacity(0.08))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(hiitGreen.opacity(0.25), lineWidth: 1))
            .cornerRadius(12)
            .padding(.horizontal, 12).padding(.top, 12)

            Spacer(minLength: 4)

            Button(action: onOverride) {
                Text("Override · pick sport")
                    .font(.system(size: 12, weight: .semibold)).foregroundColor(.white)
                    .frame(maxWidth: .infinity).padding(.vertical, 9)
                    .background(Color.white.opacity(0.08)).cornerRadius(16)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 12).padding(.bottom, 10)

            PageDots(count: 4, current: 0)
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
            TopLabel("TODAY · FROM iPHONE", color: hiitOrange)
            Spacer()
            ZStack {
                Circle().fill(hiitOrange.opacity(0.15)).frame(width: 64, height: 64).blur(radius: 10)
                Image(systemName: activity?.icon ?? "bolt")
                    .font(.system(size: 28, weight: .medium))
                    .foregroundColor(activity?.color ?? hiitOrange)
            }
            .padding(.bottom, 6)
            Text(name).font(.system(size: 16, weight: .bold)).foregroundColor(.white)
            Text("ready to start").font(.system(size: 11)).foregroundColor(dimText).padding(.bottom, 14)

            VStack(spacing: 7) {
                Button(action: onStart) {
                    Text("START").font(.system(size: 14, weight: .black)).tracking(1)
                        .foregroundColor(.black).frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(hiitOrange).cornerRadius(22)
                }
                .buttonStyle(.plain)
                Button(action: onPickAnother) {
                    Text("Pick different sport").font(.system(size: 11)).foregroundColor(dimText)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12).padding(.bottom, 10)

            PageDots(count: 4, current: 0)
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
            VStack(spacing: 8) {
                Image(systemName: "iphone").font(.system(size: 18)).foregroundColor(hiitOrange).padding(.top, 10)
                Text("FROM iPHONE").font(.system(size: 9, weight: .semibold)).tracking(1.4).foregroundColor(dimText)
                let act = WATCH_ACTIVITIES.first { name.lowercased().contains($0.id) }
                ZStack {
                    Circle().fill(hiitOrange.opacity(0.2)).frame(width: 50, height: 50)
                    Image(systemName: act?.icon ?? "bolt").font(.system(size: 22)).foregroundColor(hiitOrange)
                }
                Text(name).font(.system(size: 14, weight: .bold)).foregroundColor(.white)
                Text("30 min · ready to start").font(.system(size: 10)).foregroundColor(dimText)
                Spacer(minLength: 4)
                HStack(spacing: 8) {
                    Button(action: onDismiss) {
                        Text("Later").font(.system(size: 12)).foregroundColor(dimText)
                            .frame(maxWidth: .infinity).padding(.vertical, 9)
                            .background(Color.white.opacity(0.08)).cornerRadius(22)
                    }
                    .buttonStyle(.plain)
                    Button(action: onStart) {
                        Text("Start").font(.system(size: 13, weight: .bold)).foregroundColor(.black)
                            .frame(maxWidth: .infinity).padding(.vertical, 9)
                            .background(hiitOrange).cornerRadius(22)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 10).padding(.bottom, 10)
            }
        }
    }
}

// MARK: - Shared components

struct TopLabel: View {
    let text: String
    let color: Color
    init(_ text: String, color: Color = Color(white: 0.54)) { self.text = text; self.color = color }
    var body: some View {
        Text(text).font(.system(size: 9, weight: .semibold)).tracking(1.3).foregroundColor(color)
            .frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 12).padding(.top, 8)
    }
}

struct PageDots: View {
    let count: Int
    let current: Int
    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<count, id: \.self) { i in
                Circle().fill(i == current ? Color.white : Color.white.opacity(0.25))
                    .frame(width: i == current ? 6 : 4, height: i == current ? 6 : 4)
            }
        }
        .padding(.bottom, 6)
    }
}
