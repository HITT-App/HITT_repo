import { Trophy, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEmoji } from "@/components/HEmoji";

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
  compact?: boolean;
}

export function StreakCard({ 
  currentStreak, 
  longestStreak, 
  totalWorkouts,
  lastWorkoutDate,
  compact = false 
}: StreakCardProps) {
  const isStreakActive = () => {
    if (!lastWorkoutDate) return false;
    const last = new Date(lastWorkoutDate);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 1;
  };

  const streakActive = isStreakActive();

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
        <HEmoji name="streak" size={20}/>
        <span className="font-bold text-foreground">{currentStreak}</span>
        <span className="text-xs text-muted-foreground">day streak</span>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Main Streak Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center",
            streakActive 
              ? "bg-gradient-to-br from-orange-500 to-red-500" 
              : "bg-muted"
          )}>
            <HEmoji name="streak" size={28}/>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{currentStreak}</p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </div>
        </div>
        {streakActive && currentStreak > 0 && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Active
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-background/50">
          <HEmoji name="leaderboard" size={20}/>
          <p className="text-lg font-bold text-foreground">{longestStreak}</p>
          <p className="text-[10px] text-muted-foreground">Best Streak</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-background/50">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold text-foreground">{totalWorkouts}</p>
          <p className="text-[10px] text-muted-foreground">Total Workouts</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-background/50">
          <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <p className="text-lg font-bold text-foreground">
            {lastWorkoutDate ? new Date(lastWorkoutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
          </p>
          <p className="text-[10px] text-muted-foreground">Last Workout</p>
        </div>
      </div>

      {/* Motivation Message */}
      {!streakActive && currentStreak === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Complete a workout today to start your streak!
        </p>
      )}
      {streakActive && currentStreak >= 7 && (
        <p className="text-center text-sm text-orange-400">
          You're on fire! Keep the momentum going!
        </p>
      )}
    </div>
  );
}
