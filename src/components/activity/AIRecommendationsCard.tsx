import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  ChevronRight, 
  RefreshCw, 
  Clock, 
  Flame,
  Footprints,
  Bike,
  Waves,
  Wind,
  Dumbbell,
  Target
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Recommendation {
  id?: string;
  activity_type: string;
  title: string;
  description: string;
  suggested_duration_minutes?: number;
  suggested_time?: string;
  intensity?: string;
  estimated_calories?: number;
  score_reward?: number;
  status?: string;
}

interface AIRecommendationsCardProps {
  recommendations: Recommendation[];
  isLoading?: boolean;
  limit?: number;
  showRefresh?: boolean;
}

const activityIcons: Record<string, React.ElementType> = {
  jogging: Footprints,
  running: Footprints,
  cycling: Bike,
  swimming: Waves,
  yoga: Wind,
  walking: Footprints,
  default: Dumbbell,
};

const intensityColors: Record<string, string> = {
  low: "bg-green-500/10 text-green-600",
  moderate: "bg-yellow-500/10 text-yellow-600",
  high: "bg-red-500/10 text-red-600",
};

export function AIRecommendationsCard({ 
  recommendations = [], 
  isLoading = false,
  limit = 3,
  showRefresh = true 
}: AIRecommendationsCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState<string>("");

  const fetchNewRecommendations = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("activity-recommendations");
      
      if (error) {
        console.error("Error fetching recommendations:", error);
        toast.error("Failed to get recommendations");
        return;
      }

      if (data?.motivationalMessage) {
        setMotivationalMessage(data.motivationalMessage);
      }

      // Refresh the recommendations query
      queryClient.invalidateQueries({ queryKey: ["activity-recommendations"] });
      toast.success("New recommendations ready!");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Something went wrong");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStartActivity = (rec: Recommendation) => {
    navigate("/log-activity", { 
      state: { 
        suggestedActivity: rec.activity_type,
        suggestedDuration: rec.suggested_duration_minutes 
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        {[...Array(limit)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const displayRecs = recommendations.slice(0, limit);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Recommendations
        </h2>
        <div className="flex items-center gap-2">
          {showRefresh && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchNewRecommendations}
              disabled={isRefreshing}
              className="text-primary"
            >
              <RefreshCw className={cn("w-4 h-4 mr-1", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Loading..." : "Refresh"}
            </Button>
          )}
        </div>
      </div>

      {motivationalMessage && (
        <Card className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <p className="text-sm text-foreground">{motivationalMessage}</p>
        </Card>
      )}

      {displayRecs.length === 0 ? (
        <Card className="p-6 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium mb-1">No recommendations yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Get personalized AI suggestions based on your activity history
          </p>
          <Button 
            onClick={fetchNewRecommendations} 
            disabled={isRefreshing}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Generate Recommendations
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayRecs.map((rec, index) => {
            const Icon = activityIcons[rec.activity_type.toLowerCase()] || activityIcons.default;
            const intensityClass = intensityColors[rec.intensity?.toLowerCase() || "moderate"];
            
            return (
              <Card 
                key={rec.id || index}
                className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                onClick={() => handleStartActivity(rec)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{rec.title}</h3>
                      {rec.intensity && (
                        <Badge variant="secondary" className={cn("text-xs", intensityClass)}>
                          {rec.intensity}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {rec.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {rec.suggested_duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rec.suggested_duration_minutes}min
                        </span>
                      )}
                      {rec.estimated_calories && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          {rec.estimated_calories}kcal
                        </span>
                      )}
                      {rec.score_reward && (
                        <span className="flex items-center gap-1 text-primary">
                          <Target className="w-3 h-3" />
                          +{rec.score_reward} score
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {recommendations.length > limit && (
        <Button 
          variant="ghost" 
          className="w-full text-primary"
          onClick={() => navigate("/activity-dashboard")}
        >
          View All Recommendations <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
