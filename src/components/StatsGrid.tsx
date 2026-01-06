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
    <div className="px-4 -mt-16 relative z-10">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className={cn(
                "glass-card p-4 opacity-0 animate-fade-up",
                "hover:scale-[1.02] transition-transform duration-300"
              )}
              style={{ 
                animationDelay: `${0.5 + index * 0.1}s`, 
                animationFillMode: "forwards" 
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
                <div className={cn("p-2 rounded-xl", stat.bgColor)}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
