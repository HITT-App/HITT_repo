import { Flame, Clock, Target, Share2 } from "lucide-react";
import { HEmoji } from "@/components/HEmoji";
import { cn } from "@/lib/utils";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
      glassBg: "rgba(249,115,22,0.55), rgba(245,158,11,0.4)",
      glowColor: "#f97316",
      glow: "shadow-orange-500/30",
    },
    { 
      id: "workouts", 
      icon: Target, 
      value: workoutCount.toString(), 
      label: "Workouts",
      glassBg: "rgba(139,92,246,0.55), rgba(147,51,234,0.4)",
      glowColor: "#8b5cf6",
      glow: "shadow-violet-500/30",
    },
    { 
      id: "minutes", 
      icon: Clock, 
      value: totalMinutes.toString(), 
      label: "Minutes",
      glassBg: "rgba(14,165,233,0.55), rgba(37,99,235,0.4)",
      glowColor: "#0ea5e9",
      glow: "shadow-sky-500/30",
    },
    {
      id: "streak",
      icon: Clock,
      hEmoji: 'streak',
      value: streak?.current_streak?.toString() || "0",
      label: "Day Streak",
      glassBg: "rgba(16,185,129,0.55), rgba(13,148,136,0.4)",
      glowColor: "#10b981",
      glow: "shadow-emerald-500/30",
    },
  ];

  const shareStats = async () => {
    const text = `My HIIT Fitness stats 💪\n🔥 ${totalCalories.toLocaleString()} calories\n🏋️ ${workoutCount} workouts\n⏱ ${totalMinutes} minutes\n🔥 ${streak?.current_streak || 0} day streak\n\n#HIIT #Fitness`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Stats copied to clipboard" });
    }
  };

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
                "rounded-2xl p-4",
                "border border-white/20",
                "shadow-xl",
                stat.glow,
                "opacity-0 animate-fade-up",
                "active:scale-[0.96] transition-all duration-200 touch-manipulation",
                "backdrop-blur-xl"
              )}
              style={{ 
                animationDelay: `${0.3 + index * 0.05}s`, 
                animationFillMode: "forwards",
                background: `linear-gradient(135deg, ${stat.glassBg})`,
              }}
            >
              {/* Glass highlight at top */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              
              {/* Inner glow */}
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30 blur-2xl" 
                style={{ background: stat.glowColor }} />
              
              {/* Radial shimmer */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(255,255,255,0.08)_0%,_transparent_50%)]" />
              
              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-md">{stat.value}</p>
                  <p className="text-[11px] text-white/70 mt-1 font-semibold uppercase tracking-widest">{stat.label}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner">
                  {stat.hEmoji
                    ? <HEmoji name={stat.hEmoji as any} size={20}/>
                    : <Icon size={20} className="text-white/90" strokeWidth={2}/>}
                </div>
              </div>
              
              {/* Bottom highlight line */}
              <div className="absolute inset-x-4 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          );
        })}
      </div>
      <button
        onClick={shareStats}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-semibold tracking-wide active:bg-white/10 transition-colors touch-manipulation"
      >
        <Share2 size={13} />
        Share My Stats
      </button>
    </div>
  );
};