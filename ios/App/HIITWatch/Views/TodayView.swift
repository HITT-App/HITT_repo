import SwiftUI

struct TodayView: View {
    @EnvironmentObject var sessionManager: WatchSessionManager
    @EnvironmentObject var workoutManager: WorkoutManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "bolt.fill")
                        .foregroundColor(.yellow)
                    Text("Today")
                        .font(.headline)
                }

                if let workout = sessionManager.todayWorkout {
                    Text(workout.name)
                        .font(.title3.bold())
                        .foregroundColor(.white)

                    Text("\(workout.durationMinutes) min")
                        .font(.caption)
                        .foregroundColor(.gray)

                    ForEach(workout.exercises.prefix(4)) { exercise in
                        HStack {
                            Circle()
                                .fill(Color.yellow)
                                .frame(width: 6, height: 6)
                            Text(exercise.name)
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(exercise.setsRepsLabel)
                                .font(.caption2)
                                .foregroundColor(.gray)
                        }
                    }

                    if workout.exercises.count > 4 {
                        Text("+\(workout.exercises.count - 4) more")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }

                    Button(action: { workoutManager.startWorkout(workout) }) {
                        Label("Start", systemImage: "play.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.yellow)
                    .foregroundColor(.black)
                    .padding(.top, 4)
                } else {
                    VStack(spacing: 6) {
                        Image(systemName: "moon.zzz.fill")
                            .font(.title2)
                            .foregroundColor(.gray)
                        Text("No workout\nscheduled today")
                            .font(.caption)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 12)
                }
            }
            .padding()
        }
    }
}
