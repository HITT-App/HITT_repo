import { ChevronRight, Play, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const workouts = [
  {
    id: 1,
    title: "Morning HIIT Blast",
    duration: "25 min",
    calories: "320 cal",
    intensity: "High",
    color: "from-orange-500/20 to-red-500/20",
  },
  {
    id: 2,
    title: "Core Crusher",
    duration: "15 min",
    calories: "180 cal",
    intensity: "Medium",
    color: "from-blue-500/20 to-purple-500/20",
  },
  {
    id: 3,
    title: "Full Body Burn",
    duration: "30 min",
    calories: "400 cal",
    intensity: "High",
    color: "from-green-500/20 to-teal-500/20",
  },
];

export const TodaysWorkouts = () => {
  return (
    <div className="px-3 sm:px-4 mt-4 sm:mt-6 pb-28 sm:pb-32">
      {/* Section Header */}
      <div 
        className="flex items-center justify-between mb-3 sm:mb-4 opacity-0 animate-fade-up"
        style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
      >
        <h2 className="text-base sm:text-lg font-semibold text-foreground">Today&apos;s Workouts</h2>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary/80 p-0 min-h-[44px] touch-manipulation"
        >
          See All <ChevronRight size={16} />
        </Button>
      </div>

      {/* Workout Cards */}
      <div className="space-y-2.5 sm:space-y-3">
        {workouts.map((workout, index) => (
          <div
            key={workout.id}
            className={cn(
              "relative overflow-hidden rounded-xl sm:rounded-2xl p-3 sm:p-4",
              "bg-gradient-to-r",
              workout.color,
              "border border-border/30",
              "opacity-0 animate-fade-up",
              "active:scale-[0.98] sm:hover:scale-[1.02] transition-transform duration-300 cursor-pointer touch-manipulation"
            )}
            style={{ 
              animationDelay: `${0.8 + index * 0.1}s`, 
              animationFillMode: "forwards" 
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1.5 sm:mb-2 text-sm sm:text-base truncate">
                  {workout.title}
                </h3>
                <div className="flex items-center flex-wrap gap-2 sm:gap-4 text-[10px] sm:text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={10} className="sm:w-3 sm:h-3" />
                    {workout.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame size={10} className="sm:w-3 sm:h-3" />
                    {workout.calories}
                  </span>
                  <span className={cn(
                    "px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium",
                    workout.intensity === "High" 
                      ? "bg-red-500/20 text-red-400" 
                      : "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {workout.intensity}
                  </span>
                </div>
              </div>
              <button 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary flex items-center justify-center shadow-glow active:scale-95 sm:hover:scale-110 transition-transform flex-shrink-0 touch-manipulation"
                aria-label={`Start ${workout.title}`}
              >
                <Play size={18} fill="currentColor" className="text-primary-foreground ml-0.5 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
