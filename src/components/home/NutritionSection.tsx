import { ChevronRight, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDailyNutrition } from "@/hooks/useDailyNutrition";

interface NutritionSectionProps {
  consumed?: number;
  target?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  hasData?: boolean;
}

export function NutritionSection({
  consumed: consumedProp = 2181,
  target: targetProp = 2500,
  protein: proteinProp = 85,
  carbs: carbsProp = 180,
  fat: fatProp = 65,
  hasData = true,
}: NutritionSectionProps) {
  const navigate = useNavigate();
  const nutrition = useDailyNutrition();

  // Use live hook values; fall back to props only while the hook hasn't loaded yet
  const consumed = nutrition.loading ? consumedProp : nutrition.calories.consumed;
  const target = nutrition.loading ? targetProp : nutrition.calories.target;
  const protein = nutrition.loading ? proteinProp : nutrition.protein.consumed;
  const carbs = nutrition.loading ? carbsProp : nutrition.carbs.consumed;
  const fat = nutrition.loading ? fatProp : nutrition.fat.consumed;
  const percentage = Math.min((consumed / target) * 100, 100);
  const remaining = target - consumed;

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
                <p className="text-2xl font-bold text-foreground">{consumed.toLocaleString()}</p>
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
                  <span className="text-lg font-bold text-foreground">{remaining > 0 ? remaining : 0}</span>
                  <span className="text-xs text-muted-foreground">kcal left</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{target.toLocaleString()}</p>
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
                <Progress value={(protein / 150) * 100} className="h-1.5 bg-secondary [&>div]:bg-red-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Carbs</span>
                  <span className="text-xs font-medium text-foreground">{carbs}g</span>
                </div>
                <Progress value={(carbs / 250) * 100} className="h-1.5 bg-secondary [&>div]:bg-yellow-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Fat</span>
                  <span className="text-xs font-medium text-foreground">{fat}g</span>
                </div>
                <Progress value={(fat / 80) * 100} className="h-1.5 bg-secondary [&>div]:bg-blue-500" />
              </div>
            </div>

            {/* Encouragement */}
            <p className="text-xs text-center text-muted-foreground mb-2">
              You're on track for your calorie goal today!<br />
              Keep it up, champ!
            </p>

          </>
        )}
      </Card>
    </div>
  );
}
