import { Target, Droplets, Moon, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Goal {
  id: string;
  icon: 'steps' | 'hydration' | 'sleep';
  title: string;
  current: number;
  target: number;
  unit: string;
  status: 'completed' | 'in_progress';
}

interface GoalProgressCardProps {
  goals?: Goal[];
}

const defaultGoals: Goal[] = [
  { id: '1', icon: 'steps', title: 'Steps', current: 3350, target: 5000, unit: 'weekly goal', status: 'in_progress' },
  { id: '2', icon: 'hydration', title: 'Hydration', current: 6350, target: 10000, unit: 'ml weekly goal', status: 'in_progress' },
  { id: '3', icon: 'sleep', title: 'Sleep', current: 49, target: 50, unit: 'h weekly goal', status: 'completed' },
];

const iconMap = {
  steps: Target,
  hydration: Droplets,
  sleep: Moon,
};

export function GoalProgressCard({ goals = defaultGoals }: GoalProgressCardProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Goal Progress</span>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => {
          const Icon = iconMap[goal.icon];
          const progress = Math.min((goal.current / goal.target) * 100, 100);
          
          return (
            <div key={goal.id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{goal.title}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {goal.current.toLocaleString()} {goal.unit}
                  </span>
                  <span className="text-xs text-primary">
                    • {progress.toFixed(0)}% Done
                  </span>
                </div>
                {goal.status === 'completed' && (
                  <span className="text-xs text-green-600">• Completed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button 
        onClick={() => navigate('/health-metrics')}
        className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline"
      >
        View Goals
      </button>
    </div>
  );
}
