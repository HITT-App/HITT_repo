import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Footprints, Rocket, Target, Medal, Crown, 
  Flame, Zap, Trophy, Shield, Star, Share2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

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
    return () => clearTimeout(timer);
    // Previously fired canvas-confetti here. Removed for the same reason
    // as LevelUpModal — Android WebView froze the particles.
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
