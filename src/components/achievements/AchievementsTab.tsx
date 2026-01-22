import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  useBadges, 
  useUserBadges, 
  useAchievementProgress,
  useAchievementStats 
} from "@/hooks/useAchievements";
import { 
  Heart, Target, Flame, Apple, Dumbbell, Footprints, 
  Bike, Moon, Trophy, Award, Star, Zap
} from "lucide-react";

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

const iconEmojis: Record<string, string> = {
  heart: "❤️",
  target: "🎯",
  flame: "🔥",
  apple: "🍎",
  dumbbell: "💪",
  footprints: "👣",
  bike: "🚴",
  moon: "🌙",
  trophy: "🏆",
  award: "🏅",
  star: "⭐",
  zap: "⚡",
};

const categoryColors: Record<string, string> = {
  fitness: "bg-primary",
  nutrition: "bg-purple-500",
  sleep: "bg-blue-500",
  activity: "bg-green-500",
  streak: "bg-orange-500",
  default: "bg-primary",
};

const AchievementsTab = () => {
  const navigate = useNavigate();
  const { data: badges, isLoading: badgesLoading } = useBadges();
  const { data: userBadges, isLoading: userBadgesLoading } = useUserBadges();
  const { data: progress, isLoading: progressLoading } = useAchievementProgress();
  const { data: stats } = useAchievementStats();

  const isLoading = badgesLoading || userBadgesLoading || progressLoading;
  
  // Get earned badge IDs for quick lookup
  const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
  
  // Get latest earned badges (most recent 3)
  const latestBadges = userBadges?.slice(0, 3) || [];
  
  // Get active progress (not completed)
  const activeProgress = progress?.filter(p => !p.is_completed).slice(0, 4) || [];
  
  // Get locked badges count
  const lockedCount = (badges?.length || 0) - (userBadges?.length || 0);

  if (isLoading) {
    return (
      <div className="px-4 pt-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6">
      {/* Unlocked Count */}
      <div className="text-center">
        <p className="text-5xl font-bold text-foreground">{stats?.badgesEarned || 0}</p>
        <p className="text-muted-foreground">Achievements Unlocked</p>
      </div>

      {/* Locked Badges Preview */}
      <div className="flex justify-center gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <span className="text-xs text-muted-foreground">Locked</span>
            <span className="text-[10px] text-muted-foreground/70">Let's Unlock!</span>
          </div>
        ))}
      </div>

      {/* Latest Achievement Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Latest Achievement</h3>
          <Button 
            variant="link" 
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/achievements/all")}
          >
            See All
          </Button>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {latestBadges.length > 0 ? (
              latestBadges.map((userBadge) => (
                <Card 
                  key={userBadge.id}
                  className="min-w-[120px] p-4 flex flex-col items-center gap-2 relative cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/achievements/${userBadge.badge_id}`)}
                >
                  <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full">
                    New
                  </span>
                  <div className={`w-16 h-16 rounded-2xl ${categoryColors[userBadge.badge?.category || 'default']} flex items-center justify-center text-3xl`}>
                    {iconEmojis[userBadge.badge?.icon || 'trophy'] || '🏆'}
                  </div>
                  <span className="text-sm font-medium text-center">{userBadge.badge?.name}</span>
                </Card>
              ))
            ) : (
              <Card className="min-w-[200px] p-6 flex flex-col items-center gap-2 border-dashed">
                <Trophy className="w-10 h-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground text-center">
                  Complete activities to earn badges!
                </p>
              </Card>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* Active Achievements Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground">Active Achievements</h3>
          <Button 
            variant="link" 
            className="text-primary p-0 h-auto text-sm"
            onClick={() => navigate("/achievements/all")}
          >
            See All
          </Button>
        </div>
        <div className="space-y-3">
          {activeProgress.length > 0 ? (
            activeProgress.map((achievement) => {
              const percentComplete = Math.round((achievement.current_value / achievement.target_value) * 100);
              const badge = achievement.badge;
              
              return (
                <Card 
                  key={achievement.id}
                  className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/achievements/${achievement.badge_id}`)}
                >
                  <div className={`w-12 h-12 rounded-xl ${categoryColors[badge?.category || 'default']} flex items-center justify-center text-white`}>
                    {achievementIcons[badge?.icon || 'trophy'] || <Trophy className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm">{badge?.name || 'Achievement'}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{badge?.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                        Level 1
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {achievement.current_value}/{achievement.target_value}
                      </span>
                    </div>
                    <Progress 
                      value={percentComplete} 
                      className="h-1.5 mt-2"
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {percentComplete}%
                  </span>
                </Card>
              );
            })
          ) : (
            // Show badges to work toward
            badges?.slice(0, 4).filter(b => !earnedBadgeIds.has(b.id)).map((badge) => (
              <Card 
                key={badge.id}
                className="p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/achievements/${badge.id}`)}
              >
                <div className={`w-12 h-12 rounded-xl ${categoryColors[badge.category || 'default']} flex items-center justify-center text-white`}>
                  {achievementIcons[badge.icon] || <Trophy className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground text-sm">{badge.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">
                      Level 1
                    </span>
                    <span className="text-xs text-muted-foreground">
                      0/{badge.requirement_value}
                    </span>
                  </div>
                  <Progress 
                    value={0} 
                    className="h-1.5 mt-2"
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  0%
                </span>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default AchievementsTab;
