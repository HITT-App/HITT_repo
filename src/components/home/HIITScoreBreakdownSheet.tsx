import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Dumbbell, Flame, Apple, Moon, Zap, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HIITScoreComponents {
  workouts: number;
  streak: number;
  nutrition: number;
  sleep: number;
  intensity: number;
  inputs?: {
    workoutCount: number;
    streakDays: number;
    nutritionDaysHit: number;
    sleepDaysGood: number;
    avgDurationMinutes: number;
  };
}

interface HIITScoreBreakdownSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  score: number | null;
  components: HIITScoreComponents | null;
}

interface Row {
  icon: typeof Dumbbell;
  label: string;
  value: number;
  max: number;
  raw: string;
}

export function HIITScoreBreakdownSheet({
  open,
  onOpenChange,
  score,
  components,
}: HIITScoreBreakdownSheetProps) {
  const navigate = useNavigate();

  const hasData = score !== null && components !== null;

  const getScoreColor = (s: number) => {
    if (s >= 75) return "text-green-500";
    if (s >= 40) return "text-primary";
    return "text-red-500";
  };

  const rows: Row[] = hasData
    ? [
        {
          icon: Dumbbell,
          label: "Workouts",
          value: components.workouts,
          max: 15,
          raw: `${components.inputs?.workoutCount ?? 0} completed this week`,
        },
        {
          icon: Flame,
          label: "Streak",
          value: components.streak,
          max: 5,
          raw: `${components.inputs?.streakDays ?? 0}-day streak`,
        },
        {
          icon: Apple,
          label: "Nutrition",
          value: components.nutrition,
          max: 10,
          raw: `${components.inputs?.nutritionDaysHit ?? 0} days hitting protein target`,
        },
        {
          icon: Moon,
          label: "Sleep",
          value: components.sleep,
          max: 10,
          raw: `${components.inputs?.sleepDaysGood ?? 0} days of 7+ hours`,
        },
        {
          icon: Zap,
          label: "Intensity",
          value: components.intensity,
          max: 10,
          raw:
            (components.inputs?.avgDurationMinutes ?? 0) > 0
              ? `Avg workout: ${components.inputs?.avgDurationMinutes} min`
              : "No workouts yet this week",
        },
      ]
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <div className="flex flex-col">
          <SheetHeader className="text-center mb-4">
            <SheetTitle className="text-base font-medium text-muted-foreground">
              Your HIIT Score
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col items-center mb-6">
            <span
              className={cn(
                "text-6xl font-bold tabular-nums",
                hasData ? getScoreColor(score!) : "text-muted-foreground"
              )}
            >
              {hasData ? score : "—"}
            </span>
            <span className="text-xs text-muted-foreground mt-1">out of 100</span>
          </div>

          {hasData ? (
            <>
              <div className="space-y-3 mb-6">
                {rows.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div
                      key={r.label}
                      className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {r.label}
                          </span>
                          <span className="text-sm font-bold text-primary tabular-nums">
                            +{r.value}
                            <span className="text-xs text-muted-foreground font-normal">
                              {" "}
                              / {r.max}
                            </span>
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{r.raw}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <details className="group mb-4">
                <summary className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer list-none">
                  <Info className="w-3.5 h-3.5" />
                  <span className="underline-offset-2 group-hover:underline">
                    How is this calculated?
                  </span>
                </summary>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Your HIIT Score starts at a baseline of 50 and climbs based on the
                  last 7 days of activity. Workouts add up to 15, streak days add up
                  to 5, protein-target days add up to 10, good sleep adds up to 10,
                  and workout intensity adds up to 10. The maximum score is 100.
                </p>
              </details>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center mb-6">
              Log a workout, meal, or sleep entry and your score will update.
            </p>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              navigate("/health-metrics");
            }}
          >
            View full health metrics
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
