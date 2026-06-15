import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Moon,
  Sun,
  Plus,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Calendar,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSleep } from "@/hooks/useSleep";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

const SleepDashboard = () => {
  const navigate = useNavigate();
  const {
    preferences,
    preferencesLoading,
    activeSchedule,
    logs,
    logsLoading,
    weeklyLogs,
    recommendations,
    sleepScore,
    weeklyStats,
  } = useSleep();

  if (!preferencesLoading && !preferences?.onboarding_completed) {
    navigate("/sleep-onboarding");
    return null;
  }

  const scoreColor =
    sleepScore >= 70 ? "text-green-500" :
    sleepScore >= 40 ? "text-primary" : "text-muted-foreground";

  const getWeeklyConsistency = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    return dayLabels.map((_, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      const dateStr = date.toISOString().split("T")[0];
      return weeklyLogs.some(log => log.sleep_date === dateStr);
    });
  };

  const weeklyConsistency = getWeeklyConsistency();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sticky top bar */}
      <header
        className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 py-3 shrink-0"
        style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <span className="font-semibold text-foreground">Sleep</span>
        <div className="flex items-center gap-1">
          <button onClick={() => navigate("/sleep-history")} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/log-sleep")} className="p-2 rounded-full hover:bg-secondary transition-colors">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(var(--safe-area-inset-bottom, 0px) + 140px)" }}>

        {/* Date + week consistency */}
        <div className="px-4 pt-5 pb-4 border-b border-border/40">
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE")}</p>
            <p className="font-semibold text-foreground">{format(new Date(), "MMMM d, yyyy")}</p>
          </div>
          <div className="flex justify-center gap-2">
            {dayLabels.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{day}</span>
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                  weeklyConsistency[index]
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {weeklyConsistency[index] ? "✓" : "·"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sleep score */}
        <div className="flex flex-col items-center py-6 border-b border-border/40">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90">
              <circle cx="72" cy="72" r="62" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted" />
              <circle cx="72" cy="72" r="62" stroke="currentColor" strokeWidth="8" fill="none"
                strokeDasharray={`${(sleepScore / 100) * 390} 390`}
                className="text-primary" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-4xl font-bold", scoreColor)}>{sleepScore}</span>
              <span className="text-xs text-muted-foreground">out of 100</span>
            </div>
          </div>
          <div className="flex gap-10 mt-5">
            <div className="text-center">
              <p className="font-semibold text-foreground">{weeklyStats.avgHours}h {weeklyStats.avgRemainingMinutes}m</p>
              <p className="text-xs text-muted-foreground">Avg sleep</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">{weeklyStats.avgQuality}%</p>
              <p className="text-xs text-muted-foreground">Quality</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Sleep Insight */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Sleep Insight
              </h2>
            </div>
            {weeklyStats.nightsLogged === 0 ? (
              <Card className="p-4">
                <h3 className="font-medium mb-1 text-[13px]">Log your first sleep</h3>
                <p className="text-xs text-muted-foreground mb-3">Track last night to see your insight</p>
                <Button variant="link" className="text-primary p-0 h-auto text-[13px]" onClick={() => navigate("/log-sleep")}>
                  Log Sleep +
                </Button>
              </Card>
            ) : (
              <Card className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-[13px]">{weeklyStats.nightsLogged} nights</p>
                    <p className="text-xs text-muted-foreground">Logged this week</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Log every night for the most accurate health insights.</p>
              </Card>
            )}
          </div>

          {/* Sleep History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-foreground">Sleep History</h2>
              <Button variant="link" size="sm" className="text-primary p-0 h-auto text-[13px]" onClick={() => navigate("/sleep-history")}>
                See All
              </Button>
            </div>
            {logsLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
            ) : logs.length === 0 ? (
              <Card className="p-5 text-center">
                <p className="text-sm text-muted-foreground">No sleep history yet</p>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {logs.slice(0, 4).map(log => (
                  <Card key={log.id} className="p-4 cursor-pointer active:bg-muted/50 transition-colors touch-manipulation"
                    onClick={() => navigate(`/sleep/${log.id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[13px] text-foreground">
                          {Math.floor((log.duration_minutes || 0) / 60)}h {(log.duration_minutes || 0) % 60}m
                        </p>
                        <p className="text-xs text-muted-foreground">{log.sleep_quality || 0} sleep score</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="text-xs">{format(parseISO(log.sleep_date), "MMM d")}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sleep Schedule */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-semibold text-foreground">Sleep Schedule</h2>
              <Button variant="link" size="sm" className="text-primary p-0 h-auto text-[13px]" onClick={() => navigate("/sleep-schedule")}>
                Edit
              </Button>
            </div>
            {!activeSchedule ? (
              <Card className="p-5 text-center">
                <Moon className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium text-[13px] mb-1">No sleep schedule set</p>
                <p className="text-xs text-muted-foreground mb-3">Set a schedule to maintain consistent rest.</p>
                <Button variant="link" className="text-primary p-0 h-auto text-[13px]" onClick={() => navigate("/sleep-schedule")}>
                  Set Up Schedule +
                </Button>
              </Card>
            ) : (
              <Card className="p-4">
                <p className="font-semibold text-foreground mb-1">
                  {preferences?.target_hours || 8}h {preferences?.target_minutes || 0}m goal
                </p>
                <p className="text-xs text-muted-foreground mb-3">Your optimal sleep duration</p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Bedtime</p>
                      <p className="text-[13px] font-medium text-foreground">{activeSchedule.bedtime?.slice(0, 5)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Wake Up</p>
                      <p className="text-[13px] font-medium text-foreground">{activeSchedule.wake_time?.slice(0, 5)}</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* AI Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <h2 className="text-[13px] font-semibold text-foreground flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" /> AI Recommendations
              </h2>
              <div className="space-y-2.5">
                {recommendations.slice(0, 2).map(rec => (
                  <Card key={rec.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0">Sleep</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[13px] text-foreground">{rec.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{rec.description}</p>
                        <p className="text-xs text-primary mt-1">+{rec.score_reward} score</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA — fixed above nav bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 bg-background/90 backdrop-blur-sm border-t border-border/40"
        style={{ paddingBottom: "calc(var(--safe-area-inset-bottom, 0px) + 80px)", paddingTop: "12px" }}
      >
        <button
          onClick={() => navigate("/log-sleep")}
          className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold text-[15px] touch-manipulation"
        >
          Log Sleep
        </button>
      </div>
    </div>
  );
};

export default SleepDashboard;
