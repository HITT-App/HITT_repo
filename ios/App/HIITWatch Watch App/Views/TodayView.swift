import SwiftUI
import Combine

private let hiitOrange = Color(red: 1,     green: 0.541, blue: 0.149)
private let hiitGreen  = Color(red: 0.357, green: 0.890, blue: 0.627)
private let dimText    = Color(white: 0.541)

struct TodayView: View {
    @ObservedObject private var coordinator = WorkoutCoordinator.shared
    @State private var showPicker = false

    private var scheduledName: String? {
        WatchSessionManager.shared.todayWorkout?.name
    }

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
            } else {
                OpenDayScreen {
                    showPicker = true
                }
            }
        }
    }
}

// MARK: - Open day

private struct OpenDayScreen: View {
    let onPickSport: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            TopLabel("TODAY", color: dimText)
            Spacer()
            Text("What are we\ndoing today?")
                .font(.system(size: 15, weight: .semibold))
                .multilineTextAlignment(.center)
                .foregroundColor(.white)
                .padding(.bottom, 14)

            VStack(spacing: 7) {
                Button(action: onPickSport) {
                    HStack(spacing: 6) {
                        Image(systemName: "bolt.fill").font(.system(size: 12))
                        Text("Pick a sport").font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity).padding(.vertical, 10)
                    .background(hiitOrange).cornerRadius(22)
                }
                .buttonStyle(.plain)

                Button(action: {}) {
                    Text("Mark as rest day").font(.system(size: 12)).foregroundColor(dimText)
                        .frame(maxWidth: .infinity).padding(.vertical, 9)
                        .background(Color.white.opacity(0.06)).cornerRadius(22)
                }
                .buttonStyle(.plain)
            }
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
