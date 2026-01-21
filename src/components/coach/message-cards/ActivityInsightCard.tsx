import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Dumbbell, Flame, Activity } from 'lucide-react';

const activities = [
  { id: 1, name: 'Weightlifting', count: 16, icon: Dumbbell, highlight: true },
  { id: 2, name: 'Cardio', count: 14, icon: Flame },
  { id: 3, name: 'Jogging', count: 12, icon: Activity },
  { id: 4, name: 'Cycling', count: 10, icon: Activity },
  { id: 5, name: 'Walking', count: 8, icon: Activity },
  { id: 6, name: 'Swimming', count: 5, icon: Activity },
  { id: 7, name: 'Martial Arts', count: 3, icon: Activity },
  { id: 8, name: 'Rowing', count: 2, icon: Activity },
  { id: 9, name: 'Yoga', count: 1, icon: Activity },
];

export function ActivityInsightCard() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {activities.map((activity) => (
            <button
              key={activity.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
                activity.highlight
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <activity.icon className="w-3 h-3" />
              <span>{activity.name}</span>
              <span className="text-xs opacity-70">({activity.count}x)</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
