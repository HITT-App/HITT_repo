import { ArrowLeft, Heart, Settings, TrendingUp, TrendingDown, Clock, Activity, ChevronRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";
import { format } from "date-fns";

const HeartRate = () => {
  const navigate = useNavigate();
  const { logMetric, useMetricHistory, getLatestValue } = useHealthMetrics();
  const { data: history = [], isLoading } = useMetricHistory("heart_rate", 20);
  const [showLogForm, setShowLogForm] = useState(false);
  const [bpmInput, setBpmInput] = useState("");

  const currentBPM = getLatestValue("heart_rate") || "--";

  const handleLog = async () => {
    const val = Number(bpmInput);
    if (!val || val < 30 || val > 250) {
      toast.error("Enter a valid heart rate (30-250 bpm)");
      return;
    }
    try {
      await logMetric.mutateAsync({ metric_type: "heart_rate", value: val, unit: "bpm" });
      toast.success("Heart rate logged!");
      setBpmInput("");
      setShowLogForm(false);
    } catch {
      toast.error("Failed to log");
    }
  };

  // Compute insights from history
  const values = history.map((h) => Number(h.value));
  const peak = values.length > 0 ? Math.max(...values) : "--";
  const resting = values.length > 0 ? Math.min(...values) : "--";
  const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : "--";

  const highlights = [
    { label: "Peak", value: String(peak), unit: "bpm", status: peak !== "--" && peak > 140 ? "High" : "Normal Range", icon: TrendingUp },
    { label: "Resting", value: String(resting), unit: "bpm", status: "Normal", icon: Heart },
    { label: "Average", value: String(avg), unit: "bpm", status: "Optimal", icon: TrendingDown },
  ];

  const zones = [
    { name: "High Heart Rate", range: "140+ bpm", color: "bg-red-500" },
    { name: "Moderate Heart Rate", range: "100-140 bpm", color: "bg-primary" },
    { name: "Low Heart Rate", range: "60-100 bpm", color: "bg-green-500" },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">Heart Rate</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}><Settings className="w-5 h-5" /></Button>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6 pb-28">
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-6 h-6 text-red-500" />
            <span className="text-4xl font-bold text-foreground">{currentBPM}</span>
            <span className="text-lg text-muted-foreground">BPM</span>
          </div>
          <p className="text-sm text-green-600">
            {currentBPM !== "--" ? "Within a healthy resting rate." : "No readings yet. Log your first!"}
          </p>
        </Card>

        {/* Chart from real data */}
        {history.length > 1 && (
          <Card className="p-4">
            <div className="h-32 flex items-end justify-around gap-1">
              {history.slice(0, 24).reverse().map((h, i) => {
                const val = Number(h.value);
                const height = Math.max(10, ((val - 40) / 160) * 100);
                return <div key={i} className="w-2 bg-red-400 rounded-t" style={{ height: `${height}%` }} />;
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">Recent readings</p>
          </Card>
        )}

        {/* Insights */}
        {values.length > 0 && (
          <div>
            <h2 className="font-semibold text-foreground mb-3">Highlight & Insights</h2>
            <div className="grid grid-cols-3 gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label} className="p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-xl font-bold text-foreground">{item.value}</span>
                    <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Heart Rate History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No readings logged yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => (
                <Card key={item.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{Math.round(Number(item.value))} bpm</p>
                      <p className="text-xs text-green-600">
                        {Number(item.value) < 100 ? "Normal Range" : "Elevated"}
                      </p>
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

        {/* Zones */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Heart Rate Zones</h2>
          <Card className="p-4 space-y-3">
            {zones.map((zone) => (
              <div key={zone.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${zone.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{zone.name}</p>
                  <p className="text-xs text-muted-foreground">{zone.range}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Log Form */}
        {showLogForm && (
          <Card className="p-4 space-y-3 animate-fade-in">
            <p className="font-semibold text-foreground">Log Heart Rate</p>
            <Input
              type="number"
              placeholder="Enter BPM (e.g. 72)"
              value={bpmInput}
              onChange={(e) => setBpmInput(e.target.value)}
              min={30}
              max={250}
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleLog} disabled={logMetric.isPending}>
                {logMetric.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        <Button className="w-full" size="lg" onClick={() => setShowLogForm(true)}>
          <Heart className="w-5 h-5 mr-2" />
          Log Heart Rate
        </Button>
      </div>
      </div>
    </div>
  );
};

export default HeartRate;
