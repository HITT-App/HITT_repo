import { TrendingUp, Flame, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const stats = [
  { 
    id: "calories", 
    icon: Flame, 
    value: "1,248", 
    label: "Calories", 
    color: "text-orange-400",
    bgColor: "bg-orange-400/10" 
  },
  { 
    id: "workouts", 
    icon: Target, 
    value: "12", 
    label: "Workouts", 
    color: "text-green-400",
    bgColor: "bg-green-400/10" 
  },
  { 
    id: "minutes", 
    icon: Clock, 
    value: "342", 
    label: "Minutes", 
    color: "text-blue-400",
    bgColor: "bg-blue-400/10" 
  },
  { 
    id: "streak", 
    icon: TrendingUp, 
    value: "7", 
    label: "Day Streak", 
    color: "text-purple-400",
    bgColor: "bg-purple-400/10" 
  },
];

export const StatsGrid = () => {
  return (
    <div className="px-3 sm:px-4 -mt-12 sm:-mt-16 relative z-10">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className={cn(
                "glass-card p-3 sm:p-4 opacity-0 animate-fade-up",
                "active:scale-[0.98] sm:hover:scale-[1.02] transition-transform duration-300 touch-manipulation"
              )}
              style={{ 
                animationDelay: `${0.5 + index * 0.1}s`, 
                animationFillMode: "forwards" 
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{stat.label}</p>
                </div>
                <div className={cn("p-1.5 sm:p-2 rounded-lg sm:rounded-xl", stat.bgColor)}>
                  <Icon size={18} className={cn(stat.color, "sm:w-5 sm:h-5")} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
