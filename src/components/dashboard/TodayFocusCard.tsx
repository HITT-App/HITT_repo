import { useEffect, useState } from "react";
import { ActivityRings } from "@/components/ActivityRings";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { Button } from "@/components/ui/button";
import { Flame, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useUserLevel } from "@/hooks/useUserLevel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TodayFocusCardProps {
  userName: string;
}

export function TodayFocusCard({ userName }: TodayFocusCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { streak } = useStreaksAndBadges();
  const { userLevel } = useUserLevel();
  const [todayStats, setTodayStats] = useState({
    calories: 0,
    exerciseMinutes: 0,
    standHours: 0,
  });
  const [contextMessage, setContextMessage] = useState("");

  // Fetch today's activity stats
  useEffect(() => {
    if (!user) return;

    const fetchTodayStats = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Get today's workout progress
      const { data: workoutData } = await supabase
        .from("workout_progress")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (workoutData) {
        const totalSeconds = workoutData.reduce((acc, w) => acc + (w.duration_seconds || 0), 0);
        const exerciseMinutes = Math.floor(totalSeconds / 60);
        const calories = Math.floor(totalSeconds / 60 * 7); // Estimate 7 cal/min
        
        setTodayStats({
          calories,
          exerciseMinutes,
          standHours: Math.min(Math.floor(exerciseMinutes / 5), 12), // Estimate
        });
      }
    };

    fetchTodayStats();
  }, [user]);

  // Generate contextual message
  useEffect(() => {
    const lastWorkoutDate = streak?.last_workout_date;
    const currentStreak = streak?.current_streak || 0;
    const today = format(new Date(), "yyyy-MM-dd");
    const hour = new Date().getHours();

    if (lastWorkoutDate === today) {
      setContextMessage("Great job today! Want to do more?");
    } else if (lastWorkoutDate) {
      const lastDate = new Date(lastWorkoutDate);
      const daysSince = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince === 1 && currentStreak > 0) {
        setContextMessage(`Keep your ${currentStreak}-day streak alive!`);
      } else if (daysSince > 1) {
        setContextMessage("Welcome back! Let's get moving.");
      } else {
        setContextMessage("Ready to crush it today?");
      }
    } else {
      if (hour < 12) {
        setContextMessage("Start your day with energy!");
      } else if (hour < 17) {
        setContextMessage("Perfect time for a workout.");
      } else {
        setContextMessage("End your day strong!");
      }
    }
  }, [streak]);

  const streakActive = streak?.current_streak && streak.current_streak > 0;

  return (
    <div className="mx-4 mb-4">
      <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-card">
        {/* Header with Level Badge */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Today</h2>
            <p className="text-sm text-muted-foreground">{contextMessage}</p>
          </div>
          {userLevel && (
            <LevelBadge 
              level={userLevel.level} 
              title={userLevel.title} 
              xp={userLevel.xp}
              size="sm"
            />
          )}
        </div>

        {/* Activity Rings + Stats */}
        <div className="flex items-center justify-center py-4">
          <ActivityRings
            moveProgress={todayStats.calories}
            exerciseProgress={todayStats.exerciseMinutes}
            standProgress={todayStats.standHours}
            moveGoal={500}
            exerciseGoal={30}
            standGoal={12}
            size="md"
          />
        </div>

        {/* Streak Badge */}
        {streakActive && (
          <div className="flex items-center justify-center gap-2 py-3 mb-3 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
                <Flame className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <span className="text-xl font-bold text-foreground">{streak?.current_streak}</span>
                <span className="text-sm text-muted-foreground ml-1">day streak</span>
              </div>
            </div>
            {streak?.current_streak && streak.current_streak >= 7 && (
              <Sparkles className="w-4 h-4 text-primary" />
            )}
          </div>
        )}

        {/* Primary CTA */}
        <Button
          className={cn(
            "w-full py-6 text-base font-medium rounded-xl",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "shadow-sm transition-all duration-200 active:scale-[0.98]"
          )}
          onClick={() => navigate("/workouts")}
        >
          Start Today's Workout
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
