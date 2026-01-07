import { useNavigate } from 'react-router-dom';
import { Dumbbell, Utensils, Moon, Target, ChevronRight } from 'lucide-react';

const recommendations = [
  {
    id: 'workout',
    icon: Dumbbell,
    title: 'Today\'s Workout',
    subtitle: 'Upper Body Strength',
    duration: '45 min',
    color: 'bg-orange-500',
    path: '/workouts',
  },
  {
    id: 'nutrition',
    icon: Utensils,
    title: 'Meal Plan',
    subtitle: 'High Protein Day',
    duration: '2,400 cal',
    color: 'bg-green-500',
    path: '/nutrition',
  },
  {
    id: 'recovery',
    icon: Moon,
    title: 'Recovery',
    subtitle: 'Stretching Session',
    duration: '15 min',
    color: 'bg-indigo-500',
    path: '/sleep',
  },
  {
    id: 'goal',
    icon: Target,
    title: 'Weekly Goal',
    subtitle: '4/5 Workouts Done',
    duration: '80%',
    color: 'bg-primary',
    path: '/activity',
  },
];

export function RecommendationsSection() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <button className="text-sm text-primary font-medium">See All</button>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <button
            key={rec.id}
            onClick={() => navigate(rec.path)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:bg-secondary/50 transition-colors"
          >
            <div className={`w-12 h-12 rounded-xl ${rec.color} flex items-center justify-center shrink-0`}>
              <rec.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">{rec.title}</p>
              <p className="text-sm text-muted-foreground">{rec.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">{rec.duration}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
