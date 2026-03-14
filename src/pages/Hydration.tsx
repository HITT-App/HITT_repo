import { ArrowLeft, Droplets, Settings, TrendingUp, Clock, Target, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";
import { format } from "date-fns";

const Hydration = () => {
  const navigate = useNavigate();
  const { logMetric, useMetricHistory, useTodayTotal } = useHealthMetrics();
  const { data: history = [] } = useMetricHistory("hydration", 20);
  const { data: todayIntake = 0 } = useTodayTotal("hydration");
  const [showLogForm, setShowLogForm] = useState(false);
  const [mlInput, setMlInput] = useState("");
  const goal = 2500;

  const progressPercent = Math.min((todayIntake / goal) * 100, 100);
  const remaining = Math.max(0, goal - todayIntake);

  const handleLog = async () => {
    const val = Number(mlInput);
    if (!val || val < 1 || val > 5000) {
      toast.error("Enter a valid amount (1-5000 ml)");
      return;
    }
    try {
      await logMetric.mutateAsync({ metric_type: "hydration", value: val, unit: "ml" });
      toast.success(`${val} ml logged!`);
      setMlInput("");
      setShowLogForm(false);
    } catch {
      toast.error("Failed to log");
    }
  };

  const quickAdd = [
    { label: "Small", amount: 150, icon: "🥤" },
    { label: "Medium", amount: 250, icon: "🥤" },
    { label: "Large", amount: 500, icon: "🥤" },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-semibold text-foreground">Hydration</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}><Settings className="w-5 h-5" /></Button>
      </header>

      <div className="p-4 space-y-6">
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Droplets className="w-6 h-6 text-blue-500" />
            <span className="text-4xl font-bold text-foreground">{todayIntake.toLocaleString()}</span>
            <span className="text-lg text-muted-foreground">ml</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {todayIntake >= goal ? "🎉 Daily goal reached!" : `You need ${remaining} ml more today`}
          </p>

          <div className="relative w-20 h-32 mx-auto mb-4 border-2 border-blue-300 rounded-lg overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 bg-blue-400 transition-all duration-500"
              style={{ height: `${progressPercent}%` }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </Card>

        {/* Quick Add */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Quick Add Water</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickAdd.map((item) => (
              <Button
                key={item.label}
                variant="outline"
                className="flex flex-col h-auto py-4"
                onClick={async () => {
                  try {
                    await logMetric.mutateAsync({ metric_type: "hydration", value: item.amount, unit: "ml" });
                    toast.success(`${item.amount} ml logged!`);
                  } catch { toast.error("Failed"); }
                }}
                disabled={logMetric.isPending}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.amount}ml</span>
              </Button>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Hydration History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No water logged yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => (
                <Card key={item.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Droplets className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="font-semibold text-foreground">{Math.round(Number(item.value))} ml</p>
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
            <Target className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{goal.toLocaleString()} ml</p>
              <p className="text-xs text-muted-foreground">Daily water intake goal</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{Math.round(progressPercent)}%</span>
            <span>{todayIntake.toLocaleString()} / {goal.toLocaleString()}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </Card>

        {/* Custom Log */}
        {showLogForm && (
          <Card className="p-4 space-y-3 animate-fade-in">
            <p className="font-semibold text-foreground">Log Custom Amount</p>
            <Input type="number" placeholder="Enter ml" value={mlInput} onChange={(e) => setMlInput(e.target.value)} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleLog} disabled={logMetric.isPending}>
                {logMetric.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        <Button className="w-full" size="lg" onClick={() => setShowLogForm(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Log Water
        </Button>
      </div>
    </div>
  );
};

export default Hydration;
