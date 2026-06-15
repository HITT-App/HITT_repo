import { Flame, Clock, Target, Share2 } from "lucide-react";
import { HEmoji } from "@/components/HEmoji";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WeeklyStatsShareSheet } from "@/components/WeeklyStatsShareSheet";

export const StatsGrid = () => {
  const { user } = useAuth();
  const { streak } = useStreaksAndBadges();
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    // Monday 00:00:00 local time → ISO string for Supabase filter
    const now = new Date();
    const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.toISOString();

    try {
      const { data: progressData } = await supabase
        .from('workout_progress')
        .select('duration_seconds, calories_burned')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', weekStart);

      if (progressData) {
        const totalSecs = progressData.reduce((acc, p) => acc + (p.duration_seconds || 0), 0);
        const totalCals = progressData.reduce((acc, p) => {
          // Use real calories_burned if available, otherwise estimate from duration
          return acc + (p.calories_burned ?? Math.floor((p.duration_seconds || 0) / 60 * 7));
        }, 0);
        setTotalMinutes(Math.floor(totalSecs / 60));
        setWorkoutCount(progressData.length);
        setTotalCalories(Math.floor(totalCals));
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const stats = [
    {
      id: "calories",
      icon: Flame,
      hEmoji: undefined as string | undefined,
      value: totalCalories > 0 ? totalCalories.toLocaleString() : "0",
      label: "Kcal this week",
      accent: 'rgb(251,113,21)',
    },
    {
      id: "workouts",
      icon: Target,
      hEmoji: undefined as string | undefined,
      value: workoutCount.toString(),
      label: "Workouts this week",
      accent: 'rgb(244,50,75)',
    },
    {
      id: "minutes",
      icon: Clock,
      hEmoji: undefined as string | undefined,
      value: totalMinutes.toString(),
      label: "Mins this week",
      accent: 'rgb(255,46,136)',
    },
    {
      id: "streak",
      icon: Clock,
      hEmoji: 'streak' as string | undefined,
      value: streak?.current_streak?.toString() || "0",
      label: "Active days",
      accent: 'rgb(255,176,32)',
    },
  ];

  return (
    <div className="px-5 -mt-14 relative z-10">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 18,
                padding: 15,
                border: '1px solid hsl(228 12% 26%)',
                background: 'linear-gradient(150deg, hsl(228 16% 17%), hsl(228 18% 11%))',
              }}
            >
              {/* Top shimmer line */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${stat.accent} 50%, transparent)`,
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 30, fontWeight: 800, color: '#fafafa', letterSpacing: '-0.5px' }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                    {stat.label}
                  </p>
                </div>
                {/* Icon chip */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${stat.accent}2e`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {stat.hEmoji
                    ? <HEmoji name={stat.hEmoji as any} size={20} />
                    : <Icon size={18} color={stat.accent} strokeWidth={2} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => setShowShareSheet(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-semibold tracking-wide active:bg-white/10 transition-colors touch-manipulation"
      >
        <Share2 size={13} />
        Share My Stats
      </button>

      {showShareSheet && (
        <WeeklyStatsShareSheet
          workouts={workoutCount}
          minutes={totalMinutes}
          streak={streak?.current_streak || 0}
          calories={totalCalories}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </div>
  );
};
