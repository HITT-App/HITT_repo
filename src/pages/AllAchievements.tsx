import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Heart, Target, Flame, Apple, Dumbbell, Footprints, 
  Bike, Moon, Trophy, Award, Star, Zap, HelpCircle
} from "lucide-react";
import { useBadges, useUserBadges } from "@/hooks/useAchievements";

// Achievement icon mapping
const achievementIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="w-6 h-6" />,
  target: <Target className="w-6 h-6" />,
  flame: <Flame className="w-6 h-6" />,
  apple: <Apple className="w-6 h-6" />,
  dumbbell: <Dumbbell className="w-6 h-6" />,
  footprints: <Footprints className="w-6 h-6" />,
  bike: <Bike className="w-6 h-6" />,
  moon: <Moon className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
};

const AllAchievements = () => {
  const navigate = useNavigate();
  const { data: badges, isLoading: badgesLoading } = useBadges();
  const { data: userBadges, isLoading: userBadgesLoading } = useUserBadges();

  const isLoading = badgesLoading || userBadgesLoading;
  
  // Get earned badge IDs for quick lookup
  const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
  
  const unlockedCount = userBadges?.length || 0;
  const totalCount = badges?.length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      <div className="px-4">
        <h1 className="text-2xl font-bold text-foreground mb-2">My Achievements</h1>
        <p className="text-muted-foreground mb-6">
          You have unlocked {unlockedCount} of {totalCount} achievements
        </p>

        {/* Achievements Grid */}
        <div className="grid grid-cols-3 gap-4">
          {badges?.map((badge) => {
            const isUnlocked = earnedBadgeIds.has(badge.id);
            
            return (
              <div 
                key={badge.id}
                className="flex flex-col items-center gap-2 cursor-pointer"
                onClick={() => navigate(`/achievements/${badge.id}`)}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isUnlocked 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground" 
                    : "bg-muted/50 text-muted-foreground border-2 border-dashed border-muted-foreground/30"
                }`}>
                  {isUnlocked ? (
                    achievementIcons[badge.icon] || <Trophy className="w-6 h-6" />
                  ) : (
                    <HelpCircle className="w-6 h-6" />
                  )}
                </div>
                <span className="text-xs text-center text-muted-foreground">
                  {badge.name}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {isUnlocked ? "Unlocked" : "Locked"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AllAchievements;
