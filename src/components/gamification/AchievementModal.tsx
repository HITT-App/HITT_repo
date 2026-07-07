import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Footprints, 
  Droplets, 
  Flame, 
  Dumbbell, 
  Trophy,
  Star,
  Sparkles,
  Moon,
  Heart,
  Share2
} from "lucide-react";
import { useState, useEffect } from "react";

export type AchievementType = 
  | "steps" 
  | "hydration" 
  | "calories" 
  | "workout" 
  | "hiit_score" 
  | "streak" 
  | "sleep" 
  | "weight"
  | "level_up";

interface Achievement {
  type: AchievementType;
  title: string;
  subtitle: string;
  value: string;
  message: string;
}

interface AchievementModalProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const iconMap: Record<AchievementType, React.ComponentType<{ className?: string }>> = {
  steps: Footprints,
  hydration: Droplets,
  calories: Flame,
  workout: Dumbbell,
  hiit_score: Trophy,
  streak: Star,
  sleep: Moon,
  weight: Heart,
  level_up: Trophy,
};

const gradientMap: Record<AchievementType, string> = {
  steps: "from-green-500 to-emerald-600",
  hydration: "from-cyan-500 to-blue-600",
  calories: "from-orange-500 to-red-600",
  workout: "from-primary to-orange-600",
  hiit_score: "from-amber-500 to-orange-600",
  streak: "from-purple-500 to-pink-600",
  sleep: "from-indigo-500 to-purple-600",
  weight: "from-pink-500 to-rose-600",
  level_up: "from-amber-400 via-yellow-500 to-orange-500",
};

export function AchievementModal({ achievement, onClose }: AchievementModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsAnimating(true);
      // Confetti removed — Android WebView froze the particle loop
      // mid-air. The modal's own scale-in/scale-out animation is the
      // celebration.
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [achievement]);

  if (!achievement) return null;

  const Icon = iconMap[achievement.type];
  const gradient = gradientMap[achievement.type];

  return (
    <Dialog open={!!achievement} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[340px] p-0 border-0 bg-transparent shadow-none">
        <div className="bg-card rounded-3xl p-8 text-center relative overflow-hidden border border-border/60">
          {/* Subtle shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50" />

          {/* Celebration text */}
          <div className="relative flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-lg font-semibold text-foreground">Congratulations!</span>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>

          {/* Icon */}
          <div
            className={`relative w-28 h-28 mx-auto mb-6 transition-transform duration-500 ${
              isAnimating ? "scale-0" : "scale-100"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-full opacity-20 animate-pulse`} />
            <div className={`absolute inset-2 bg-gradient-to-br ${gradient} rounded-full opacity-30`} />
            <div className={`absolute inset-4 bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center shadow-lg`}>
              <Icon className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Achievement details */}
          <h2 className="text-xl font-bold text-foreground mb-1">
            {achievement.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{achievement.subtitle}</p>

          {/* Value */}
          <div className="bg-secondary/50 rounded-2xl py-4 px-6 mb-6">
            <span className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
              {achievement.value}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm text-muted-foreground mb-6">
            {achievement.message}
          </p>

          {/* Actions */}
          <div className="relative flex flex-col gap-3">
            <Button
              className="w-full rounded-xl py-6"
              onClick={onClose}
            >
              Awesome!
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl py-4 text-primary gap-2"
              onClick={() => {
                // Create screenshot-ready share card
                const shareData = {
                  title: achievement.title,
                  text: `${achievement.value} - ${achievement.message}`,
                  url: window.location.origin,
                };
                
                if (navigator.share && navigator.canShare(shareData)) {
                  navigator.share(shareData).catch(() => {});
                } else {
                  // Fallback: copy to clipboard
                  navigator.clipboard.writeText(
                    `🏆 ${achievement.title}\n${achievement.value}\n${achievement.message}`
                  );
                }
                onClose();
              }}
            >
              <Share2 className="w-4 h-4" />
              Share Achievement
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Example achievements for testing
export const exampleAchievements: Achievement[] = [
  {
    type: "steps",
    title: "Steps Goal Reached!",
    subtitle: "Daily Goal Complete",
    value: "10,000",
    message: "You've completed your daily steps goal. Keep moving!",
  },
  {
    type: "hydration",
    title: "Hydration Complete!",
    subtitle: "Daily Goal Achieved",
    value: "8 glasses",
    message: "Great job staying hydrated today!",
  },
  {
    type: "calories",
    title: "Calorie Goal!",
    subtitle: "Burn Target Hit",
    value: "500 cal",
    message: "You've burned your target calories for today!",
  },
  {
    type: "workout",
    title: "Workout Complete!",
    subtitle: "Session Finished",
    value: "45 min",
    message: "Amazing effort! You crushed that workout!",
  },
  {
    type: "hiit_score",
    title: "HIIT Score Up!",
    subtitle: "Fitness Progress",
    value: "+15 pts",
    message: "Your fitness score is improving!",
  },
  {
    type: "streak",
    title: "Streak Extended!",
    subtitle: "Consistency Pays Off",
    value: "7 days",
    message: "You're on fire! Keep the streak alive!",
  },
  {
    type: "sleep",
    title: "Perfect Sleep!",
    subtitle: "Sleep Goal Achieved",
    value: "8 hours",
    message: "You got the recommended amount of sleep!",
  },
  {
    type: "weight",
    title: "Weight Goal!",
    subtitle: "Milestone Reached",
    value: "-5 lbs",
    message: "You've hit a major milestone! Celebrate!",
  },
  {
    type: "level_up",
    title: "Level Up!",
    subtitle: "You've reached a new level",
    value: "Level 10",
    message: "You're now a Rising Star! Keep pushing!",
  },
];
