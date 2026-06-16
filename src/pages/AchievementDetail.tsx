import { useNavigate, useParams } from "react-router-dom";
import { HEmoji } from "@/components/HEmoji";
import { ArrowLeft, Calendar, Share2, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { 
  Heart, Target, Flame, Apple, Dumbbell, Footprints, 
  Bike, Moon, Trophy, Award, Star, Zap
} from "lucide-react";
import { useBadges, useUserBadges, useAchievementProgress } from "@/hooks/useAchievements";
import { format } from "date-fns";

// Achievement icon mapping
const achievementIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="w-12 h-12" />,
  target: <Target className="w-12 h-12" />,
  flame: <Flame className="w-12 h-12" />,
  apple: <Apple className="w-12 h-12" />,
  dumbbell: <Dumbbell className="w-12 h-12" />,
  footprints: <Footprints className="w-12 h-12" />,
  bike: <Bike className="w-12 h-12" />,
  moon: <Moon className="w-12 h-12" />,
  trophy: <Trophy className="w-12 h-12" />,
  award: <Award className="w-12 h-12" />,
  star: <Star className="w-12 h-12" />,
  zap: <Zap className="w-12 h-12" />,
};

const smallIcons: Record<string, React.ReactNode> = {
  heart: <Heart className="w-10 h-10" />,
  target: <Target className="w-10 h-10" />,
  flame: <Flame className="w-10 h-10" />,
  apple: <Apple className="w-10 h-10" />,
  dumbbell: <Dumbbell className="w-10 h-10" />,
  footprints: <Footprints className="w-10 h-10" />,
  bike: <Bike className="w-10 h-10" />,
  moon: <Moon className="w-10 h-10" />,
  trophy: <Trophy className="w-10 h-10" />,
  award: <Award className="w-10 h-10" />,
  star: <Star className="w-10 h-10" />,
  zap: <Zap className="w-10 h-10" />,
};

const AchievementDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  
  const { data: badges, isLoading: badgesLoading } = useBadges();
  const { data: userBadges, isLoading: userBadgesLoading } = useUserBadges();
  const { data: progress, isLoading: progressLoading } = useAchievementProgress();

  const isLoading = badgesLoading || userBadgesLoading || progressLoading;

  // Find the badge
  const badge = badges?.find(b => b.id === id);
  
  // Check if earned
  const userBadge = userBadges?.find(ub => ub.badge_id === id);
  const isEarned = !!userBadge;
  
  // Get progress for this badge
  const badgeProgress = progress?.find(p => p.badge_id === id);
  const currentValue = badgeProgress?.current_value || 0;
  const targetValue = badge?.requirement_value || 100;
  const progressPercent = Math.min(Math.round((currentValue / targetValue) * 100), 100);

  // Show unlock modal for newly earned badges
  useEffect(() => {
    if (isEarned && userBadge) {
      const earnedDate = new Date(userBadge.earned_at);
      const now = new Date();
      const hoursSinceEarned = (now.getTime() - earnedDate.getTime()) / (1000 * 60 * 60);
      
      // Show modal if earned within last 24 hours
      if (hoursSinceEarned < 24) {
        setShowUnlockModal(true);
      }
    }
  }, [isEarned, userBadge]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Achievement not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">Achievement</h1>
        <div className="w-[38px]" />
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 pb-28">
        {/* Achievement Badge */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            {/* Hexagonal badge */}
            <div className="w-32 h-32 relative">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={isEarned ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                    <stop offset="100%" stopColor={isEarned ? "hsl(24, 95%, 53%)" : "hsl(var(--muted-foreground))"} />
                  </linearGradient>
                </defs>
                <polygon 
                  points="50,5 93,25 93,75 50,95 7,75 7,25" 
                  fill="url(#badgeGradient)"
                  stroke={isEarned ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth="2"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {isEarned ? (
                  <span className="text-primary-foreground">
                    {achievementIcons[badge.icon] || <Trophy className="w-12 h-12" />}
                  </span>
                ) : (
                  <Lock className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          <span className={`text-sm font-medium mb-2 ${isEarned ? 'text-primary' : 'text-muted-foreground'}`}>
            {isEarned ? 'EARNED' : 'LOCKED'}
          </span>
          
          {isEarned && userBadge && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
              <Calendar className="w-4 h-4" />
              Earned {format(new Date(userBadge.earned_at), 'MMM yyyy')}
            </div>
          )}

          <h1 className="text-2xl font-bold text-foreground mb-2">{badge.name}</h1>
          <p className="text-center text-muted-foreground max-w-xs">
            {badge.description}
          </p>
        </div>

        {/* Progress Card */}
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                <span className="text-muted-foreground"><HEmoji name="leaderboard" size={20}/></span>
              </div>
              <span className="text-sm font-medium">
                {isEarned ? 'Completed' : 'In Progress'}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {badge.requirement_type}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {currentValue} / {targetValue}
            </span>
            <span className="font-medium">{progressPercent}%</span>
          </div>
          
          <Progress value={progressPercent} className="h-2" />
        </Card>

        {/* Share Button */}
        <Button 
          className="w-full"
          onClick={() => setShowUnlockModal(true)}
          disabled={!isEarned}
        >
          {isEarned ? (
            <>Share <Share2 className="w-4 h-4 ml-2" /></>
          ) : (
            <>Keep Going! <Zap className="w-4 h-4 ml-2" /></>
          )}
        </Button>
      </div>

      {/* Achievement Unlocked Modal */}
      <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal}>
        <DialogContent className="max-w-sm rounded-3xl overflow-hidden p-0">
          {/* Confetti header */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-8 relative overflow-hidden">
            {/* Confetti dots */}
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['hsl(24, 95%, 53%)', 'hsl(174, 60%, 55%)', 'hsl(51, 100%, 70%)', 'hsl(158, 55%, 73%)', 'hsl(0, 85%, 73%)'][i % 5],
                    animationDelay: `${Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
            
            {/* Badge */}
            <div className="relative flex justify-center">
              <div className="w-24 h-24 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <defs>
                    <linearGradient id="modalBadgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(24, 95%, 53%)" />
                    </linearGradient>
                  </defs>
                  <polygon 
                    points="50,5 93,25 93,75 50,95 7,75 7,25" 
                    fill="url(#modalBadgeGradient)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-primary-foreground">
                  {smallIcons[badge.icon] || <Trophy className="w-10 h-10" />}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            <p className="text-primary text-sm font-medium mb-2">ACHIEVEMENT UNLOCKED!</p>
            <h2 className="text-2xl font-bold text-foreground mb-2">{badge.name}</h2>
            <p className="text-muted-foreground text-sm mb-6">{badge.description}</p>

            <Button 
              className="w-full mb-3"
              onClick={() => setShowUnlockModal(false)}
            >
              Great, thanks! ✓
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setShowUnlockModal(false)}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default AchievementDetail;
