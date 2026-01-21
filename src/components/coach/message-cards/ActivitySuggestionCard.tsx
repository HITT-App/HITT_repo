import { Footprints, Bike, Flame, Clock, Star, ChevronRight } from 'lucide-react';

interface Activity {
  id: string;
  type: 'jogging' | 'cycling';
  duration: string;
  calories: number;
  distance: string;
  rating: number;
}

interface ActivitySuggestionCardProps {
  activities?: Activity[];
}

const defaultActivities: Activity[] = [
  { id: '1', type: 'jogging', duration: 'Approx 15 - 20min', calories: 250, distance: '2km', rating: 3 },
  { id: '2', type: 'cycling', duration: 'Approx 15 - 20min', calories: 250, distance: '2km', rating: 3 },
];

const iconMap = {
  jogging: Footprints,
  cycling: Bike,
};

export function ActivitySuggestionCard({ activities = defaultActivities }: ActivitySuggestionCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Footprints className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Activity Suggestion</span>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => {
          const Icon = iconMap[activity.type];
          
          return (
            <div 
              key={activity.id}
              className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl cursor-pointer hover:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground capitalize">{activity.type}</h4>
                <p className="text-xs text-muted-foreground">{activity.duration}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span>{activity.calories}cal</span>
                  </div>
                  <span>•</span>
                  <span>{activity.distance}</span>
                  <span>•</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: activity.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          );
        })}
      </div>

      <button className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline">
        See All Recommendations
      </button>
    </div>
  );
}
