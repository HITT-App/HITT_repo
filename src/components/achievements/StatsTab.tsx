import { useState, useEffect } from "react";
import { Calendar, Smartphone, TrendingUp, Facebook, Github, Twitter, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface UserStats {
  userSince: string;
  appTime: string;
  improvement: string;
  totalSteps: number;
  caloriesBurned: number;
  totalSleepTime: string;
  waterConsumed: number;
  heartRateLogged: number;
  workoutsCompleted: number;
  workoutDuration: string;
  coachSessions: number;
  favoriteCoach: string;
  caloriesConsumed: number;
  mostProtein: string;
  fat: string;
  favoriteMeal: string;
  achievements: number;
}

const StatsTab = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    userSince: "2018",
    appTime: "82h",
    improvement: "85%",
    totalSteps: 1554887,
    caloriesBurned: 57578,
    totalSleepTime: "312 h",
    waterConsumed: 480,
    heartRateLogged: 348,
    workoutsCompleted: 151,
    workoutDuration: "244h",
    coachSessions: 22,
    favoriteCoach: "Coach Arnold",
    caloriesConsumed: 1125550,
    mostProtein: "88g",
    fat: "12g",
    favoriteMeal: "Omelette",
    achievements: 88,
  });

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Fetch workout progress
      const { data: workoutData } = await supabase
        .from('workout_progress')
        .select('duration_seconds')
        .eq('user_id', user.id);

      // Fetch user badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', user.id);

      // Fetch coaching sessions
      const { data: sessionsData } = await supabase
        .from('coaching_sessions')
        .select('id')
        .eq('user_id', user.id);

      if (workoutData) {
        const totalSeconds = workoutData.reduce((acc, w) => acc + (w.duration_seconds || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        setStats(prev => ({
          ...prev,
          workoutsCompleted: workoutData.length,
          workoutDuration: `${hours}h`,
          caloriesBurned: Math.floor(totalSeconds / 60 * 7),
        }));
      }

      if (badgesData) {
        setStats(prev => ({
          ...prev,
          achievements: badgesData.length,
        }));
      }

      if (sessionsData) {
        setStats(prev => ({
          ...prev,
          coachSessions: sessionsData.length,
        }));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Top Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{stats.userSince}</span>
          <span className="text-xs text-muted-foreground">User Since</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{stats.appTime}</span>
          <span className="text-xs text-muted-foreground">App Time</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">{stats.improvement}</span>
          <span className="text-xs text-muted-foreground">Improvement</span>
        </div>
      </div>

      {/* Health Metrics */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Health Metrics</h3>
        <div className="space-y-3">
          <StatRow label="Total Steps" value={`${stats.totalSteps.toLocaleString()} steps`} />
          <Separator />
          <StatRow label="Calorie Burned" value={`${stats.caloriesBurned.toLocaleString()} kcal`} />
          <Separator />
          <StatRow label="Total Sleep Time" value={stats.totalSleepTime} />
          <Separator />
          <StatRow label="Water Consumed" value={`${stats.waterConsumed} liters`} />
          <Separator />
          <StatRow label="Heart Rate Logged" value={`${stats.heartRateLogged} entries`} />
        </div>
      </Card>

      {/* Fitness Metrics */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Fitness Metrics</h3>
        <div className="space-y-3">
          <StatRow label="Workouts completed" value={stats.workoutsCompleted.toString()} />
          <Separator />
          <StatRow label="Workout time duration" value={stats.workoutDuration} />
          <Separator />
          <StatRow label="Total Coach Session" value={stats.coachSessions.toString()} />
          <Separator />
          <StatRow label="Favorite Coach" value={stats.favoriteCoach} />
        </div>
      </Card>

      {/* Nutrition Data */}
      <Card className="p-4">
        <h3 className="font-semibold text-foreground mb-4">Nutrition Data</h3>
        <div className="space-y-3">
          <StatRow label="Calories Consumed" value={`${stats.caloriesConsumed.toLocaleString()}kcal`} />
          <Separator />
          <StatRow label="Most Protein" value={stats.mostProtein} />
          <Separator />
          <StatRow label="Fat" value={stats.fat} />
          <Separator />
          <StatRow label="Favorite Meal" value={stats.favoriteMeal} />
          <Separator />
          <StatRow label="Achievements" value={stats.achievements.toString()} />
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
            <Github className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <span className="text-lg">🔴</span>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <Twitter className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full bg-muted/50">
            <Send className="w-5 h-5" />
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
