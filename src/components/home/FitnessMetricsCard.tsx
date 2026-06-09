import { ChevronRight, Heart, Activity, Droplets, Scale, Footprints, Moon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import hiitLogo from "@/assets/hiit-logo.jpg";
import { useHealthMetrics } from "@/hooks/useHealthMetrics";

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  subtext?: string;
  chipClass?: string;
  path: string;
}

function MetricItem({ icon, label, value, unit, subtext, chipClass, path }: MetricItemProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      className="flex items-center gap-3 p-3 rounded-xl active:bg-secondary/50 transition-colors w-full text-left touch-manipulation"
    >
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", chipClass ?? "bg-secondary")}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        {subtext && (
          <p className="text-xs text-muted-foreground">{subtext}</p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

interface FitnessMetricsCardProps {
  hasData?: boolean;
}

export function FitnessMetricsCard({ hasData = false }: FitnessMetricsCardProps) {
  const navigate = useNavigate();
  const { getLatestValue } = useHealthMetrics();

  const weightVal = getLatestValue('weight') ?? '—';
  const bpVal = getLatestValue('blood_pressure') ?? '—';
  const hrVal = getLatestValue('heart_rate') ?? '—';

  if (!hasData) {
    return (
      <div className="px-5 py-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Fitness Metrics</h2>
          <Button
            variant="link"
            size="sm"
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/health-metrics")}
          >
            See All
          </Button>
        </div>

        <Card className="p-6 bg-card border border-border/60 rounded-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col items-center text-center">
            <img
              src={hiitLogo}
              alt="HIIT"
              className="w-16 h-16 rounded-2xl object-cover mb-4 opacity-60"
            />
            <p className="text-sm text-muted-foreground mb-4">
              You haven't set up any health metrics yet.<br />
              Let's set it up now.
            </p>
            <Button
              onClick={() => navigate("/health-metrics")}
              className="w-full"
            >
              Set Up Health Metrics
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Fitness Metrics</h2>
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/health-metrics")}
        >
          See All
        </Button>
      </div>

      <Card className="p-2 bg-card border border-border/60 rounded-[18px] divide-y divide-border/40 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
        <MetricItem
          icon={<Scale className="w-5 h-5 text-green-500" />}
          chipClass="bg-green-500/10"
          label="Weight"
          value={weightVal}
          unit={weightVal !== '—' ? 'kg' : undefined}
          subtext="Latest reading"
          path="/weight"
        />
        <MetricItem
          icon={<Activity className="w-5 h-5 text-purple-500" />}
          chipClass="bg-purple-500/10"
          label="Blood Pressure"
          value={bpVal}
          unit={bpVal !== '—' ? 'mmHg' : undefined}
          subtext="Latest reading"
          path="/blood-pressure"
        />
        <MetricItem
          icon={<Heart className="w-5 h-5 text-red-500" />}
          chipClass="bg-red-500/10"
          label="Heart Rate"
          value={hrVal}
          unit={hrVal !== '—' ? 'bpm' : undefined}
          subtext="Latest reading"
          path="/heart-rate"
        />
      </Card>

      {/* AI Recommendations Teaser */}
      <button
        onClick={() => navigate("/health-recommendations")}
        className="mt-3 w-full flex items-center gap-3 p-3 rounded-[18px] bg-primary/5 border border-primary/20 touch-manipulation"
      >
        <Sparkles className="w-5 h-5 text-primary" />
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-foreground">AI Recommendations</p>
          <p className="text-xs text-muted-foreground">3 personalized suggestions</p>
        </div>
      </button>
    </div>
  );
}
