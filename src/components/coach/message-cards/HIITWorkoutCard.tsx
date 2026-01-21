import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Star, Flame } from 'lucide-react';

interface HIITWorkoutCardProps {
  title?: string;
  coach?: string;
  duration?: string;
  rating?: number;
  calories?: string;
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  imageUrl?: string;
}

export function HIITWorkoutCard({
  title = "Full Body HIIT Exercise",
  coach = "Coach Billie White",
  duration = "10-20",
  rating = 4.3,
  calories = "100-200",
  level = "Beginner",
  imageUrl,
}: HIITWorkoutCardProps) {
  return (
    <Card className="border-border/50 overflow-hidden">
      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-secondary to-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Flame className="w-16 h-16 text-primary/30" />
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-background/80 text-foreground">
          {level}
        </Badge>
      </div>

      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1">
          <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
            👤
          </span>
          With {coach}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{duration}</span>
            <span className="text-xs text-muted-foreground">min</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span>{rating}</span>
            <span className="text-xs text-muted-foreground">stars</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span>{calories}</span>
            <span className="text-xs text-muted-foreground">kcal</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
