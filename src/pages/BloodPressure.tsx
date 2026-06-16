import { ArrowLeft, Activity, Settings, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";
import { format } from "date-fns";

const BloodPressure = () => {
  const navigate = useNavigate();
  const { logMetric, useMetricHistory, latestMetrics } = useHealthMetrics();
  const { data: history = [] } = useMetricHistory("blood_pressure", 20);
  const [showLogForm, setShowLogForm] = useState(false);
  const [sysInput, setSysInput] = useState("");
  const [diaInput, setDiaInput] = useState("");

  const latest = latestMetrics?.blood_pressure;
  const systolic = latest ? Math.round(Number(latest.value)) : null;
  const diastolic = latest?.secondary_value ? Math.round(Number(latest.secondary_value)) : null;

  const handleLog = async () => {
    const sys = Number(sysInput);
    const dia = Number(diaInput);
    if (!sys || sys < 60 || sys > 300 || !dia || dia < 30 || dia > 200) {
      toast.error("Enter valid blood pressure values");
      return;
    }
    try {
      await logMetric.mutateAsync({ metric_type: "blood_pressure", value: sys, secondary_value: dia, unit: "mmHg" });
      toast.success("Blood pressure logged!");
      setSysInput("");
      setDiaInput("");
      setShowLogForm(false);
    } catch {
      toast.error("Failed to log");
    }
  };

  const getBPStatus = (sys: number) => {
    if (sys < 120) return { label: "Normal", color: "text-green-600" };
    if (sys < 130) return { label: "Elevated", color: "text-yellow-600" };
    if (sys < 140) return { label: "Hypertension Stage 1", color: "text-orange-600" };
    return { label: "Hypertension Stage 2", color: "text-red-600" };
  };

  const ranges = [
    { label: "Normal", systolic: "<120/<80mmHg", color: "bg-green-500" },
    { label: "Elevated", systolic: "120-129/<80mmHg", color: "bg-yellow-500" },
    { label: "Hypertension Stage 1", systolic: "130-139/80-89mmHg", color: "bg-orange-500" },
    { label: "Hypertension Stage 2", systolic: "140+/90+mmHg", color: "bg-red-500" },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold text-foreground">Blood Pressure</h1>
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}><Settings className="w-5 h-5" /></Button>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6 pb-28">
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Activity className="w-6 h-6 text-purple-500" />
            <span className="text-4xl font-bold text-foreground">
              {systolic && diastolic ? `${systolic}/${diastolic}` : "--/--"}
            </span>
            <span className="text-lg text-muted-foreground">mmHg</span>
          </div>
          <p className={`text-sm ${systolic ? getBPStatus(systolic).color : "text-muted-foreground"}`}>
            {systolic ? getBPStatus(systolic).label : "No readings yet"}
          </p>
        </Card>

        {/* Gauge */}
        {systolic && diastolic && (
          <Card className="p-6">
            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-full h-full -rotate-90">
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--primary))" strokeWidth="12"
                  strokeDasharray={`${(systolic / 200) * 440} 440`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{systolic}</span>
                <span className="text-sm text-muted-foreground">sys</span>
                <div className="w-8 h-px bg-border my-1" />
                <span className="text-3xl font-bold">{diastolic}</span>
                <span className="text-sm text-muted-foreground">dia</span>
              </div>
            </div>
          </Card>
        )}

        {/* Ranges */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">About Blood Pressure</h2>
          <Card className="p-4 space-y-3">
            {ranges.map((range) => (
              <div key={range.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${range.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{range.label}</p>
                  <p className="text-xs text-muted-foreground">{range.systolic}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* History */}
        <div>
          <h2 className="font-semibold text-foreground mb-3">Blood Pressure History</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No readings logged yet</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((item) => {
                const sys = Math.round(Number(item.value));
                const dia = item.secondary_value ? Math.round(Number(item.secondary_value)) : 0;
                const status = getBPStatus(sys);
                return (
                  <Card key={item.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{sys}/{dia} mmHg</p>
                        <p className={`text-xs ${status.color}`}>{status.label}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.recorded_at), "MMM d, h:mm a")}
                    </span>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Log Form */}
        {showLogForm && (
          <Card className="p-4 space-y-3 animate-fade-in">
            <p className="font-semibold text-foreground">Log Blood Pressure</p>
            <div className="flex gap-2">
              <Input type="number" placeholder="Systolic (e.g. 120)" value={sysInput} onChange={(e) => setSysInput(e.target.value)} />
              <Input type="number" placeholder="Diastolic (e.g. 80)" value={diaInput} onChange={(e) => setDiaInput(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleLog} disabled={logMetric.isPending}>
                {logMetric.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowLogForm(false)}>Cancel</Button>
            </div>
          </Card>
        )}

        <Button className="w-full" size="lg" onClick={() => setShowLogForm(true)}>
          <Activity className="w-5 h-5 mr-2" />
          Log Blood Pressure
        </Button>
      </div>
      </div>
    </div>
  );
};

export default BloodPressure;
