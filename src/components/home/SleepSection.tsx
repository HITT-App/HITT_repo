import { ChevronRight, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface SleepSectionProps {
  hours?: number;
  minutes?: number;
  score?: number;
  quality?: "excellent" | "good" | "fair" | "poor";
  bedtime?: string;
  wakeUp?: string;
  stages?: {
    awake: number;
    rem: number;
    deep: number;
    wake: number;
  };
  hasData?: boolean;
}

export function SleepSection({
  hours = 5,
  minutes = 25,
  score = 84,
  quality = "good",
  bedtime = "02:23",
  wakeUp = "08:23",
  stages = { awake: 18, rem: 34, deep: 64, wake: 14 },
  hasData = true,
}: SleepSectionProps) {
  const navigate = useNavigate();

  const getQualityColor = () => {
    switch (quality) {
      case "excellent": return "text-green-500";
      case "good": return "text-primary";
      case "fair": return "text-yellow-500";
      case "poor": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Sleep</h2>
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/sleep")}
        >
          See All
        </Button>
      </div>

      <Card className="p-4 bg-card border border-border/60">
        {!hasData ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
              <Moon className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Start tracking your first sleep to see insights about your sleeping pattern.
            </p>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => navigate("/start-sleep")}
            >
              Track my sleep
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <>
            {/* Duration & Score */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{hours}</span>
                  <span className="text-sm text-muted-foreground">h</span>
                  <span className="text-3xl font-bold text-foreground ml-1">{minutes}</span>
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className={`text-sm font-medium ${getQualityColor()}`}>
                    {score} sleep score
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You had a positive sleep last night.
                </p>
              </div>
            </div>

            {/* Bedtime / Wake Up */}
            <div className="flex items-center justify-center gap-8 py-3 mb-4 bg-secondary/50 rounded-xl">
              <div className="text-center">
                <Moon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                <p className="text-lg font-semibold text-foreground">{bedtime}</p>
                <p className="text-xs text-muted-foreground">Bedtime</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <Sun className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                <p className="text-lg font-semibold text-foreground">{wakeUp}</p>
                <p className="text-xs text-muted-foreground">Wake Up</p>
              </div>
            </div>

            {/* Sleep Stages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Awake</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.awake / 120) * 100} className="h-2 [&>div]:bg-red-400" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.awake} Min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">REM</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.rem / 120) * 100} className="h-2 [&>div]:bg-purple-500" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.rem} Min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Deep</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.deep / 120) * 100} className="h-2 [&>div]:bg-indigo-600" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.deep} Min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Wake</span>
                <div className="flex-1 mx-3">
                  <Progress value={(stages.wake / 120) * 100} className="h-2 [&>div]:bg-orange-400" />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{stages.wake} Min</span>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
