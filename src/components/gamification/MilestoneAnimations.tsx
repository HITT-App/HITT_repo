import { useEffect, useState, useRef } from "react";
import { HEmoji } from "@/components/HEmoji";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flame, Trophy, Crown, Star, Sparkles, Share2 } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/utils";

export type MilestoneType = 
  | "streak_7" 
  | "streak_30" 
  | "streak_100"
  | "workouts_100" 
  | "personal_record";

interface MilestoneConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  gradient: string;
  confettiColors: string[];
  badgeText: string;
  message: string;
}

const milestoneConfigs: Record<MilestoneType, MilestoneConfig> = {
  streak_7: {
    icon: Flame,
    title: "7-Day Streak!",
    subtitle: "One Week Strong",
    gradient: "from-orange-500 via-red-500 to-orange-600",
    confettiColors: ["#f97316", "#ef4444", "#fb923c"],
    badgeText: "Week Warrior",
    message: "You've built a week of consistency. That's how champions are made!",
  },
  streak_30: {
    icon: Crown,
    title: "👑 30-Day Streak!",
    subtitle: "Monthly Champion",
    gradient: "from-amber-400 via-yellow-500 to-amber-600",
    confettiColors: ["#f59e0b", "#fbbf24", "#d97706"],
    badgeText: "Golden Streak",
    message: "A full month of dedication! You've unlocked the Golden Badge!",
  },
  streak_100: {
    icon: Trophy,
    title: "100-Day Streak!",
    subtitle: "Platinum Legend",
    gradient: "from-slate-300 via-white to-slate-400",
    confettiColors: ["#e2e8f0", "#f1f5f9", "#cbd5e1"],
    badgeText: "Platinum Status",
    message: "100 days of unwavering commitment. You are truly legendary!",
  },
  workouts_100: {
    icon: Star,
    title: "⭐ 100 Workouts!",
    subtitle: "Century Milestone",
    gradient: "from-purple-500 via-violet-500 to-purple-600",
    confettiColors: ["#a855f7", "#8b5cf6", "#7c3aed"],
    badgeText: "Century Club",
    message: "100 workouts completed! You're in the elite Century Club now!",
  },
  personal_record: {
    icon: Trophy,
    title: "🎯 New Personal Record!",
    subtitle: "You Beat Yourself",
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    confettiColors: ["#22c55e", "#10b981", "#14b8a6"],
    badgeText: "PR Crusher",
    message: "You just broke your own record! The only limit is you!",
  },
};

interface MilestoneModalProps {
  milestone: MilestoneType | null;
  value?: string;
  onClose: () => void;
}

export function MilestoneModal({ milestone, value, onClose }: MilestoneModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (milestone) {
      setIsAnimating(true);
      setShowBurst(true);
      
      const config = milestoneConfigs[milestone];
      
      // Check if sound is enabled (respect system settings)
      const soundEnabled = localStorage.getItem("hiit_sound_enabled") !== "false";
      
      // Play celebration sound if enabled
      if (soundEnabled && audioRef.current) {
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(() => {});
      }
      
      // Special confetti based on milestone type
      if (milestone === "streak_30" || milestone === "streak_100") {
        // Gold/platinum shower effect
        const duration = 3000;
        const end = Date.now() + duration;
        
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: config.confettiColors,
            zIndex: 9999,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: config.confettiColors,
            zIndex: 9999,
          });
          
          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        
        frame();
      } else if (milestone === "streak_7") {
        // Fire burst effect
        const colors = config.confettiColors;
        
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 },
          colors,
          zIndex: 9999,
          shapes: ["circle"],
          scalar: 1.2,
        });
        
        setTimeout(() => {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
            colors,
            zIndex: 9999,
          });
        }, 200);
      } else {
        // Standard celebration
        confetti({
          particleCount: 150,
          spread: 180,
          origin: { y: 0.5 },
          colors: config.confettiColors,
          zIndex: 9999,
        });
      }

      const animTimer = setTimeout(() => setIsAnimating(false), 600);
      const burstTimer = setTimeout(() => setShowBurst(false), 1500);
      
      return () => {
        clearTimeout(animTimer);
        clearTimeout(burstTimer);
      };
    }
  }, [milestone]);

  if (!milestone) return null;

  const config = milestoneConfigs[milestone];
  const Icon = config.icon;

  return (
    <>
      {/* Hidden audio element for celebration sound */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleikAN4zj78+qfVYKJ3TUx8aNdFQgKYWztb2TZ0oiQo2dmZhzVDkzWn6Sf4JvZGtseoSJmqm2uby7t7SxqKKZkYmAeHFqY15ZVVJPTElGQz89Ojg1MzAuLCooJyUkIiEgHx4dHBsaGRgXFxYVFBMTEhEREBAPDg4NDQwMCwsKCgkJCAgHBwcGBgYFBQUEBAQDAwMDAgICAQEBAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQEBAgICAwMDBAQFBQYGBwcICQkKCwwNDg8QERITFBUXGBocHiAiJSksMDQ4PEFGTFJZYGdvd4CKlJ6osr3Hy9DR1dfZ29zd3t7f4ODg4N/f3t3c29nX1dLQzMjDvriyrKWdlYuBeG9mXVRLQjk=" type="audio/wav" />
      </audio>
      
      <Dialog open={!!milestone} onOpenChange={() => onClose()}>
        <DialogContent className="sm:max-w-[380px] p-0 border-0 bg-transparent shadow-none">
          <div className="bg-card rounded-3xl p-8 text-center relative overflow-hidden border border-border/60">
            {/* Animated gradient background */}
            <div className={cn(
              "absolute inset-0 opacity-20 bg-gradient-to-br",
              config.gradient
            )} />
            
            {/* Burst effect */}
            {showBurst && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={cn(
                  "w-40 h-40 rounded-full animate-ping opacity-30 bg-gradient-to-br",
                  config.gradient
                )} />
              </div>
            )}

            {/* Sparkles */}
            <div className="relative flex items-center justify-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-lg font-bold text-foreground">MILESTONE UNLOCKED!</span>
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>

            {/* Icon with animated rings */}
            <div
              className={cn(
                "relative w-32 h-32 mx-auto mb-6 transition-all duration-700",
                isAnimating ? "scale-0 rotate-180" : "scale-100 rotate-0"
              )}
            >
              {/* Outer pulse ring */}
              <div className={cn(
                "absolute inset-0 rounded-full animate-ping opacity-25 bg-gradient-to-br",
                config.gradient
              )} />
              {/* Inner glow */}
              <div className={cn(
                "absolute inset-2 rounded-full opacity-40 bg-gradient-to-br",
                config.gradient
              )} />
              {/* Icon container */}
              <div className={cn(
                "absolute inset-4 rounded-full flex items-center justify-center shadow-2xl bg-gradient-to-br",
                config.gradient
              )}>
                <Icon className="w-12 h-12 text-white drop-shadow-lg" />
              </div>
            </div>

            {/* Title & subtitle */}
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {milestone === 'streak_7' ? <HEmoji name="streak" size={20}/> : milestone === 'streak_100' ? <HEmoji name="leaderboard" size={20}/> : null} {config.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">{config.subtitle}</p>

            {/* Badge earned */}
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 bg-gradient-to-r text-white font-semibold text-sm",
              config.gradient
            )}>
              <Star className="w-4 h-4" />
              {config.badgeText}
            </div>

            {/* Value if provided */}
            {value && (
              <div className="bg-secondary/50 rounded-2xl py-4 px-6 mb-4">
                <span className={cn(
                  "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  config.gradient
                )}>
                  {value}
                </span>
              </div>
            )}

            {/* Message */}
            <p className="text-sm text-muted-foreground mb-6">
              {config.message}
            </p>

            {/* Actions */}
            <div className="relative flex flex-col gap-3">
              <Button
                className={cn(
                  "w-full rounded-xl py-6 text-white bg-gradient-to-r",
                  config.gradient
                )}
                onClick={onClose}
              >
                Celebrate!
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-xl py-4 text-primary gap-2"
                onClick={() => {
                  // Share functionality would go here
                  onClose();
                }}
              >
                <Share2 className="w-4 h-4" />
                Share to Stories
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook to trigger milestone celebrations
export function useMilestoneCheck() {
  const checkStreak = (currentStreak: number, previousStreak: number): MilestoneType | null => {
    if (currentStreak >= 100 && previousStreak < 100) return "streak_100";
    if (currentStreak >= 30 && previousStreak < 30) return "streak_30";
    if (currentStreak >= 7 && previousStreak < 7) return "streak_7";
    return null;
  };

  const checkWorkouts = (totalWorkouts: number, previousTotal: number): MilestoneType | null => {
    if (totalWorkouts >= 100 && previousTotal < 100) return "workouts_100";
    return null;
  };

  return { checkStreak, checkWorkouts };
}
