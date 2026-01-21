import { Apple, CheckCircle2, Star } from 'lucide-react';

interface Recommendation {
  id: string;
  category: 'Nutrition';
  title: string;
  tasks: number;
  score: number;
}

interface NutritionCardProps {
  recommendations?: Recommendation[];
}

const defaultRecommendations: Recommendation[] = [
  { id: '1', category: 'Nutrition', title: 'Eat More Vegetables', tasks: 4, score: 2 },
  { id: '2', category: 'Nutrition', title: 'Consume less carb & oil', tasks: 3, score: 2 },
];

export function NutritionCard({ recommendations = defaultRecommendations }: NutritionCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-4">
        <Apple className="w-4 h-4 text-green-500" />
        <span className="text-sm font-semibold text-foreground">Fitness Recommendation</span>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <Apple className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <span className="text-xs text-primary font-medium">{rec.category}</span>
                <h4 className="text-sm font-medium text-foreground">{rec.title}</h4>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{rec.tasks} Tasks</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                <span>+{rec.score} score</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full text-center text-sm text-primary font-medium mt-4 hover:underline">
        View All
      </button>
    </div>
  );
}
