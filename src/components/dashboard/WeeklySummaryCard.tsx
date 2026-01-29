import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Dumbbell, Flame, Clock, X } from "lucide-react";
import { startOfWeek, endOfWeek, subWeeks, format } from "date-fns";
import { cn } from "@/lib/utils";

interface WeeklyStats {
  workouts: number;
  calories: number;
  minutes: number;
}

interface WeeklySummaryCardProps {
  onDismiss?: () => void;
}

export function WeeklySummaryCard({ onDismiss }: WeeklySummaryCardProps) {
  const { user } = useAuth();
  const [thisWeek, setThisWeek] = useState<WeeklyStats>({ workouts: 0, calories: 0, minutes: 0 });
  const [lastWeek, setLastWeek] = useState<WeeklyStats>({ workouts: 0, calories: 0, minutes: 0 });
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Only show on Monday
    const today = new Date();
    if (today.getDay() !== 1) {
      setDismissed(true);
      return;
    }

    // Check if already dismissed this week
    const dismissedKey = `weekly_summary_dismissed_${format(today, "yyyy-ww")}`;
    if (localStorage.getItem(dismissedKey)) {
      setDismissed(true);
      return;
    }

    const fetchWeeklyStats = async () => {
      try {
        const now = new Date();
        const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        const twoWeeksAgoStart = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
        const twoWeeksAgoEnd = endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });

        // Get last week's workout data
        const { data: lastWeekData } = await supabase
          .from("workout_progress")
          .select("duration_seconds, calories_burned")
          .eq("user_id", user.id)
          .not("completed_at", "is", null)
          .gte("completed_at", lastWeekStart.toISOString())
          .lte("completed_at", lastWeekEnd.toISOString());

        // Get two weeks ago data
        const { data: twoWeeksAgoData } = await supabase
          .from("workout_progress")
          .select("duration_seconds, calories_burned")
          .eq("user_id", user.id)
          .not("completed_at", "is", null)
          .gte("completed_at", twoWeeksAgoStart.toISOString())
          .lte("completed_at", twoWeeksAgoEnd.toISOString());

        if (lastWeekData) {
          setThisWeek({
            workouts: lastWeekData.length,
            calories: lastWeekData.reduce((acc, w: any) => acc + (w.calories_burned || 0), 0),
            minutes: Math.floor(lastWeekData.reduce((acc, w: any) => acc + (w.duration_seconds || 0), 0) / 60),
          });
        }

        if (twoWeeksAgoData) {
          setLastWeek({
            workouts: twoWeeksAgoData.length,
            calories: twoWeeksAgoData.reduce((acc, w: any) => acc + (w.calories_burned || 0), 0),
            minutes: Math.floor(twoWeeksAgoData.reduce((acc, w: any) => acc + (w.duration_seconds || 0), 0) / 60),
          });
        }
      } catch (error) {
        console.error("Error fetching weekly stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyStats();
  }, [user]);

  const handleDismiss = () => {
    const today = new Date();
    const dismissedKey = `weekly_summary_dismissed_${format(today, "yyyy-ww")}`;
    localStorage.setItem(dismissedKey, "true");
    setDismissed(true);
    onDismiss?.();
  };

  const getChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-accent" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-accent";
    if (change < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  if (loading || dismissed) {
    return null;
  }

  const workoutChange = getChange(thisWeek.workouts, lastWeek.workouts);
  const caloriesChange = getChange(thisWeek.calories, lastWeek.calories);
  const minutesChange = getChange(thisWeek.minutes, lastWeek.minutes);

  return (
    <div className="mx-4 mb-4">
      <div className="bg-gradient-to-br from-card via-primary/5 to-card border border-border/60 rounded-2xl p-4 relative">
        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">Last Week's Recap</h3>
          <p className="text-xs text-muted-foreground">
            {format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "MMM d")} -{" "}
            {format(endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), "MMM d")}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Workouts */}
          <div className="bg-card/80 rounded-xl p-3 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Dumbbell className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xl font-bold text-foreground">{thisWeek.workouts}</p>
            <p className="text-xs text-muted-foreground mb-1">workouts</p>
            <div className="flex items-center justify-center gap-1">
              {getTrendIcon(workoutChange)}
              <span className={cn("text-xs font-medium", getTrendColor(workoutChange))}>
                {workoutChange > 0 ? "+" : ""}
                {workoutChange}%
              </span>
            </div>
          </div>

          {/* Calories */}
          <div className="bg-card/80 rounded-xl p-3 text-center">
            <div className="w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center mx-auto mb-2">
              <Flame className="w-4 h-4 text-secondary-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">{thisWeek.calories.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mb-1">calories</p>
            <div className="flex items-center justify-center gap-1">
              {getTrendIcon(caloriesChange)}
              <span className={cn("text-xs font-medium", getTrendColor(caloriesChange))}>
                {caloriesChange > 0 ? "+" : ""}
                {caloriesChange}%
              </span>
            </div>
          </div>

          {/* Minutes */}
          <div className="bg-card/80 rounded-xl p-3 text-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold text-foreground">{thisWeek.minutes}</p>
            <p className="text-xs text-muted-foreground mb-1">minutes</p>
            <div className="flex items-center justify-center gap-1">
              {getTrendIcon(minutesChange)}
              <span className={cn("text-xs font-medium", getTrendColor(minutesChange))}>
                {minutesChange > 0 ? "+" : ""}
                {minutesChange}%
              </span>
            </div>
          </div>
        </div>

        {/* Encouragement message */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          {workoutChange > 0
            ? "🎉 Great progress! Keep the momentum going this week!"
            : workoutChange < 0
            ? "💪 This week is a new opportunity to crush your goals!"
            : "📊 Consistency is key. Let's make this week count!"}
        </p>
      </div>
    </div>
  );
}
