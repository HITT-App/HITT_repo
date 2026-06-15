import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Plus, ChevronRight, Calendar, Sparkles } from "lucide-react";
import { useSleep } from "@/hooks/useSleep";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

const SleepDashboard = () => {
  const navigate = useNavigate();
  const {
    preferences, preferencesLoading,
    activeSchedule, logs, logsLoading,
    weeklyLogs, sleepScore, weeklyStats,
  } = useSleep();

  if (!preferencesLoading && !preferences?.onboarding_completed) {
    navigate("/sleep-onboarding");
    return null;
  }

  const scoreColor =
    sleepScore >= 70 ? "#4ade80" :
    sleepScore >= 40 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))";

  const getWeeklyConsistency = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    return DAY_LABELS.map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return weeklyLogs.some(l => l.sleep_date === d.toISOString().split("T")[0]);
    });
  };

  const consistency = getWeeklyConsistency();
  const lastLog = logs[0] ?? null;

  const fmtTime = (v: string | null | undefined) => {
    if (!v) return "--:--";
    try { return format(new Date(v), "HH:mm"); } catch { return "--:--"; }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 pb-3"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors touch-manipulation">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="font-semibold text-foreground">Sleep</span>
        <div className="flex items-center">
          <button onClick={() => navigate("/sleep-history")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors touch-manipulation">
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/log-sleep")} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-secondary transition-colors touch-manipulation">
            <Plus className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Content — padded so nothing hides behind fixed CTA */}
      <div className="px-4 pt-4 space-y-3" style={{ paddingBottom: "144px" }}>

        {/* Score + week dots */}
        <div className="flex items-center gap-4 bg-card border border-border/60 rounded-2xl p-4">
          <div className="relative shrink-0" style={{ width: 76, height: 76 }}>
            <svg width="76" height="76" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="38" cy="38" r="32" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
              <circle cx="38" cy="38" r="32" stroke={scoreColor} strokeWidth="6" fill="none"
                strokeDasharray={`${(sleepScore / 100) * 201} 201`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] font-bold text-foreground leading-none">{sleepScore}</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">score</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex gap-1 mb-2.5">
              {DAY_LABELS.map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                  <span className="text-[9px] text-muted-foreground">{day}</span>
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold",
                    consistency[i] ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {consistency[i] ? "✓" : "·"}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground leading-none">{weeklyStats.avgHours}h {weeklyStats.avgRemainingMinutes}m</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Avg sleep</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground leading-none">{weeklyStats.avgQuality}%</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Quality</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground leading-none">{weeklyStats.nightsLogged}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Nights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Last night */}
        <div className="bg-card border border-border/60 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Last night</p>
          {logsLoading ? (
            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          ) : !lastLog ? (
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">No sleep logged yet</p>
              <button onClick={() => navigate("/log-sleep")} className="text-[12px] font-semibold text-primary touch-manipulation">Log now</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[13px] font-semibold text-foreground">{fmtTime(lastLog.bedtime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-[13px] font-semibold text-foreground">{fmtTime(lastLog.wake_time)}</span>
                </div>
                <span className="text-[13px] font-semibold text-foreground">
                  {Math.floor((lastLog.duration_minutes ?? 0) / 60)}h {(lastLog.duration_minutes ?? 0) % 60}m
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">{format(parseISO(lastLog.sleep_date), "MMM d")}</span>
            </div>
          )}
        </div>

        {/* Schedule */}
        <button
          onClick={() => navigate("/sleep-schedule")}
          className="w-full bg-card border border-border/60 rounded-2xl p-4 text-left touch-manipulation active:bg-muted/30 transition-colors"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Sleep schedule</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          {!activeSchedule ? (
            <p className="text-[13px] text-muted-foreground">No schedule set — tap to add one</p>
          ) : (
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Bedtime</p>
                  <p className="text-[13px] font-semibold text-foreground">{activeSchedule.bedtime?.slice(0, 5)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-yellow-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Wake up</p>
                  <p className="text-[13px] font-semibold text-foreground">{activeSchedule.wake_time?.slice(0, 5)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Goal</p>
                <p className="text-[13px] font-semibold text-foreground">{preferences?.target_hours ?? 8}h {preferences?.target_minutes ?? 0}m</p>
              </div>
            </div>
          )}
        </button>

        {/* Quick links */}
        <div className="flex gap-2.5">
          <button onClick={() => navigate("/sleep-history")}
            className="flex-1 bg-card border border-border/60 rounded-2xl p-3.5 text-left touch-manipulation active:bg-muted/30 transition-colors">
            <Calendar className="w-4 h-4 text-primary mb-1.5" />
            <p className="text-[12px] font-semibold text-foreground">History</p>
            <p className="text-[10px] text-muted-foreground">All nights</p>
          </button>
          <button onClick={() => navigate("/sleep-recommendations")}
            className="flex-1 bg-card border border-border/60 rounded-2xl p-3.5 text-left touch-manipulation active:bg-muted/30 transition-colors">
            <Sparkles className="w-4 h-4 text-primary mb-1.5" />
            <p className="text-[12px] font-semibold text-foreground">Tips</p>
            <p className="text-[10px] text-muted-foreground">AI insights</p>
          </button>
        </div>
      </div>

      {/* CTA — fixed above bottom nav bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 px-4 bg-background/90 backdrop-blur-sm border-t border-border/40"
        style={{ paddingTop: "12px", paddingBottom: "calc(var(--safe-area-inset-bottom, 0px) + 72px)" }}
      >
        <button
          onClick={() => navigate("/log-sleep")}
          className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-[15px] touch-manipulation active:opacity-90 transition-opacity"
        >
          Log Sleep
        </button>
      </div>
    </div>
  );
};

export default SleepDashboard;
