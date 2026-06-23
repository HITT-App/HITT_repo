// Lock Screen + Dynamic Island UI for the HIIT in-progress workout Live Activity.
//
// The plugin (capacitor-live-activity) starts `Activity<GenericAttributes>` with two
// stringly-typed maps:
//   staticValues (set once): workoutType, workoutTitle, startedAt (epoch ms as string)
//   ContentState.values    : elapsedSeconds, distanceMeters, paceString, heartRate, isPaused

import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.2, *)
private enum HIITPalette {
    static let primary = Color(red: 1.0, green: 0.541, blue: 0.149) // hsl(24, 90%, 55%)
    static let dim = Color.white.opacity(0.6)
}

@available(iOS 16.2, *)
private struct WorkoutView {
    let state: GenericAttributes.ContentState
    let attributes: GenericAttributes

    var workoutTitle: String {
        let title = attributes.staticValues["workoutTitle"] ?? "Workout"
        return title.isEmpty ? "Workout" : title
    }

    var startedAt: Date {
        if let raw = attributes.staticValues["startedAt"], let ms = Double(raw) {
            return Date(timeIntervalSince1970: ms / 1000.0)
        }
        return Date()
    }

    var isPaused: Bool {
        state.values["isPaused"] == "1"
    }

    var distanceText: String {
        let meters = Double(state.values["distanceMeters"] ?? "0") ?? 0
        let km = meters / 1000.0
        return String(format: "%.2f km", km)
    }

    var paceText: String {
        let raw = state.values["paceString"] ?? ""
        return raw.isEmpty ? "--:-- /km" : raw
    }
}

@available(iOS 16.2, *)
struct HIITWorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: GenericAttributes.self) { context in
            HIITLockScreenView(model: WorkoutView(state: context.state, attributes: context.attributes))
                .padding(16)
                .activityBackgroundTint(Color.black)
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            let model = WorkoutView(state: context.state, attributes: context.attributes)

            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "flame.fill").foregroundColor(HIITPalette.primary)
                        Text(model.workoutTitle)
                            .font(.headline)
                            .foregroundColor(.white)
                            .lineLimit(1)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(model.distanceText)
                            .font(.headline.monospacedDigit())
                            .foregroundColor(.white)
                        Text("Distance")
                            .font(.caption2)
                            .foregroundColor(HIITPalette.dim)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Pace")
                                .font(.caption2)
                                .foregroundColor(HIITPalette.dim)
                            Text(model.paceText)
                                .font(.headline.monospacedDigit())
                                .foregroundColor(.white)
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("Elapsed")
                                .font(.caption2)
                                .foregroundColor(HIITPalette.dim)
                            if model.isPaused {
                                Text("Paused")
                                    .font(.headline.monospacedDigit())
                                    .foregroundColor(HIITPalette.dim)
                            } else {
                                Text(timerInterval: model.startedAt...Date.distantFuture, countsDown: false)
                                    .font(.headline.monospacedDigit())
                                    .foregroundColor(.white)
                                    .multilineTextAlignment(.trailing)
                            }
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "flame.fill").foregroundColor(HIITPalette.primary)
            } compactTrailing: {
                if model.isPaused {
                    Image(systemName: "pause.fill").foregroundColor(HIITPalette.dim)
                } else {
                    Text(timerInterval: model.startedAt...Date.distantFuture, countsDown: false)
                        .font(.caption2.monospacedDigit())
                        .foregroundColor(.white)
                        .frame(maxWidth: 50)
                }
            } minimal: {
                Image(systemName: "flame.fill").foregroundColor(HIITPalette.primary)
            }
            .keylineTint(HIITPalette.primary)
        }
    }
}

@available(iOS 16.2, *)
private struct HIITLockScreenView: View {
    let model: WorkoutView

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: "flame.fill")
                    .foregroundColor(HIITPalette.primary)
                    .font(.headline)
                Text(model.workoutTitle)
                    .font(.headline)
                    .foregroundColor(.white)
                Spacer()
                if model.isPaused {
                    HStack(spacing: 4) {
                        Image(systemName: "pause.fill")
                        Text("Paused")
                    }
                    .font(.caption.bold())
                    .foregroundColor(HIITPalette.dim)
                } else {
                    HStack(spacing: 4) {
                        Image(systemName: "play.fill")
                        Text("Live")
                    }
                    .font(.caption.bold())
                    .foregroundColor(HIITPalette.primary)
                }
            }

            HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Elapsed")
                        .font(.caption2)
                        .foregroundColor(HIITPalette.dim)
                    if model.isPaused {
                        Text("Paused")
                            .font(.title2.monospacedDigit().bold())
                            .foregroundColor(HIITPalette.dim)
                    } else {
                        Text(timerInterval: model.startedAt...Date.distantFuture, countsDown: false)
                            .font(.title2.monospacedDigit().bold())
                            .foregroundColor(.white)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Distance")
                        .font(.caption2)
                        .foregroundColor(HIITPalette.dim)
                    Text(model.distanceText)
                        .font(.title2.monospacedDigit().bold())
                        .foregroundColor(.white)
                }
            }

            HStack {
                Text("Pace")
                    .font(.caption2)
                    .foregroundColor(HIITPalette.dim)
                Spacer()
                Text(model.paceText)
                    .font(.body.monospacedDigit().bold())
                    .foregroundColor(HIITPalette.primary)
            }
        }
    }
}
