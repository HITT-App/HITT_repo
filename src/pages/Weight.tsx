import { ArrowLeft, Scale, Settings, Target, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";
import { format } from "date-fns";

const Weight = () => {
  const navigate = useNavigate();
  const { logMetric, useMetricHistory, getLatestValue } = useHealthMetrics();
  const { data: history = [] } = useMetricHistory("weight", 30);
  const [showLogForm, setShowLogForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");

  const currentWeight = getLatestValue("weight") || "--";
  const goalWeight = 60;

  const handleLog = async () => {
    const val = Number(weightInput);
    if (!val || val < 20 || val > 300) {
      toast.error("Enter a valid weight (20-300 kg)");
      return;
    }
    try {
      await logMetric.mutateAsync({ metric_type: "weight", value: val, unit: "kg" });
      toast.success("Weight logged!");
      setWeightInput("");
      setShowLogForm(false);
    } catch {
      toast.error("Failed to log");
    }
  };

  // Chart data from recent history (last 7)
  const chartData = history.slice(0, 7).reverse();

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold text-foreground">Weight</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}><Settings className="w-5 h-5" /></Button>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-28 space-y-6">
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="w-6 h-6 text-green-500" />
            <span className="text-4xl font-bold text-foreground">{currentWeight}</span>
            <span className="text-lg text-muted-foreground">kg</span>
          </div>
          <p className="text-sm text-green-600">
            {currentWeight !== "--" ? "Keep tracking your progress!" : "Log your first weight reading"}
          </p>
        </Card>

        {/* Chart */}
        {chartData.length > 1 && (
          <Card className="p-4">
            <div className="h-32 flex items-end justify-around gap-2">
              {chartData.map((d, i) => {
                const val = Number(d.value);
                const minW = Math.min(...chartData.map((c) => Number(c.value))) - 2;
                const maxW = Math.max(...chartData.map((c) => Number(c.value))) + 2;
                const height = Math.max(10, ((val - minW) / (maxW - minW)) * 100);
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{val.toFixed(1)}</span>
                    <div className="w-6 bg-green-400 rounded-t" style={{ height: `${height}%` }} />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(d.recorded_at), "EEE")}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* History */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Weight History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No weight logged yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item, idx) => {
                const prevVal = idx < history.length - 1 ? Number(history[idx + 1].value) : null;
                const curVal = Number(item.value);
                const change = prevVal ? (curVal - prevVal).toFixed(1) : null;
                return (
                  <Card key={item.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Scale className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{curVal.toFixed(1)} kg</p>
                        {change && (
                          <p className={`text-xs ${Number(change) <= 0 ? "text-green-600" : "text-red-500"}`}>
                            {Number(change) > 0 ? "+" : ""}{change} kg
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.recorded_at), "MMM d")}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Goal */}
        {currentWeight !== "--" && (
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">{goalWeight} kg</p>
                <p className="text-xs text-muted-foreground">Weight Goal</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{currentWeight} kg</span>
              <span>{goalWeight} kg target</span>
            </div>
            <Progress
              value={Math.max(0, Math.min(100, ((Number(currentWeight) - goalWeight) / (Number(currentWeight) * 0.3)) * 100))}
              className="h-2"
            />
          </Card>
        )}

        {/* Log Form */}
        {showLogForm && (
          <Card className="p-4 space-y-3 animate-fade-in">
            <p className="font-semibold text-foreground">Log Weight</p>
            <Input type="number" step="0.1" placeholder="Enter weight in kg" value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)} />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleLog} disabled={logMetric.isPending}>
                {logMetric.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        <Button className="w-full" size="lg" onClick={() => setShowLogForm(true)}>
          <Scale className="w-5 h-5 mr-2" />
          Log Weight
        </Button>
      </div>
      </div>
    </div>
  );
};

export default Weight;
