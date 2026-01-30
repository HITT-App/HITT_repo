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
      label: "Calories"
    },
    { 
      id: "workouts", 
      icon: Target, 
      value: workoutCount.toString(), 
      label: "Workouts"
    },
    { 
      id: "minutes", 
      icon: Clock, 
      value: totalMinutes.toString(), 
      label: "Minutes"
    },
    { 
      id: "streak", 
      icon: TrendingUp, 
      value: streak?.current_streak?.toString() || "0", 
      label: "Day Streak"
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
                // Glassmorphism effect
                "bg-white/70 dark:bg-white/10",
                "backdrop-blur-xl backdrop-saturate-150",
                "border border-white/40 dark:border-white/20",
                "rounded-2xl p-4",
                "shadow-[0_8px_32px_rgba(0,0,0,0.08)]",
                // Animation
                "opacity-0 animate-fade-up",
                "active:scale-[0.98] transition-all duration-200 touch-manipulation"
              )}
              style={{ 
                animationDelay: `${0.3 + index * 0.05}s`, 
                animationFillMode: "forwards" 
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Icon size={20} className="text-muted-foreground" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
