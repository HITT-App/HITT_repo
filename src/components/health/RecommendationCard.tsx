import { ChevronRight, Droplet, Activity as ActivityIcon, Moon, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export type RecommendationType = "hydration" | "activity" | "sleep";

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  metric: string;
  scoreGain: number;
  completed: boolean;
}

const TYPE_CONFIG: Record<RecommendationType, {
  icon: React.ReactNode;
  label: string;
  color: string;
}> = {
  hydration: {
    icon: <Droplet className="w-5 h-5 text-blue-500" />,
    label: "Health Metrics",
    color: "text-blue-500",
  },
  activity: {
    icon: <ActivityIcon className="w-5 h-5 text-orange-500" />,
    label: "Activity",
    color: "text-orange-500",
  },
  sleep: {
    icon: <Moon className="w-5 h-5 text-purple-500" />,
    label: "Sleep",
    color: "text-purple-500",
  },
};

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[rec.type];

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/health-recommendation/${rec.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {config.icon}
        </div>
        <div className="flex-1">
          <p className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </p>
          <h3 className="font-semibold text-foreground">{rec.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">📊 {rec.metric}</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">+{rec.scoreGain} Score Increase</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </Card>
  );
}
