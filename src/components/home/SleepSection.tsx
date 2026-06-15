import { ChevronRight, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSleep } from "@/hooks/useSleep";
import { format } from "date-fns";

export function SleepSection() {
  const navigate = useNavigate();
  const { logs, logsLoading } = useSleep();

  const log = logs[0] ?? null;
  const hasData = !!log;

  const hours = log ? Math.floor((log.duration_minutes ?? 0) / 60) : 0;
  const mins = log ? (log.duration_minutes ?? 0) % 60 : 0;
  const score = log?.sleep_quality ?? 0;

  const quality = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "fair" : "poor";
  const qualityColor =
    quality === "excellent" ? "text-green-500" :
    quality === "good" ? "text-primary" :
    quality === "fair" ? "text-yellow-500" : "text-red-500";

  const qualityLabel =
    quality === "excellent" ? "You had an excellent sleep last night." :
    quality === "good" ? "You had a good sleep last night." :
    quality === "fair" ? "Your sleep was fair last night." :
    "Your sleep needs improvement.";

  const fmtTime = (val: string | null | undefined) => {
    if (!val) return "--:--";
    try { return format(new Date(val), "HH:mm"); } catch { return "--:--"; }
  };

  const stages = {
    awake: log?.awake_minutes ?? 0,
    rem: log?.rem_sleep_minutes ?? 0,
    deep: log?.deep_sleep_minutes ?? 0,
    light: log?.light_sleep_minutes ?? 0,
  };
  const stageMax = Math.max(stages.awake, stages.rem, stages.deep, stages.light, 60);

  return (
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Sleep</h2>
        <Button variant="link" size="sm" className="text-primary p-0 h-auto text-sm" onClick={() => navigate("/sleep")}>
          See All
        </Button>
      </div>

      <Card className="p-4 bg-card border border-border/60">
        {logsLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
              <Moon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Start tracking your first sleep to see insights about your sleeping pattern.
            </p>
            <Button variant="link" className="text-primary" onClick={() => navigate("/start-sleep")}>
              Track my sleep
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <>
            {/* Duration & Score */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{hours}</span>
                  <span className="text-sm text-muted-foreground">h</span>
                  <span className="text-3xl font-bold text-foreground ml-1">{mins}</span>
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className={`text-sm font-medium ${qualityColor}`}>{score} sleep score</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{qualityLabel}</p>
              </div>
            </div>

            {/* Bedtime / Wake Up */}
            <div className="flex items-center justify-center gap-8 py-3 mb-4 bg-secondary/50 rounded-xl">
              <div className="text-center">
                <Moon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                <p className="text-lg font-semibold text-foreground">{fmtTime(log?.bedtime)}</p>
                <p className="text-xs text-muted-foreground">Bedtime</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <Sun className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-semibold text-foreground">{fmtTime(log?.wake_time)}</p>
                <p className="text-xs text-muted-foreground">Wake Up</p>
              </div>
            </div>

            {/* Sleep Stages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Awake</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.awake / stageMax) * 100} className="h-2 [&>div]:bg-red-400" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.awake} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">REM</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.rem / stageMax) * 100} className="h-2 [&>div]:bg-purple-500" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.rem} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Deep</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.deep / stageMax) * 100} className="h-2 [&>div]:bg-indigo-600" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.deep} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Light</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.light / stageMax) * 100} className="h-2 [&>div]:bg-orange-400" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.light} min</span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
