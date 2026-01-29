import { cn } from "@/lib/utils";
import { Star, Zap, Trophy, Crown, Flame, Shield, Award } from "lucide-react";

interface LevelBadgeProps {
  level: number;
  title: string;
  xp: number;
  size?: "sm" | "md" | "lg";
  showXP?: boolean;
}

const levelConfig = {
  Rookie: { icon: Star, color: "from-gray-400 to-gray-500" },
  "Rising Star": { icon: Zap, color: "from-blue-400 to-blue-600" },
  Warrior: { icon: Shield, color: "from-green-400 to-emerald-600" },
  Champion: { icon: Trophy, color: "from-amber-400 to-orange-500" },
  Legend: { icon: Flame, color: "from-orange-500 to-red-600" },
  Elite: { icon: Crown, color: "from-purple-500 to-pink-600" },
  Grandmaster: { icon: Award, color: "from-yellow-400 via-amber-500 to-yellow-600" },
};

export function LevelBadge({ level, title, xp, size = "md", showXP = false }: LevelBadgeProps) {
  const config = levelConfig[title as keyof typeof levelConfig] || levelConfig.Rookie;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  // Calculate XP progress to next level
  const currentLevelXP = (level - 1) ** 2 * 100;
  const nextLevelXP = level ** 2 * 100;
  const progressToNext = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center",
          `bg-gradient-to-br ${config.color}`,
          sizeClasses[size]
        )}
      >
        <Icon className={cn("text-white", iconSizes[size])} />
        {/* Level number badge */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
          <span className="text-[10px] font-bold">{level}</span>
        </div>
      </div>

      <div>
        <p className={cn("font-semibold text-foreground", textSizes[size])}>{title}</p>
        {showXP && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", config.color)}
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {xp.toLocaleString()} XP
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
