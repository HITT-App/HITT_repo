import SwiftUI

private let hiitOrange = Color(red: 1, green: 0.541, blue: 0.149)
private let hiitGold   = Color(red: 1, green: 0.690, blue: 0.125)
private let hiitGreen  = Color(red: 0.357, green: 0.890, blue: 0.627)
private let dimText    = Color(white: 0.541)

// Celebration screen shown after a workout ends
struct CompletionView: View {
    let elapsedSeconds: Int
    let calories: Int
    let workoutName: String
    let onDone: () -> Void

    @State private var confetti: [(x: Double, y: Double, color: Color, size: Double)] = []

    var body: some View {
        ZStack {
            RadialGradient(
                gradient: Gradient(colors: [hiitOrange.opacity(0.2), .clear]),
                center: .center, startRadius: 10, endRadius: 100
            )
            .ignoresSafeArea()

            // Confetti dots
            ForEach(0..<confetti.count, id: \.self) { i in
                Circle()
                    .fill(confetti[i].color)
                    .frame(width: confetti[i].size, height: confetti[i].size)
                    .shadow(color: confetti[i].color.opacity(0.8), radius: 3)
                    .position(x: confetti[i].x, y: confetti[i].y)
            }

            VStack(spacing: 6) {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 26))
                    .foregroundColor(hiitGold)
                    .shadow(color: hiitGold.opacity(0.6), radius: 6)
                    .padding(.top, 12)

                Text("NICE WORK")
                    .font(.system(size: 12, weight: .black))
                    .tracking(1.5)
                    .foregroundColor(hiitGold)

                Text("\(workoutName) done")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)

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
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(hiitOrange)
                        .cornerRadius(22)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 14)
                .padding(.bottom, 12)
            }
        }
        .onAppear {
            generateConfetti()
        }
    }

    private func generateConfetti() {
        let colors: [Color] = [hiitOrange, hiitGold, hiitGreen, .pink, .cyan, Color(hex:"#A78BFA")]
        confetti = (0..<12).map { _ in
            (
                x: Double.random(in: 20...160),
                y: Double.random(in: 20...200),
                color: colors.randomElement()!,
                size: Double.random(in: 4...7)
            )
        }
    }
}

private func timeFormatted(_ s: Int) -> String {
    String(format: "%d:%02d", s / 60, s % 60)
}
