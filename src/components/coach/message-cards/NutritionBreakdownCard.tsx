import { Card, CardContent } from '@/components/ui/card';

interface NutritionBreakdownCardProps {
  consumed?: number;
  target?: number;
  protein?: { current: number; goal: number };
  fat?: { current: number; goal: number };
  carbs?: { current: number; goal: number };
}

export function NutritionBreakdownCard({ 
  consumed = 2181, 
  target = 2500,
  protein = { current: 23, goal: 72 },
  fat = { current: 15, goal: 20 },
  carbs = { current: 125, goal: 220 },
}: NutritionBreakdownCardProps) {
  const percentage = Math.round((consumed / target) * 100);
  const remaining = target - consumed;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <span className="text-lg">🥗</span>
            Nutrition Breakdown
          </h3>
        </div>

        <div className="flex items-center gap-6">
          {/* Circular Progress */}
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-secondary"
              />
              <circle
                cx="56"
                cy="56"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${percentage * 3.01} 301`}
                strokeLinecap="round"
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{consumed.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">kcal total</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{remaining}</span>
              <span className="text-muted-foreground">{target.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              consumed &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; target
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${(protein.current / protein.goal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Protein</p>
            <p className="text-sm font-medium">{protein.current}/{protein.goal}g</p>
          </div>
          <div className="text-center">
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-yellow-500 rounded-full" 
                style={{ width: `${(fat.current / fat.goal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Fat</p>
            <p className="text-sm font-medium">{fat.current}/{fat.goal}g</p>
          </div>
          <div className="text-center">
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-green-500 rounded-full" 
                style={{ width: `${(carbs.current / carbs.goal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Carbs</p>
            <p className="text-sm font-medium">{carbs.current}/{carbs.goal}g</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4 text-center">
          You're on track for your calorie goal today! Keep it up, okay!
        </p>

        <button className="text-primary text-sm font-medium mt-2 w-full text-center">
          See All Insights
        </button>
      </CardContent>
    </Card>
  );
}
