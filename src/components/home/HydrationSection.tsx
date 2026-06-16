import { useNavigate } from "react-router-dom";
import { Droplets, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";
import { toast } from "sonner";

const GOAL = 2500;
const QUICK_AMOUNTS = [250, 500, 750];

export function HydrationSection() {
  const navigate = useNavigate();
  const { logMetric, useTodayTotal } = useHealthMetrics();
  const { data: todayIntake = 0 } = useTodayTotal("hydration");

  const pct = Math.min(todayIntake / GOAL, 1);
  const remaining = Math.max(0, GOAL - todayIntake);
  const display = todayIntake >= 1000
    ? `${(todayIntake / 1000).toFixed(1)} L`
    : `${todayIntake} ml`;

  const handleQuickLog = async (ml: number) => {
    await logMetric.mutateAsync({ metric_type: "hydration", value: ml, unit: "ml" });
    toast.success(`+${ml} ml logged`);
  };

  // Arc path for the progress ring
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Hydration</h2>
        <Button variant="link" size="sm" className="text-primary p-0 h-auto text-sm" onClick={() => navigate("/hydration")}>
          See All
        </Button>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          {/* Progress ring */}
          <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
            <svg width="64" height="64" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="32" cy="32" r={r} stroke="hsl(var(--muted))" strokeWidth="5" fill="none" />
              <circle cx="32" cy="32" r={r}
                stroke={pct >= 1 ? "#4ade80" : "#38bdf8"}
                strokeWidth="5" fill="none"
                strokeDasharray={`${dash} ${circ}`}
                strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-sky-500" />
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">{display}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pct >= 1 ? "Daily goal reached! 🎉" : `${remaining} ml to go · ${GOAL.toLocaleString()} ml goal`}
            </p>
            {/* Quick log buttons */}
            <div className="flex gap-1.5 mt-2.5">
              {QUICK_AMOUNTS.map(ml => (
                <button
                  key={ml}
                  onClick={() => handleQuickLog(ml)}
                  disabled={logMetric.isPending}
                  className="flex items-center gap-0.5 px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-semibold touch-manipulation active:opacity-70 transition-opacity disabled:opacity-40"
                >
                  <Plus className="w-2.5 h-2.5" />{ml}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
