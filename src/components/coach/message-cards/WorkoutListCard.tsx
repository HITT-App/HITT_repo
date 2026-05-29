import { Play, ChevronRight, Clock } from 'lucide-react';

interface Workout {
  id: string;
  title: string;
  duration: string;
  category: string;
  imageUrl?: string;
}

interface WorkoutListCardProps {
  workouts?: Workout[];
}

const defaultWorkouts: Workout[] = [
  { id: '1', title: 'Kickboxing 101: Learn The Basics', duration: '20min', category: 'Upper Body' },
  { id: '2', title: 'Build Strength With Kettlebells', duration: '25min', category: 'Lower Body' },
  { id: '3', title: 'Yoga & Mindfulness For Beginners', duration: '20min', category: 'HIIT' },
];

export function WorkoutListCard({ workouts = defaultWorkouts }: WorkoutListCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Workouts List</span>
      </div>

      <div className="space-y-3">
        {workouts.map((workout) => (
          <div 
            key={workout.id}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center flex-shrink-0">
              {workout.imageUrl ? (
                <img src={workout.imageUrl} alt={workout.title} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Play className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground truncate">{workout.title}</h4>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{workout.duration}</span>
                <span>•</span>
                <span>{workout.category}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          </div>
        ))}
      </div>

    </div>
  );
}
