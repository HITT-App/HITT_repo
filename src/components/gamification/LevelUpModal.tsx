import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Star, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevel: number;
  newTitle: string;
  previousLevel: number;
}

const levelColors: Record<string, string> = {
  Rookie: "from-gray-400 to-gray-500",
  "Rising Star": "from-blue-400 to-blue-600",
  Warrior: "from-green-400 to-emerald-600",
  Champion: "from-amber-400 to-orange-500",
  Legend: "from-orange-500 to-red-600",
  Elite: "from-purple-500 to-pink-600",
  Grandmaster: "from-yellow-400 via-amber-500 to-yellow-600",
};

export function LevelUpModal({ 
  isOpen, 
  onClose, 
  newLevel, 
  newTitle, 
  previousLevel 
}: LevelUpModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay content for dramatic effect
      const contentTimer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(contentTimer);
      // Previously fired canvas-confetti here. Removed: on Android WebView
      // requestAnimationFrame is aggressively throttled, so particles
      // froze mid-air and stayed stuck on top of the modal. The modal's
      // own animation + gold-orange colour palette is enough celebration.
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  const gradient = levelColors[newTitle] || levelColors.Rookie;

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[360px] p-0 border-0 bg-transparent shadow-none overflow-visible">
        <div className="bg-card rounded-3xl p-8 text-center relative overflow-hidden border border-border/60">
          {/* Animated background glow */}
          <div className={cn(
            "absolute inset-0 opacity-20 animate-pulse",
            `bg-gradient-to-br ${gradient}`
          )} />

          {/* Sparkle decorations */}
          <div className="absolute top-4 left-4">
            <Star className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <div className="absolute top-6 right-6">
            <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
          </div>
          <div className="absolute bottom-20 left-6">
            <Zap className="w-4 h-4 text-primary animate-pulse" />
          </div>

          {/* Header */}
          <div className="relative mb-6">
            <p className="text-sm text-muted-foreground mb-1">You've reached</p>
            <h2 className="text-2xl font-bold text-foreground">Level Up!</h2>
          </div>

          {/* Level badge animation */}
          <div className={cn(
            "relative w-32 h-32 mx-auto mb-6 transition-all duration-700",
            showContent ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}>
            {/* Outer glow ring */}
            <div className={cn(
              "absolute inset-0 rounded-full animate-pulse",
              `bg-gradient-to-br ${gradient} opacity-30`
            )} />
            {/* Middle ring */}
            <div className={cn(
              "absolute inset-3 rounded-full",
              `bg-gradient-to-br ${gradient} opacity-50`
            )} />
            {/* Inner circle with level */}
            <div className={cn(
              "absolute inset-6 rounded-full flex items-center justify-center shadow-lg",
              `bg-gradient-to-br ${gradient}`
            )}>
              <div className="text-center">
                <Crown className="w-8 h-8 text-white mx-auto mb-1" />
                <span className="text-3xl font-bold text-white">{newLevel}</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className={cn(
            "transition-all duration-500 delay-300",
            showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            <p className="text-lg text-muted-foreground mb-1">You are now a</p>
            <h3 className={cn(
              "text-3xl font-bold bg-clip-text text-transparent",
              `bg-gradient-to-r ${gradient}`
            )}>
              {newTitle}
            </h3>
          </div>

          {/* Level progress indicator */}
          <div className={cn(
            "flex items-center justify-center gap-2 my-6 transition-all duration-500 delay-500",
            showContent ? "opacity-100" : "opacity-0"
          )}>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="text-lg">Level {previousLevel}</span>
              <span className="text-lg">→</span>
              <span className="text-lg font-bold text-foreground">Level {newLevel}</span>
            </div>
          </div>

          {/* Encouragement message */}
          <p className={cn(
            "text-sm text-muted-foreground mb-6 transition-all duration-500 delay-700",
            showContent ? "opacity-100" : "opacity-0"
          )}>
            Keep pushing! Every workout brings you closer to greatness.
          </p>

          {/* CTA */}
          <Button
            className={cn(
              "w-full py-6 rounded-xl text-base font-medium transition-all duration-500 delay-1000",
              `bg-gradient-to-r ${gradient} hover:opacity-90 text-white`,
              showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            onClick={onClose}
          >
            Let's Go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
