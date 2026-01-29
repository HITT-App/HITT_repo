import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Footprints, Rocket, Target, Medal, Crown, 
  Flame, Zap, Trophy, Shield, Star, Share2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

interface NewBadgeModalProps {
  badges: Badge[];
  onClose: () => void;
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

const categoryColors: Record<string, string[]> = {
  streak: ["#f97316", "#ef4444", "#fb923c"],
  workout: ["#3b82f6", "#8b5cf6", "#6366f1"],
  nutrition: ["#22c55e", "#10b981", "#14b8a6"],
  default: ["#f59e0b", "#fbbf24", "#d97706"],
};

export function NewBadgeModal({ badges, onClose }: NewBadgeModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  const currentBadge = badges[currentIndex];
  const Icon = currentBadge ? iconMap[currentBadge.icon] || Star : Star;

  useEffect(() => {
    if (!currentBadge) return;
    
    // Trigger animation
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    
    // Fire confetti celebration
    const colors = categoryColors[currentBadge.category] || categoryColors.default;
    
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      zIndex: 9999,
    });
    
    // Second burst for extra celebration
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7, x: 0.3 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7, x: 0.7 },
        colors,
        zIndex: 9999,
      });
    }, 200);
    
    return () => clearTimeout(timer);
  }, [currentIndex, currentBadge]);

  const handleNext = () => {
    if (currentIndex < badges.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  if (!currentBadge) return null;

  const isStreak = currentBadge.category === 'streak';

  return (
    <Dialog open={badges.length > 0} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-sm text-center border-0 bg-card">
        <DialogTitle className="sr-only">New Badge Earned</DialogTitle>
        
        {/* Shimmer background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-50 rounded-lg" />

        <div className="py-6 space-y-6">
          {/* Badge Icon */}
          <div 
            className={cn(
              "w-28 h-28 mx-auto rounded-3xl flex items-center justify-center shadow-2xl transition-transform",
              isAnimating && "animate-bounce",
              isStreak 
                ? "bg-gradient-to-br from-orange-500 to-red-500" 
                : "bg-gradient-to-br from-blue-500 to-purple-500"
            )}
          >
            <Icon className="w-14 h-14 text-white" />
          </div>

          {/* Badge Info */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              Badge Unlocked!
            </p>
            <h2 className="text-2xl font-bold text-foreground">
              {currentBadge.name}
            </h2>
            <p className="text-muted-foreground">
              {currentBadge.description}
            </p>
          </div>

          {/* Progress Dots */}
          {badges.length > 1 && (
            <div className="flex justify-center gap-2">
              {badges.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    idx === currentIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button onClick={handleNext} className="w-full">
              {currentIndex < badges.length - 1 ? "Next Badge" : "Awesome!"}
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-primary gap-2"
              onClick={() => {
                const shareData = {
                  title: `Badge Unlocked: ${currentBadge.name}`,
                  text: currentBadge.description,
                  url: window.location.origin,
                };
                
                if (navigator.share && navigator.canShare(shareData)) {
                  navigator.share(shareData).catch(() => {});
                } else {
                  navigator.clipboard.writeText(
                    `🏅 Badge Unlocked: ${currentBadge.name}\n${currentBadge.description}`
                  );
                }
              }}
            >
              <Share2 className="w-4 h-4" />
              Share Badge
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
