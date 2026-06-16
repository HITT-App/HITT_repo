import { ChevronRight, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";

interface NutritionSectionProps {
  hasData?: boolean;
}

export function NutritionSection({ hasData = true }: NutritionSectionProps) {
  const navigate = useNavigate();
  const nutrition = useDailyNutrition();

  const consumed = nutrition.calories.consumed;
  const target = nutrition.calories.target;
  const protein = nutrition.protein.consumed;
  const carbs = nutrition.carbs.consumed;
  const fat = nutrition.fat.consumed;
  const proteinTarget = nutrition.protein.target;
  const carbsTarget = nutrition.carbs.target;
  const fatTarget = nutrition.fat.target;

  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const remaining = Math.max(target - consumed, 0);

  const encouragement =
    percentage >= 100
      ? "You've hit your calorie goal for today!"
      : percentage >= 75
        ? "Almost there — great work today!"
        : percentage >= 40
          ? "Good progress — keep fuelling up!"
          : consumed === 0
            ? "Nothing logged yet — tap to add your first meal."
            : "Early days — keep going!";

  return (
    <div className="px-5 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Nutrition</h2>
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate("/nutrition-dashboard")}
        >
          See All
        </Button>
      </div>

      <Card className="p-4 bg-card border border-border/60">
        {!hasData ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
              <Utensils className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              You haven't set up your nutrition goals yet.<br />
              Let's set it up today.
            </p>
            <Button
              variant="link"
              className="text-primary"
              onClick={() => navigate("/nutrition")}
            >
              Set Nutrition Goals
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ) : (
          <>
            {/* Calories Overview */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {nutrition.loading ? "—" : consumed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">consumed</p>
              </div>

              <div className="relative w-20 h-20">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="hsl(var(--secondary))"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(percentage / 100) * 220} 220`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-foreground">
                    {nutrition.loading ? "—" : remaining}
                  </span>
                  <span className="text-xs text-muted-foreground">kcal left</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {nutrition.loading ? "—" : target.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">target</p>
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Protein</span>
                  <span className="text-xs font-medium text-foreground">{protein}g</span>
                </div>
                <Progress value={proteinTarget > 0 ? (protein / proteinTarget) * 100 : 0} className="h-1.5 bg-secondary [&>div]:bg-red-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Carbs</span>
                  <span className="text-xs font-medium text-foreground">{carbs}g</span>
                </div>
                <Progress value={carbsTarget > 0 ? (carbs / carbsTarget) * 100 : 0} className="h-1.5 bg-secondary [&>div]:bg-yellow-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Fat</span>
                  <span className="text-xs font-medium text-foreground">{fat}g</span>
                </div>
                <Progress value={fatTarget > 0 ? (fat / fatTarget) * 100 : 0} className="h-1.5 bg-secondary [&>div]:bg-blue-500" />
              </div>
            </div>

            {/* Encouragement */}
            {!nutrition.loading && (
              <p className="text-xs text-center text-muted-foreground mb-2">
                {encouragement}
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
