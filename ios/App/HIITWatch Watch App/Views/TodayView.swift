import SwiftUI

// HIIT brand orange — matches hsl(24, 95%, 53%) from the main app
private let hiitOrange = Color(red: 0.976, green: 0.451, blue: 0.086)

struct TodayView: View {
    @State private var workout: WatchWorkout? = nil

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {

                // Header
                HStack(spacing: 6) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(hiitOrange)
                        .frame(width: 4, height: 18)
                    Text("TODAY")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(hiitOrange)
                        .tracking(1.5)
                    Spacer()
                }

                if let w = workout {
                    // Workout title card
                    VStack(alignment: .leading, spacing: 4) {
                        Text(w.name)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        HStack(spacing: 8) {
                            Label("\(w.durationMinutes) min", systemImage: "clock")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                            Text("·").foregroundColor(.gray)
                            Label("\(w.exercises.count) exercises", systemImage: "list.bullet")
                                .font(.system(size: 11))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white.opacity(0.08))
                    .cornerRadius(12)

                    // Exercise list
                    VStack(spacing: 6) {
                        ForEach(Array(w.exercises.prefix(5).enumerated()), id: \.element.id) { i, ex in
                            HStack(spacing: 8) {
                                Text("\(i + 1)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(hiitOrange)
                                    .frame(width: 16)
                                Text(ex.name)
                                    .font(.system(size: 12))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                Spacer()
                                if !ex.setsRepsLabel.isEmpty {
                                    Text(ex.setsRepsLabel)
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(hiitOrange)
                                }
                            }
                        }
                        if w.exercises.count > 5 {
                            Text("+ \(w.exercises.count - 5) more")
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.leading, 24)
                        }
                    }
                    .padding(10)
                    .background(Color.white.opacity(0.05))
                    .cornerRadius(12)

                    // Start button
                    Button(action: { WorkoutManager.shared.start(w) }) {
                        HStack {
                            Image(systemName: "play.fill").font(.system(size: 12))
                            Text("START WORKOUT")
                                .font(.system(size: 12, weight: .bold))
                                .tracking(0.8)
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(hiitOrange)
                        .cornerRadius(20)
                    }
                    .buttonStyle(.plain)

                } else {
                    VStack(spacing: 10) {
                        Image(systemName: "moon.zzz.fill")
                            .font(.system(size: 28))
                            .foregroundColor(hiitOrange.opacity(0.5))
                        Text("Rest Day")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        Text("No workout scheduled")
                            .font(.system(size: 11))
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
        }
        .onReceive(NotificationCenter.default.publisher(for: .watchWorkoutReceived)) { note in
            workout = note.object as? WatchWorkout
        }
        .onAppear {
            workout = WatchSessionManager.shared.todayWorkout
        }
    }
}
