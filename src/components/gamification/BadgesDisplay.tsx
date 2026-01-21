import { 
  Footprints, Rocket, Target, Medal, Crown, 
  Flame, Zap, Trophy, Shield, Star, Lock 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
}

interface BadgesDisplayProps {
  allBadges: Badge[];
  earnedBadgeIds: string[];
  showLocked?: boolean;
  compact?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  footprints: Footprints,
  rocket: Rocket,
  target: Target,
  medal: Medal,
  crown: Crown,
  flame: Flame,
  zap: Zap,
  trophy: Trophy,
  shield: Shield,
  star: Star,
};

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  milestone: { 
    bg: "bg-gradient-to-br from-blue-500/20 to-purple-500/20", 
    text: "text-blue-400",
    border: "border-blue-500/30"
  },
  streak: { 
    bg: "bg-gradient-to-br from-orange-500/20 to-red-500/20", 
    text: "text-orange-400",
    border: "border-orange-500/30"
  },
};

export function BadgesDisplay({ 
  allBadges, 
  earnedBadgeIds, 
  showLocked = true,
  compact = false 
}: BadgesDisplayProps) {
  const earnedBadges = allBadges.filter(b => earnedBadgeIds.includes(b.id));
  const lockedBadges = allBadges.filter(b => !earnedBadgeIds.includes(b.id));

  const displayBadges = showLocked 
    ? [...earnedBadges, ...lockedBadges]
    : earnedBadges;

  if (compact) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {earnedBadges.slice(0, 5).map(badge => {
          const Icon = iconMap[badge.icon] || Star;
          const colors = categoryColors[badge.category] || categoryColors.milestone;
          return (
            <div
              key={badge.id}
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border",
                colors.bg,
                colors.border
              )}
              title={`${badge.name}: ${badge.description}`}
            >
              <Icon className={cn("w-5 h-5", colors.text)} />
            </div>
          );
        })}
        {earnedBadges.length > 5 && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-muted border border-border">
            <span className="text-xs font-medium text-muted-foreground">
              +{earnedBadges.length - 5}
            </span>
          </div>
        )}
        {earnedBadges.length === 0 && (
          <p className="text-sm text-muted-foreground">No badges yet</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Earned Badges Section */}
      {earnedBadges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Earned ({earnedBadges.length})
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {earnedBadges.map(badge => {
              const Icon = iconMap[badge.icon] || Star;
              const colors = categoryColors[badge.category] || categoryColors.milestone;
              return (
                <div
                  key={badge.id}
                  className="group relative"
                >
                  <div
                    className={cn(
                      "w-full aspect-square rounded-2xl flex items-center justify-center border-2 transition-transform hover:scale-105",
                      colors.bg,
                      colors.border
                    )}
                  >
                    <Icon className={cn("w-8 h-8", colors.text)} />
                  </div>
                  <p className="text-[10px] text-center mt-1 text-foreground font-medium truncate">
                    {badge.name}
                  </p>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-40">
                    <p className="text-xs font-medium text-foreground">{badge.name}</p>
                    <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Badges Section */}
      {showLocked && lockedBadges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Locked ({lockedBadges.length})
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {lockedBadges.map(badge => {
              const Icon = iconMap[badge.icon] || Star;
              return (
                <div
                  key={badge.id}
                  className="group relative"
                >
                  <div className="w-full aspect-square rounded-2xl flex items-center justify-center border-2 border-dashed border-border bg-muted/30 opacity-50">
                    <div className="relative">
                      <Icon className="w-8 h-8 text-muted-foreground" />
                      <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <p className="text-[10px] text-center mt-1 text-muted-foreground truncate">
                    {badge.name}
                  </p>
                  
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-40">
                    <p className="text-xs font-medium text-foreground">{badge.name}</p>
                    <p className="text-[10px] text-muted-foreground">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {displayBadges.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Complete workouts to earn badges!</p>
        </div>
      )}
    </div>
  );
}
