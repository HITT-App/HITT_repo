import { ChevronRight } from "lucide-react";
import { HEmoji } from "@/components/HEmoji";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useEffect, useState } from "react";

export function StreakUrgencyBanner() {
  const navigate = useNavigate();
  const { streak } = useStreaksAndBadges();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    
    // Check if it's after 6 PM and user hasn't worked out today
    const now = new Date();
    const hour = now.getHours();
    const today = now.toISOString().split("T")[0];
    
    const lastWorkoutDate = streak?.last_workout_date;
    const hasWorkedOutToday = lastWorkoutDate === today;
    const isEvening = hour >= 18;
    const hasActiveStreak = (streak?.current_streak || 0) > 0;

    setShowBanner(isEvening && !hasWorkedOutToday && hasActiveStreak);
  }, [streak, dismissed]);

  if (!showBanner) return null;

  return (
    <div className="mx-4 mb-4 relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10 border border-orange-500/20 p-4">
      {/* Animated background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-red-500/5 animate-pulse" />
      
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <HEmoji name="streak" size={20}/>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Your {streak?.current_streak}-day streak ends at midnight!
            </p>
            <p className="text-xs text-muted-foreground">
              Start a quick workout to keep it going
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-md"
          onClick={() => navigate("/workouts")}
        >
          Go <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground text-xs"
      >
        ✕
      </button>
    </div>
  );
}
