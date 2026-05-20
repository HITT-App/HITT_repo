import { ChevronRight, Heart, Activity, Droplets, Scale, Footprints, Moon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import hiitLogo from "@/assets/hiit-logo.jpg";

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  subtext?: string;
  trend?: "up" | "down" | "stable";
  path: string;
}

function MetricItem({ icon, label, value, unit, subtext, path }: MetricItemProps) {
  const navigate = useNavigate();
  
  return (
    <button 
      onClick={() => navigate(path)}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors w-full text-left touch-manipulation"
    >
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
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

  if (!hasData) {
    return (
      <div className="px-6 py-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Fitness Metrics</h2>
          <Button 
            variant="link" 
            size="sm" 
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/health-metrics")}
          >
            See All
          </Button>
        </div>
        
        <Card className="p-6 bg-card border border-border/60">
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
    <div className="px-6 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Fitness Metrics</h2>
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/health-metrics")}
        >
          See All
        </Button>
      </div>
      
      <Card className="p-2 bg-card border border-border/60 divide-y divide-border/40">
        <MetricItem
          icon={<Scale className="w-5 h-5 text-green-500" />}
          label="Weight"
          value="70.00"
          unit="kg"
          subtext="Stable weight"
          path="/weight"
        />
        <MetricItem
          icon={<Activity className="w-5 h-5 text-purple-500" />}
          label="Blood Pressure"
          value="128/80"
          unit="mmHg"
          subtext="Stable Range"
          path="/blood-pressure"
        />
        <MetricItem
          icon={<Heart className="w-5 h-5 text-red-500" />}
          label="Heart Rate"
          value="72"
          unit="bpm"
          subtext="Resting Rate"
          path="/heart-rate"
        />
      </Card>

      {/* AI Recommendations Teaser */}
      <button 
        onClick={() => navigate("/health-recommendations")}
        className="mt-3 w-full flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 touch-manipulation"
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
