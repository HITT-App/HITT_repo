import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Analytics } from '@/lib/analytics';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { HIITLogo } from '@/components/HIITLogo';
import { Clock, Flame, Star, ChevronRight, Sparkles, Dumbbell } from 'lucide-react';
import { storageImage, IMG } from '@/lib/storage-image';

interface Workout {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  calories_burned: number;
  body_areas: string[];
  thumbnail_url: string | null;
  rating: number;
  score?: number;
}

interface WorkoutRecommendationsProps {
  limit?: number;
  showMessage?: boolean;
}

export function WorkoutRecommendations({ limit = 3, showMessage = true }: WorkoutRecommendationsProps) {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Workout[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('workout-recommendations');
      
      if (error) throw error;
      
      setRecommendations(data.recommendations?.slice(0, limit) || []);
      setMessage(data.message || '');
      Analytics.planGenerated('workout');
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Fallback to fetching top-rated workouts
      const { data } = await supabase
        .from('workouts')
        .select('*')
        .order('rating', { ascending: false })
        .limit(limit);
      setRecommendations(data || []);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        {[...Array(limit)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showMessage && message && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Recommendation</p>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {recommendations.map((workout) => (
          <Card 
            key={workout.id}
            className="cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={() => navigate(`/workout/${workout.id}`)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {workout.thumbnail_url ? (
                  <img src={storageImage(workout.thumbnail_url, IMG.card)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Dumbbell className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{workout.title}</h3>
                  {workout.score && workout.score > 50 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      <Star className="w-2.5 h-2.5 mr-0.5 fill-primary text-primary" />
                      Match
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {workout.duration_minutes}min
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {workout.calories_burned}kcal
                  </span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {workout.difficulty}
                  </Badge>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Button 
        variant="ghost" 
        className="w-full text-primary"
        onClick={() => navigate('/workout-library')}
      >
        View All Workouts <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
