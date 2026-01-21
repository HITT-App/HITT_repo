import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Footprints, Rocket, Target, Medal, Crown, 
  Flame, Zap, Trophy, Shield, Star 
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
    // Trigger animation
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 500);
    return () => clearTimeout(timer);
  }, [currentIndex]);

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
      <DialogContent className="sm:max-w-sm text-center">
        <DialogTitle className="sr-only">New Badge Earned</DialogTitle>
        
        {/* Confetti/Celebration Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
          <div className="absolute top-8 right-8 w-3 h-3 bg-primary rounded-full animate-ping delay-100" />
          <div className="absolute bottom-12 left-8 w-2 h-2 bg-green-400 rounded-full animate-ping delay-200" />
          <div className="absolute bottom-8 right-4 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-300" />
        </div>

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

          {/* Action Button */}
          <Button onClick={handleNext} className="w-full">
            {currentIndex < badges.length - 1 ? "Next Badge" : "Awesome!"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
