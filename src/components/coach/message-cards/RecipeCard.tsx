import { Utensils, Clock, Flame } from 'lucide-react';
import { HEmoji } from '@/components/HEmoji';

interface RecipeCardProps {
  title?: string;
  description?: string;
  calories?: number;
  servings?: number;
  imageUrl?: string;
}

export function RecipeCard({ 
  title = 'Apple & Almond Rush',
  description = 'Quick & Easy Food Recipe',
  calories = 315,
  servings = 22,
  imageUrl
}: RecipeCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Utensils className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Food Recipe</span>
      </div>

      {/* Image */}
      <div className="h-32 bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <HEmoji name="nutrition" size={40}/>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4" />
            <span>{calories}B</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{servings}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
