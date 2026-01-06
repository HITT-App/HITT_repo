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
    <div className="px-4 mt-6 pb-32">
      {/* Section Header */}
      <div 
        className="flex items-center justify-between mb-4 opacity-0 animate-fade-up"
        style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
      >
        <h2 className="text-lg font-semibold text-foreground">Today&apos;s Workouts</h2>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 p-0">
          See All <ChevronRight size={16} />
        </Button>
      </div>

      {/* Workout Cards */}
      <div className="space-y-3">
        {workouts.map((workout, index) => (
          <div
            key={workout.id}
            className={cn(
              "relative overflow-hidden rounded-2xl p-4",
              "bg-gradient-to-r",
              workout.color,
              "border border-border/30",
              "opacity-0 animate-fade-up",
              "hover:scale-[1.02] transition-transform duration-300 cursor-pointer"
            )}
            style={{ 
              animationDelay: `${0.8 + index * 0.1}s`, 
              animationFillMode: "forwards" 
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">{workout.title}</h3>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {workout.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame size={12} />
                    {workout.calories}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium",
                    workout.intensity === "High" 
                      ? "bg-red-500/20 text-red-400" 
                      : "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {workout.intensity}
                  </span>
                </div>
              </div>
              <button className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-glow hover:scale-110 transition-transform">
                <Play size={20} fill="currentColor" className="text-primary-foreground ml-0.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
