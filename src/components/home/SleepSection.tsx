import { useState } from "react";
import { Moon, Sun, Plus, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSleep } from "@/hooks/useSleep";
import { format, subDays } from "date-fns";

const QUALITY_OPTIONS = [
  { label: "Restful", score: 90 },
  { label: "Good", score: 70 },
  { label: "Interrupted", score: 45 },
  { label: "Poor", score: 25 },
] as const;

export function SleepSection() {
  const navigate = useNavigate();
  const { logs, logsLoading, preferences, preferencesLoading, logSleep } = useSleep();
  const wizardDone = !!preferences;

  const [showForm, setShowForm] = useState(false);
  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [quality, setQuality] = useState<number>(70);
  const [saving, setSaving] = useState(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const recentLog = logs[0] ?? null;
  // Only treat a log as "last night" if it was recorded today or yesterday
  const log = (recentLog?.sleep_date === todayStr || recentLog?.sleep_date === yesterdayStr) ? recentLog : null;
  const hasData = !!log;

  const hours = log ? Math.floor((log.duration_minutes ?? 0) / 60) : 0;
  const mins = log ? (log.duration_minutes ?? 0) % 60 : 0;
  const score = log?.sleep_quality ?? 0;

  const qualityLabel =
    score >= 80 ? "Restful sleep last night." :
    score >= 60 ? "Good sleep last night." :
    score >= 40 ? "Interrupted sleep last night." :
    "Poor sleep last night.";

  const qualityColor =
    score >= 80 ? "text-green-500" :
    score >= 60 ? "text-primary" :
    score >= 40 ? "text-yellow-500" : "text-red-500";

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const sleepDate = format(today, "yyyy-MM-dd");

      // Bedtime is last night; wake time is this morning
      const bedtimeISO = `${format(yesterday, "yyyy-MM-dd")}T${bedtime}:00`;
      const wakeISO = `${format(today, "yyyy-MM-dd")}T${wakeTime}:00`;

      await logSleep.mutateAsync({
        sleep_date: sleepDate,
        bedtime: bedtimeISO,
        wake_time: wakeISO,
        sleep_quality: quality,
      });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Sleep</h2>
        <div className="flex items-center gap-2">
          {hasData && (
            <button
              onClick={() => setShowForm(true)}
              className="p-1 rounded-full hover:bg-secondary transition-colors"
              aria-label="Log sleep"
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <Button variant="link" size="sm" className="text-primary p-0 h-auto text-sm" onClick={() => navigate("/sleep")}>
            See All
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-card border border-border/60">
        {logsLoading || preferencesLoading ? (
          <div className="h-24 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !wizardDone ? (
          /* ── Wizard not done: prompt to set up sleep preferences ── */
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-3">
              <Moon className="w-6 h-6 text-indigo-500" />
            </div>
            <p className="text-[13px] font-semibold text-foreground mb-1">Set up sleep tracking</p>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Tell us your sleep goals and we'll help you track and improve your rest.
            </p>
            <button
              onClick={() => navigate("/sleep-onboarding")}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-[13px] font-semibold touch-manipulation"
            >
              Set up sleep
            </button>
          </div>
        ) : showForm || !hasData ? (
          /* ── Manual log form ── */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-foreground">Log last night's sleep</p>
              {hasData && (
                <button onClick={() => setShowForm(false)} className="p-1 rounded-full hover:bg-secondary transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Moon className="w-3 h-3 text-indigo-500" /> Bedtime
                </p>
                <input
                  type="time"
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                  className="w-full min-w-0 bg-muted/30 border border-border rounded-xl px-2 py-2.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-yellow-500" /> Wake up
                </p>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full min-w-0 bg-muted/30 border border-border rounded-xl px-2 py-2.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <p className="text-[11px] text-muted-foreground mb-2">How did you sleep?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {QUALITY_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setQuality(opt.score)}
                    className={`py-2 rounded-xl text-[12.5px] font-medium border transition-colors touch-manipulation ${
                      quality === opt.score
                        ? "bg-primary text-white border-primary"
                        : "bg-muted/30 text-muted-foreground border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-primary text-white text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save sleep"}
            </button>
          </div>
        ) : (
          /* ── Sleep data display ── */
          <>
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
