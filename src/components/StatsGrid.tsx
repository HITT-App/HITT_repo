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
                "bg-background border border-border/60 rounded-xl p-4 shadow-card",
                "opacity-0 animate-fade-up",
                "active:opacity-80 transition-opacity duration-150 touch-manipulation"
              )}
              style={{ 
                animationDelay: `${0.3 + index * 0.05}s`, 
                animationFillMode: "forwards" 
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-semibold text-foreground tracking-tight">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
                <Icon size={20} className="text-muted-foreground" strokeWidth={1.5} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
