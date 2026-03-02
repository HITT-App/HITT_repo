import { TrendingUp, Flame, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const StatsGrid = () => {
  const { user } = useAuth();
  const { streak } = useStreaksAndBadges();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const { data: progressData } = await supabase
        .from('workout_progress')
        .select('duration_seconds, workout_id')
        .eq('user_id', user.id);

      if (progressData) {
        const totalSecs = progressData.reduce((acc, p) => acc + (p.duration_seconds || 0), 0);
        setTotalMinutes(Math.floor(totalSecs / 60));
        setWorkoutCount(progressData.length);
        setTotalCalories(Math.floor(totalSecs / 60 * 7));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const stats = [
    { 
      id: "calories", 
      icon: Flame, 
      value: totalCalories > 0 ? totalCalories.toLocaleString() : "0", 
      label: "Calories",
      accent: "from-orange-500 to-amber-400",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500",
    },
    { 
      id: "workouts", 
      icon: Target, 
      value: workoutCount.toString(), 
      label: "Workouts",
      accent: "from-primary to-primary/70",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    { 
      id: "minutes", 
      icon: Clock, 
      value: totalMinutes.toString(), 
      label: "Minutes",
      accent: "from-blue-500 to-cyan-400",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500",
    },
    { 
      id: "streak", 
      icon: TrendingUp, 
      value: streak?.current_streak?.toString() || "0", 
      label: "Day Streak",
      accent: "from-emerald-500 to-green-400",
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <div className="px-4 -mt-14 relative z-10">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              className={cn(
                "relative overflow-hidden",
                "bg-white/80 dark:bg-white/10",
                "backdrop-blur-xl backdrop-saturate-150",
                "border border-white/50 dark:border-white/15",
                "rounded-2xl p-4",
                "shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
                "opacity-0 animate-fade-up",
                "active:scale-[0.97] transition-all duration-200 touch-manipulation"
              )}
              style={{ 
                animationDelay: `${0.3 + index * 0.05}s`, 
                animationFillMode: "forwards" 
              }}
            >
              {/* Accent bar */}
              <div className={cn("absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r", stat.accent)} />
              
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-foreground tracking-tight tabular-nums">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.iconBg)}>
                  <Icon size={20} className={stat.iconColor} strokeWidth={1.8} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
