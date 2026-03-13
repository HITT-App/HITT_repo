import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Heart, Target, Flame, Apple, Dumbbell, Footprints, 
  Bike, Moon, Trophy, Award, Star, Zap
} from "lucide-react";
import { useBadges, useUserBadges } from "@/hooks/useAchievements";
import { cn } from "@/lib/utils";

const achievementIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  heart: Heart, target: Target, flame: Flame, apple: Apple,
  dumbbell: Dumbbell, footprints: Footprints, bike: Bike, moon: Moon,
  trophy: Trophy, award: Award, star: Star, zap: Zap,
};

const categoryGradients: Record<string, string> = {
  fitness: "from-primary/80 to-primary",
  nutrition: "from-violet-500 to-purple-600",
  sleep: "from-blue-400 to-indigo-600",
  activity: "from-emerald-400 to-green-600",
  streak: "from-orange-400 to-red-500",
  milestone: "from-amber-400 to-yellow-600",
  default: "from-primary/80 to-primary",
};

const categoryGlows: Record<string, string> = {
  fitness: "shadow-primary/30",
  nutrition: "shadow-purple-500/30",
  sleep: "shadow-blue-500/30",
  activity: "shadow-green-500/30",
  streak: "shadow-orange-500/30",
  milestone: "shadow-amber-500/30",
  default: "shadow-primary/30",
};

const AllAchievements = () => {
  const navigate = useNavigate();
  const { data: badges, isLoading: badgesLoading } = useBadges();
  const { data: userBadges, isLoading: userBadgesLoading } = useUserBadges();

  const isLoading = badgesLoading || userBadgesLoading;
  const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
  const unlockedCount = userBadges?.length || 0;
  const totalCount = badges?.length || 0;
  const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  // Split into earned and locked
  const earnedBadges = badges?.filter(b => earnedBadgeIds.has(b.id)) || [];
  const lockedBadges = badges?.filter(b => !earnedBadgeIds.has(b.id)) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderBadge = (badge: typeof badges extends (infer T)[] | undefined ? T : never, isUnlocked: boolean) => {
    const Icon = achievementIcons[badge.icon] || Trophy;
    const gradient = categoryGradients[badge.category] || categoryGradients.default;
    const glow = categoryGlows[badge.category] || categoryGlows.default;

    return (
      <button
        key={badge.id}
        className="flex flex-col items-center gap-2 group"
        onClick={() => navigate(`/achievements/${badge.id}`)}
      >
        <div className="relative">
          <div
            className={cn(
              "w-[76px] h-[76px] rounded-2xl flex items-center justify-center transition-all duration-300",
              isUnlocked
                ? `bg-gradient-to-br ${gradient} shadow-lg ${glow} group-active:scale-95`
                : "bg-muted/40 border-2 border-dashed border-border group-active:scale-95"
            )}
          >
            <Icon
              className={cn(
                "w-8 h-8 transition-colors",
                isUnlocked ? "text-white" : "text-muted-foreground/40"
              )}
            />
          </div>
          {isUnlocked && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
          )}
          {!isUnlocked && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted flex items-center justify-center border border-border">
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>
        <span
          className={cn(
            "text-xs text-center font-medium leading-tight max-w-[80px]",
            isUnlocked ? "text-foreground" : "text-muted-foreground/60"
          )}
        >
          {badge.name}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">All Achievements</h1>
      </header>

      {/* Progress summary */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-center gap-4 mb-1">
          <div className="flex-1">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-3xl font-bold text-foreground">{unlockedCount}</span>
              <span className="text-sm text-muted-foreground">/ {totalCount} unlocked</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="relative w-14 h-14">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                className="stroke-primary"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${progress * 0.975} 100`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Earned section */}
      {earnedBadges.length > 0 && (
        <section className="px-5 pt-4">
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Unlocked
            <span className="text-xs text-muted-foreground font-normal">({earnedBadges.length})</span>
          </h2>
          <div className="grid grid-cols-4 gap-y-5 gap-x-2">
            {earnedBadges.map(b => renderBadge(b, true))}
          </div>
        </section>
      )}

      {/* Locked section */}
      {lockedBadges.length > 0 && (
        <section className="px-5 pt-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Locked
            <span className="text-xs font-normal">({lockedBadges.length})</span>
          </h2>
          <div className="grid grid-cols-4 gap-y-5 gap-x-2">
            {lockedBadges.map(b => renderBadge(b, false))}
          </div>
        </section>
      )}

      {totalCount === 0 && (
        <div className="text-center py-16 px-6">
          <Trophy className="w-14 h-14 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No achievements available yet.</p>
        </div>
      )}
    </div>
  );
};

export default AllAchievements;
