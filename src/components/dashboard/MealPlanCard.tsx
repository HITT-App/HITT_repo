import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const meals = [
  { time: 'Breakfast', name: 'Protein Oatmeal', calories: 450, image: '🥣' },
  { time: 'Lunch', name: 'Grilled Chicken Salad', calories: 550, image: '🥗' },
  { time: 'Snack', name: 'Greek Yogurt', calories: 200, image: '🥛' },
  { time: 'Dinner', name: 'Salmon & Vegetables', calories: 600, image: '🍽️' },
];

export function MealPlanCard() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Today's Meals</h2>
        <button
          onClick={() => navigate('/nutrition')}
          className="text-sm text-primary font-medium flex items-center gap-1"
        >
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {meals.map((meal, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
          >
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl">
              {meal.image}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{meal.time}</p>
              <p className="font-medium text-sm">{meal.name}</p>
            </div>
            <span className="text-sm font-medium text-primary">{meal.calories} cal</span>
          </div>
        ))}
      </div>

      {/* Daily Summary */}
      <div className="mt-3 p-3 rounded-xl bg-secondary/50 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Total Today</span>
        <span className="font-semibold">1,800 / 2,400 cal</span>
      </div>
    </div>
  );
}
