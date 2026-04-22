import { ArrowLeft, Droplet, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";

function pct(consumed: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((consumed / target) * 100));
}

function round(n: number): number {
  return Math.round(n);
}

const Nutrition = () => {
  const navigate = useNavigate();
  const { calories, protein, carbs, fat, waterMl, loading } = useDailyNutrition();

  const waterGlassesConsumed = Math.round(waterMl.consumed / 250);
  const waterGlassesTarget = Math.round(waterMl.target / 250);

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">Nutrition</h1>
      </header>

      <div className="p-4 space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Daily Calories</span>
            <span className="text-sm font-medium tabular-nums">
              {loading ? "—" : `${round(calories.consumed).toLocaleString()} / ${calories.target.toLocaleString()}`}
            </span>
          </div>
          <Progress value={loading ? 0 : pct(calories.consumed, calories.target)} className="h-3 mb-4" />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">{loading ? "—" : `${round(protein.consumed)}g`}</p>
              <p className="text-xs text-muted-foreground">Protein</p>
              <p className="text-xs text-muted-foreground mt-0.5">of {protein.target}g</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">{loading ? "—" : `${round(carbs.consumed)}g`}</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
              <p className="text-xs text-muted-foreground mt-0.5">of {carbs.target}g</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums">{loading ? "—" : `${round(fat.consumed)}g`}</p>
              <p className="text-xs text-muted-foreground">Fat</p>
              <p className="text-xs text-muted-foreground mt-0.5">of {fat.target}g</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Droplet className="w-6 h-6 text-blue-400" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Water Intake</p>
              <p className="font-semibold text-foreground tabular-nums">
                {loading ? "—" : `${waterGlassesConsumed} / ${waterGlassesTarget} glasses`}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/health-metrics")}
              aria-label="Log water"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        <Button className="w-full btn-primary" onClick={() => navigate("/log-meal")}>
          <Plus className="w-4 h-4 mr-2" />
          Log Meal
        </Button>
      </div>
    </div>
  );
};

export default Nutrition;
