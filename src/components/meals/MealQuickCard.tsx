import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Users } from "lucide-react";

import mealImage from "@/assets/meal-steak-salsa.jpg";
import { storageImage, IMG } from "@/lib/storage-image";

interface MealQuickCardProps {
  meal: {
    id: string;
    name: string;
    category: string;
    calories?: number | null;
    prep_time_minutes?: number | null;
    cook_time_minutes?: number | null;
    image_url?: string | null;
    servings?: number | null;
  };
}

export function MealQuickCard({ meal }: MealQuickCardProps) {
  const navigate = useNavigate();
  const totalTime = (meal.prep_time_minutes || 0) + (meal.cook_time_minutes || 0);

  return (
    <Card 
      className="overflow-hidden border-border/50 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/meal/${meal.id}`)}
    >
      {/* Image */}
      <div className="relative h-40">
        <img 
          src={storageImage(meal.image_url || mealImage, IMG.card)} 
          alt={meal.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Category Badge */}
      <div className="px-3 -mt-3 relative z-10">
        <Badge className="bg-primary/90 text-primary-foreground text-xs">
          {meal.category.charAt(0).toUpperCase() + meal.category.slice(1)}
        </Badge>
      </div>

      <CardContent className="p-3 pt-2">
        {/* Title */}
        <h3 className="font-semibold text-foreground text-lg leading-tight">
          {meal.name}
        </h3>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {totalTime || 30}min
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-primary" />
            {meal.calories || 250}kcal
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {meal.servings || 1} plate
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 rounded-lg text-xs"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/meal/${meal.id}`);
            }}
          >
            See Details
          </Button>
          <Button 
            size="sm" 
            className="flex-1 rounded-lg text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              // Add meal logic
            }}
          >
            Add Meal +
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default MealQuickCard;
