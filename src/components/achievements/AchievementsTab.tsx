import { useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Lock, Trophy, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { 
  useBadges, useUserBadges, useAchievementProgress, useAchievementStats 
} from "@/hooks/useAchievements";
import { 
  Heart, Target, Apple, Dumbbell, Footprints, 
  Bike, Moon, Award, Zap
} from "lucide-react";
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
  fitness: "shadow-primary/25",
  nutrition: "shadow-purple-500/25",
  sleep: "shadow-blue-500/25",
  activity: "shadow-green-500/25",
  streak: "shadow-orange-500/25",
  milestone: "shadow-amber-500/25",
  default: "shadow-primary/25",
};

const AchievementsTab = () => {
  const navigate = useNavigate();
  const { data: badges, isLoading: badgesLoading } = useBadges();
  const { data: userBadges, isLoading: userBadgesLoading } = useUserBadges();
  const { data: progress, isLoading: progressLoading } = useAchievementProgress();
  const { data: stats } = useAchievementStats();

  const isLoading = badgesLoading || userBadgesLoading || progressLoading;
  const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);
  const latestBadges = userBadges?.slice(0, 5) || [];
  const activeProgress = progress?.filter(p => !p.is_completed).slice(0, 4) || [];
  const totalBadges = badges?.length || 0;
  const earnedCount = stats?.badgesEarned || 0;
  const completionPct = totalBadges > 0 ? Math.round((earnedCount / totalBadges) * 100) : 0;

  if (isLoading) {
    return (
      <div className="px-4 pt-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 space-y-6 pb-4">
      {/* Hero ring + count */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-28 h-28">
          <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="2.5" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              className="stroke-primary"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${completionPct * 0.975} 100`}
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-foreground leading-none">{earnedCount}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">of {totalBadges}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Achievements Unlocked</p>
      </div>

      {/* Latest Earned — horizontal scroll */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">Recently Earned</h3>
          <Button 
            variant="link" className="text-primary p-0 h-auto text-xs gap-0.5"
            onClick={() => navigate("/achievements/all")}
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {latestBadges.length > 0 ? (
              latestBadges.map((ub) => {
                const badge = ub.badge;
                const Icon = achievementIcons[badge?.icon || 'trophy'] || Trophy;
                const gradient = categoryGradients[badge?.category || 'default'] || categoryGradients.default;
                const glow = categoryGlows[badge?.category || 'default'] || categoryGlows.default;
                return (
                  <button
                    key={ub.id}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
                    onClick={() => navigate(`/achievements/${ub.badge_id}`)}
                  >
                    <div className={cn(
                      "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform group-active:scale-90",
                      gradient, glow
                    )}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-[11px] text-foreground font-medium text-center max-w-[72px] truncate">
                      {badge?.name}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="flex items-center gap-3 py-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-16 h-16 rounded-2xl bg-muted/40 border-2 border-dashed border-border flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground ml-1">Complete activities to earn badges!</p>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* Active Achievements — progress cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground text-sm">In Progress</h3>
          <Button 
            variant="link" className="text-primary p-0 h-auto text-xs gap-0.5"
            onClick={() => navigate("/achievements/all")}
          >
            See All <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
        <div className="space-y-2.5">
          {(activeProgress.length > 0
            ? activeProgress.map((achievement) => {
                const pct = Math.round((achievement.current_value / achievement.target_value) * 100);
                const badge = achievement.badge;
                const Icon = achievementIcons[badge?.icon || 'trophy'] || Trophy;
                const gradient = categoryGradients[badge?.category || 'default'] || categoryGradients.default;
                return (
                  <Card 
                    key={achievement.id}
                    className="p-3.5 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 active:bg-secondary/50 transition-colors border-border"
                    onClick={() => navigate(`/achievements/${achievement.badge_id}`)}
                  >
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", gradient)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm leading-tight">{badge?.name || 'Achievement'}</h4>
                      <p className="text-[11px] text-muted-foreground truncate">{badge?.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[11px] font-semibold text-foreground tabular-nums">{pct}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })
            : badges?.filter(b => !earnedBadgeIds.has(b.id)).slice(0, 4).map((badge) => {
                const Icon = achievementIcons[badge.icon] || Trophy;
                const gradient = categoryGradients[badge.category || 'default'] || categoryGradients.default;
                return (
                  <Card 
                    key={badge.id}
                    className="p-3.5 flex items-center gap-3 cursor-pointer hover:bg-secondary/30 active:bg-secondary/50 transition-colors border-border"
                    onClick={() => navigate(`/achievements/${badge.id}`)}
                  >
                    <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0", gradient)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm leading-tight">{badge.name}</h4>
                      <p className="text-[11px] text-muted-foreground truncate">{badge.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={0} className="h-1.5 flex-1" />
                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">0%</span>
                      </div>
                    </div>
                  </Card>
                );
              })
          )}
        </div>
      </section>
    </div>
  );
};

export default AchievementsTab;
