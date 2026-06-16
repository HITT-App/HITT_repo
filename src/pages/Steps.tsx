import { ArrowLeft, Footprints, Settings, Target, Plus, ShieldCheck, Pencil, Play, Square, Activity, RotateCcw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { usePedometer } from "@/hooks/usePedometer";
import { toast } from "sonner";
import { format } from "date-fns";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

const Steps = () => {
  const navigate = useNavigate();
  const { logMetric, useMetricHistory, useTodayTotal } = useHealthMetrics();
  const { data: history = [] } = useMetricHistory("steps", 20);
  const { data: todaySteps = 0 } = useTodayTotal("steps");
  const [showLogForm, setShowLogForm] = useState(false);
  const [stepsInput, setStepsInput] = useState("");
  const pedometer = usePedometer();
  const goal = 10000;

  const progressPercent = Math.min((todaySteps / goal) * 100, 100);

  const handleLog = async () => {
    const val = Number(stepsInput);
    if (!val || val < 1 || val > 100000) {
      toast.error("Enter a valid step count");
      return;
    }
    try {
      await logMetric.mutateAsync({ metric_type: "steps", value: val, unit: "steps" });
      toast.success(`${val.toLocaleString()} steps logged!`);
      setStepsInput("");
      setShowLogForm(false);
    } catch {
      toast.error("Failed to log");
    }
  };

  const handleStopPedometer = async () => {
    const counted = pedometer.stop();
    if (counted > 0) {
      try {
        await logMetric.mutateAsync({
          metric_type: "steps",
          value: counted,
          unit: "steps",
          notes: "pedometer_session",
        });
        toast.success(`${counted.toLocaleString()} steps saved from walk session!`);
      } catch {
        toast.error("Failed to save steps");
      }
    } else {
      toast("No steps detected in this session");
    }
  };

  const quickSteps = [1000, 2500, 5000];

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/health-metrics")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">Steps</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28 space-y-6">
        {/* Today's Progress */}
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Footprints className="w-6 h-6 text-primary" />
            <span className="text-4xl font-bold text-foreground">{todaySteps.toLocaleString()}</span>
            <span className="text-lg text-muted-foreground">steps</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {todaySteps >= goal
              ? "🎉 Goal reached!"
              : `Take ${(goal - todaySteps).toLocaleString()} more steps today!`}
          </p>

          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeDasharray={`${progressPercent * 3.52} 352`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{Math.round(progressPercent)}%</span>
              <span className="text-xs text-muted-foreground">of {goal.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        {/* Live Pedometer */}
        {pedometer.isSupported && (
          <Card className={`p-5 ${pedometer.isActive ? "border-primary" : pedometer.wasPaused ? "border-yellow-500/50" : "border-primary/30"}`}>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Live Step Counter</h2>
            </div>

            {pedometer.wasPaused && !pedometer.isActive ? (
              /* Paused / interrupted session */
              <div className="text-center space-y-3">
                <div className="rounded-lg bg-yellow-500/10 p-3 mb-2">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    ⚠️ Session interrupted
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {pedometer.steps.toLocaleString()} steps · {formatTime(pedometer.elapsed)} elapsed
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => pedometer.resume()}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleStopPedometer}
                    disabled={logMetric.isPending}
                  >
                    {logMetric.isPending ? "Saving…" : "Save & End"}
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => pedometer.discard()}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Discard
                </Button>
              </div>
            ) : pedometer.isActive ? (
              /* Active session */
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                  <span className="text-xs text-primary font-medium ml-1">Counting…</span>
                </div>
                <p className="text-5xl font-bold text-foreground">{pedometer.steps.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(pedometer.elapsed)} elapsed
                </p>
                <div className="rounded-lg bg-muted/50 p-2">
                  <p className="text-[11px] text-muted-foreground">
                    💡 Keep your screen on and app open for accurate counting
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  size="lg"
                  onClick={handleStopPedometer}
                  disabled={logMetric.isPending}
                >
                  <Square className="w-4 h-4 mr-2" />
                  {logMetric.isPending ? "Saving…" : "Stop & Save"}
                </Button>
              </div>
            ) : (
              /* Idle — start new */
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Count steps in real-time using your phone's motion sensors. Keep the app open during your walk.
                </p>
                <Button className="w-full" size="lg" onClick={() => pedometer.start()}>
                  <Play className="w-4 h-4 mr-2" />
                  Start Walking
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Quick Add */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Quick Add</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickSteps.map((steps) => (
              <Button
                key={steps}
                variant="outline"
                className="flex flex-col h-auto py-3"
                onClick={async () => {
                  try {
                    await logMetric.mutateAsync({ metric_type: "steps", value: steps, unit: "steps" });
                    toast.success(`${steps.toLocaleString()} steps logged!`);
                  } catch {
                    toast.error("Failed");
                  }
                }}
                disabled={logMetric.isPending}
              >
                <span className="text-lg mb-0.5">👟</span>
                <span className="text-sm font-medium">{steps.toLocaleString()}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Steps History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No steps logged yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => (
                <Card key={item.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Footprints className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {Math.round(Number(item.value)).toLocaleString()} steps
                      </p>
                      {item.notes === "health_connect_sync" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          Verified · Auto-synced
                        </span>
                      ) : item.notes === "pedometer_session" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">
                          <Activity className="w-3 h-3" />
                          Pedometer Session
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          <Pencil className="w-3 h-3" />
                          Manual
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.recorded_at), "MMM d, h:mm a")}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Goal */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Target className="w-5 h-5 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{goal.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Daily step goal</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{Math.round(progressPercent)}%</span>
            <span>
              {todaySteps.toLocaleString()} / {goal.toLocaleString()}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </Card>

        {/* Custom Log */}
        {showLogForm && (
          <Card className="p-4 space-y-3 animate-fade-in">
            <p className="font-semibold text-foreground">Log Custom Steps</p>
            <Input
              type="number"
              placeholder="Enter step count"
              value={stepsInput}
              onChange={(e) => setStepsInput(e.target.value)}
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleLog} disabled={logMetric.isPending}>
                {logMetric.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowLogForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <Button className="w-full" size="lg" onClick={() => setShowLogForm(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Log Steps
        </Button>
      </div>
      </div>
    </div>
  );
};

export default Steps;
