import { Play, Clock, Flame, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorkoutCardProps {
  title?: string;
  coach?: string;
  duration?: number;
  rating?: number;
  calories?: number;
  level?: 'Beginner' | 'Intermediate' | 'Advanced';
  imageUrl?: string;
}

export function WorkoutCard({ 
  title = 'Full Body HIIT Exercise',
  coach = 'Coach Billie White',
  duration = 25,
  rating = 4.3,
  calories = 241,
  level = 'Beginner',
  imageUrl
}: WorkoutCardProps) {
  const navigate = useNavigate();

  const levelColors = {
    Beginner: 'bg-green-500',
    Intermediate: 'bg-yellow-500',
    Advanced: 'bg-red-500',
  };

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Play className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Workout Recommendation</span>
      </div>

      {/* Image placeholder */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-secondary">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center">
              <Play className="w-8 h-8 text-primary" />
            </div>
          </div>
        )}
        
        {/* Level badge */}
        <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-medium text-white ${levelColors[level]}`}>
          {level}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">With {coach}</p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{duration}m</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" />
            <span>{rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4" />
            <span>{calories}c</span>
          </div>
        </div>
      </div>
    </div>
  );
}
