import SwiftUI

private let hiitOrange = Color(red: 1,     green: 0.541, blue: 0.149)
private let hiitGold   = Color(red: 1,     green: 0.752, blue: 0.180)
private let hiitGreen  = Color(red: 0.357, green: 0.890, blue: 0.627)
private let hiitRed    = Color(red: 1,     green: 0.271, blue: 0.227)
private let dimText    = Color(white: 0.541)
private let dimText2   = Color(white: 0.35)

enum CompletionVariant {
    case celebrate(elapsedSeconds: Int, calories: Int, workoutName: String)
    case streak(days: Int, workoutName: String)
    case personalBest(activityName: String, time: String, improvement: String)
}

struct CompletionView: View {
    let variant: CompletionVariant
    let onDone: () -> Void
    /// Optional — when set, surfaces a "Share to phone" button alongside Save.
    /// Tapping it hands off to the iPhone HITT app to render the share card.
    var onShare: (() -> Void)? = nil

    var body: some View {
        switch variant {
        case let .celebrate(elapsed, cals, name):
            CelebrateScreen(elapsedSeconds: elapsed, calories: cals, workoutName: name, onDone: onDone, onShare: onShare)
        case let .streak(days, _):
            StreakScreen(days: days, onDone: onDone)
        case let .personalBest(activity, time, improvement):
            PRScreen(activityName: activity, time: time, improvement: improvement, onDone: onDone, onShare: onShare)
        }
    }
}

// MARK: - Celebrate (standard completion)

private struct CelebrateScreen: View {
    let elapsedSeconds: Int
    let calories: Int
    let workoutName: String
    let onDone: () -> Void
    var onShare: (() -> Void)? = nil

    @State private var confetti: [(x: Double, y: Double, color: Color, size: Double)] = []
    @State private var shareTapped: Bool = false

    var body: some View {
        ZStack {
            RadialGradient(
                gradient: Gradient(colors: [hiitOrange.opacity(0.2), .clear]),
                center: .center, startRadius: 10, endRadius: 100
            ).ignoresSafeArea()

            ForEach(0..<confetti.count, id: \.self) { i in
                Circle()
                    .fill(confetti[i].color)
                    .frame(width: confetti[i].size, height: confetti[i].size)
                    .shadow(color: confetti[i].color.opacity(0.8), radius: 3)
                    .position(x: confetti[i].x, y: confetti[i].y)
            }

            VStack(spacing: 6) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 26)).foregroundColor(hiitGold)
                    .shadow(color: hiitGold.opacity(0.6), radius: 6)
                    .padding(.top, 12)

                Text("NICE WORK")
                    .font(.system(size: 12, weight: .black)).tracking(1.5).foregroundColor(hiitGold)

                Text("\(workoutName) done")
                    .font(.system(size: 14, weight: .bold)).foregroundColor(.white)

                HStack(spacing: 16) {
                    VStack(spacing: 2) {
                        Text(timeFormatted(elapsedSeconds))
                            .font(.system(size: 20, weight: .black, design: .monospaced))
                            .foregroundColor(.white)
                        Text("TIME").font(.system(size: 8, weight: .semibold)).foregroundColor(dimText)
                    }
                    VStack(spacing: 2) {
                        Text("\(calories)")
                            .font(.system(size: 20, weight: .black, design: .monospaced))
                            .foregroundColor(hiitOrange)
                        Text("CAL").font(.system(size: 8, weight: .semibold)).foregroundColor(dimText)
                    }
                }
                .padding(.vertical, 4)

                Button(action: onDone) {
                    Text("Save")
                        .font(.system(size: 14, weight: .bold)).foregroundColor(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(hiitOrange).cornerRadius(22)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 14)

                if let onShare = onShare {
                    Button(action: {
                        onShare()
                        shareTapped = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: shareTapped ? "checkmark" : "square.and.arrow.up")
                                .font(.system(size: 11, weight: .semibold))
                            Text(shareTapped ? "Opening on phone" : "Share to phone")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 8)
                        .background(Color.white.opacity(0.12)).cornerRadius(18)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 14).padding(.top, 4).padding(.bottom, 12)
                    .disabled(shareTapped)
                } else {
                    Spacer().frame(height: 12)
                }
            }
        }
        .onAppear { generateConfetti() }
    }

    private func generateConfetti() {
        let colors: [Color] = [hiitOrange, hiitGold, hiitGreen, .pink,
                               Color(red: 0, green: 0.8, blue: 1), Color(red: 0.655, green: 0.545, blue: 0.980)]
        confetti = (0..<12).map { _ in
            (x: Double.random(in: 20...160), y: Double.random(in: 20...200),
             color: colors.randomElement()!, size: Double.random(in: 4...7))
        }
    }
}

// MARK: - Streak completion

private struct StreakScreen: View {
    let days: Int
    let onDone: () -> Void

    private let weekDays = ["M", "T", "W", "T", "F", "S", "S"]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 0) {
                TopLabel("\(days)-DAY STREAK", color: hiitGold)
                    .padding(.bottom, 4)

                Image(systemName: "flame.fill")
                    .font(.system(size: 44)).foregroundColor(Color(red: 1, green: 0.541, blue: 0.149))
                    .padding(.top, 8)

                Text("You did it!")
                    .font(.system(size: 20, weight: .black)).foregroundColor(.white)
                    .padding(.top, 6)
                Text("Best streak this year")
                    .font(.system(size: 11)).foregroundColor(dimText)

                // Week pills
                HStack(spacing: 4) {
                    ForEach(0..<7, id: \.self) { i in
                        VStack(spacing: 3) {
                            RoundedRectangle(cornerRadius: 5)
                                .fill(i == 6 ? hiitOrange : i < 6 ? hiitOrange.opacity(0.6) : Color.white.opacity(0.08))
                                .shadow(color: i == 6 ? hiitOrange.opacity(0.4) : .clear, radius: 4)
                                .frame(height: 24)
                            Text(weekDays[i])
                                .font(.system(size: 8, weight: .bold))
                                .foregroundColor(i == 6 ? .white : dimText2)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
                .padding(.horizontal, 12).padding(.top, 14)

                Spacer(minLength: 6)

                Button(action: onDone) {
                    Text("Save & share")
                        .font(.system(size: 14, weight: .black)).foregroundColor(Color(red: 0.1, green: 0.04, blue: 0.0))
                        .frame(maxWidth: .infinity).padding(.vertical, 11)
                        .background(hiitOrange).cornerRadius(22)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 14).padding(.bottom, 12)
            }
        }
    }
}

// MARK: - Personal best completion

private struct PRScreen: View {
    let activityName: String
    let time: String
    let improvement: String
    let onDone: () -> Void
    var onShare: (() -> Void)? = nil

    @State private var shareTapped: Bool = false

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [hiitGreen.opacity(0.18), .clear]),
                startPoint: .top, endPoint: .center
            ).ignoresSafeArea()

            VStack(spacing: 0) {
                TopLabel("PERSONAL BEST", color: hiitGreen)

                Image(systemName: "medal.fill")
                    .font(.system(size: 40)).foregroundColor(hiitGreen)
                    .padding(.top, 10)

                Text(activityName)
                    .font(.system(size: 16, weight: .black)).foregroundColor(.white)
                    .padding(.top, 4)

                Text(time)
                    .font(.system(size: 40, weight: .black, design: .monospaced))
                    .foregroundColor(hiitGreen)
                    .padding(.top, 6)

                HStack(spacing: 4) {
                    Text("↓").font(.system(size: 13))
                    Text(improvement)
                        .font(.system(size: 11, weight: .bold))
                }
                .foregroundColor(hiitGreen)
                .padding(.top, 4)

                Spacer(minLength: 6)

                Button(action: onDone) {
                    Text("Save PR")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(Color(red: 0.04, green: 0.1, blue: 0.07))
                        .frame(maxWidth: .infinity).padding(.vertical, 10)
                        .background(hiitGreen).cornerRadius(20)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 14)

                if let onShare = onShare {
                    Button(action: {
                        onShare()
                        shareTapped = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: shareTapped ? "checkmark" : "square.and.arrow.up")
                                .font(.system(size: 11, weight: .semibold))
                            Text(shareTapped ? "Opening on phone" : "Share to phone")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 8)
                        .background(Color.white.opacity(0.12)).cornerRadius(18)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 14).padding(.top, 4).padding(.bottom, 12)
                    .disabled(shareTapped)
                } else {
                    Spacer().frame(height: 12)
                }
            }
        }
    }
}

private func timeFormatted(_ s: Int) -> String {
    String(format: "%d:%02d", s / 60, s % 60)
}
