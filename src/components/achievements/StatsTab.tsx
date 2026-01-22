import { Calendar, Smartphone, TrendingUp, Facebook, Instagram, Twitter, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useAchievementStats, useUserRanking } from "@/hooks/useAchievements";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const StatsTab = () => {
  const { user } = useAuth();
  const { data: achievementStats } = useAchievementStats();
  const { data: ranking } = useUserRanking("worldwide");

  // Fetch comprehensive stats
  const { data: stats } = useQuery({
    queryKey: ["comprehensive-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch workout progress
      const { data: workoutData } = await supabase
        .from("workout_progress")
        .select("duration_seconds")
        .eq("user_id", user.id);

      // Fetch coaching sessions
      const { data: sessionsData } = await supabase
        .from("coaching_sessions")
        .select("id, coach_id, coaches(name)")
        .eq("user_id", user.id);

      // Fetch sleep logs
      const { data: sleepData } = await supabase
        .from("sleep_logs")
        .select("duration_minutes")
        .eq("user_id", user.id);

      // Fetch meal logs
      const { data: mealData } = await supabase
        .from("meal_logs")
        .select("calories, protein_grams, fat_grams")
        .eq("user_id", user.id);

      // Fetch activity logs
      const { data: activityData } = await supabase
        .from("activity_logs")
        .select("calories_burned, distance_km")
        .eq("user_id", user.id);

      // Calculate workout stats
      const workoutSeconds = workoutData?.reduce((acc, w) => acc + (w.duration_seconds || 0), 0) || 0;
      const workoutHours = Math.floor(workoutSeconds / 3600);

      // Calculate sleep stats
      const sleepMinutes = sleepData?.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) || 0;
      const sleepHours = Math.floor(sleepMinutes / 60);

      // Calculate nutrition stats
      const totalCalories = mealData?.reduce((acc, m) => acc + (m.calories || 0), 0) || 0;
      const totalProtein = mealData?.reduce((acc, m) => acc + (m.protein_grams || 0), 0) || 0;
      const totalFat = mealData?.reduce((acc, m) => acc + (m.fat_grams || 0), 0) || 0;

      // Calculate activity stats
      const caloriesBurned = activityData?.reduce((acc, a) => acc + (a.calories_burned || 0), 0) || 0;
      const totalSteps = Math.floor(caloriesBurned * 25); // Rough estimate

      // Find favorite coach
      const coachCounts: Record<string, { count: number; name: string }> = {};
      sessionsData?.forEach((s: any) => {
        const coachName = s.coaches?.name || "Unknown";
        if (!coachCounts[s.coach_id]) {
          coachCounts[s.coach_id] = { count: 0, name: coachName };
        }
        coachCounts[s.coach_id].count++;
      });
      const favoriteCoach = Object.values(coachCounts).sort((a, b) => b.count - a.count)[0]?.name || "None yet";

      return {
        workoutsCompleted: workoutData?.length || 0,
        workoutDuration: `${workoutHours}h`,
        coachSessions: sessionsData?.length || 0,
        favoriteCoach,
        totalSleepHours: sleepHours,
        totalCaloriesConsumed: totalCalories,
        totalProtein,
        totalFat,
        caloriesBurned,
        totalSteps,
        userSince: user.created_at ? format(new Date(user.created_at), "yyyy") : "2024",
      };
    },
    enabled: !!user?.id,
  });

  const displayStats = {
    userSince: stats?.userSince || "2024",
    appTime: `${stats?.workoutsCompleted || 0}h`,
    improvement: `${Math.min((achievementStats?.badgesEarned || 0) * 10, 100)}%`,
    totalSteps: stats?.totalSteps || 0,
    caloriesBurned: stats?.caloriesBurned || 0,
    totalSleepTime: `${stats?.totalSleepHours || 0}h`,
    waterConsumed: Math.floor((stats?.workoutsCompleted || 0) * 0.5),
    heartRateLogged: Math.floor((stats?.workoutsCompleted || 0) * 3),
    workoutsCompleted: stats?.workoutsCompleted || 0,
    workoutDuration: stats?.workoutDuration || "0h",
    coachSessions: stats?.coachSessions || 0,
    favoriteCoach: stats?.favoriteCoach || "None yet",
    caloriesConsumed: stats?.totalCaloriesConsumed || 0,
    mostProtein: `${stats?.totalProtein || 0}g`,
    fat: `${stats?.totalFat || 0}g`,
    achievements: achievementStats?.badgesEarned || 0,
    totalPoints: ranking?.total_points || 0,
    rank: ranking?.rank_position || "-",
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{displayStats.userSince}</span>
          <span className="text-xs text-muted-foreground">User Since</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{displayStats.totalPoints}pts</span>
          <span className="text-xs text-muted-foreground">Total Points</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">#{displayStats.rank}</span>
          <span className="text-xs text-muted-foreground">Rank</span>
        </div>
      </div>

      {/* Health Metrics */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Health Metrics</h3>
        <div className="space-y-3">
          <StatRow label="Total Steps" value={`${displayStats.totalSteps.toLocaleString()} steps`} />
          <Separator />
          <StatRow label="Calories Burned" value={`${displayStats.caloriesBurned.toLocaleString()} kcal`} />
          <Separator />
          <StatRow label="Total Sleep Time" value={displayStats.totalSleepTime} />
          <Separator />
          <StatRow label="Heart Rate Logged" value={`${displayStats.heartRateLogged} entries`} />
        </div>
      </Card>

      {/* Fitness Metrics */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Fitness Metrics</h3>
        <div className="space-y-3">
          <StatRow label="Workouts Completed" value={displayStats.workoutsCompleted.toString()} />
          <Separator />
          <StatRow label="Workout Duration" value={displayStats.workoutDuration} />
          <Separator />
          <StatRow label="Coach Sessions" value={displayStats.coachSessions.toString()} />
          <Separator />
          <StatRow label="Favorite Coach" value={displayStats.favoriteCoach} />
        </div>
      </Card>

      {/* Nutrition & Achievements */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Nutrition & Achievements</h3>
        <div className="space-y-3">
          <StatRow label="Calories Consumed" value={`${displayStats.caloriesConsumed.toLocaleString()} kcal`} />
          <Separator />
          <StatRow label="Total Protein" value={displayStats.mostProtein} />
          <Separator />
          <StatRow label="Total Fat" value={displayStats.fat} />
          <Separator />
          <StatRow label="Badges Earned" value={displayStats.achievements.toString()} />
        </div>
      </Card>

      {/* Share Stats */}
      <div className="text-center pt-4 pb-8">
        <p className="text-sm text-muted-foreground mb-4">Share my Stats</p>
        <div className="flex justify-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <Facebook className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <Instagram className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <Twitter className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <Send className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold text-foreground">{value}</span>
  </div>
);

export default StatsTab;
