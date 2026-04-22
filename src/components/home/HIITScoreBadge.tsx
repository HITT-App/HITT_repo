import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HIITScoreBreakdownSheet } from "./HIITScoreBreakdownSheet";

interface HIITScoreComponents {
  workouts: number;
  streak: number;
  nutrition: number;
  sleep: number;
  intensity: number;
  inputs?: {
    workoutCount: number;
    streakDays: number;
    nutritionDaysHit: number;
    sleepDaysGood: number;
    avgDurationMinutes: number;
  };
}

interface HIITScoreBadgeProps {
  score?: number;
  components?: HIITScoreComponents | null;
  label?: string;
  size?: "sm" | "md" | "lg";
  showArrow?: boolean;
  onClick?: () => void;
}

export function HIITScoreBadge({
  score,
  components,
  label = "Average Fitness",
  size = "md",
  showArrow = true,
  onClick,
}: HIITScoreBadgeProps) {
  const hasScore = typeof score === "number";
  const displayScore = hasScore ? score : 0;
  const [sheetOpen, setSheetOpen] = useState(false);

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setSheetOpen(true);
    }
  };

  const getScoreColor = () => {
    if (!hasScore) return "text-muted-foreground";
    if (displayScore >= 75) return "text-green-500";
    if (displayScore >= 40) return "text-primary";
    return "text-red-500";
  };

  return (
    <>
    <button
      onClick={handleClick}
      className="flex items-center gap-3 touch-manipulation group"
    >
      {/* Score Circle */}
      <div
        className={cn(
          "relative rounded-full bg-primary/10 flex items-center justify-center font-bold transition-transform group-active:scale-95",
          sizeClasses[size],
          getScoreColor()
        )}
      >
        {/* Orange ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(displayScore / 100) * 283} 283`}
            className="opacity-80"
          />
        </svg>
        <span className="relative z-10">{hasScore ? displayScore : "—"}</span>
      </div>

      {/* Label */}
      <div className="flex flex-col items-start">
        <span className="text-xs font-semibold text-foreground">HIIT Score</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {showArrow && (
            <span className="text-xs text-primary font-medium flex items-center">
              + plus
            </span>
          )}
        </div>
      </div>

      {showArrow && (
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
      )}
    </button>

    <HIITScoreBreakdownSheet
      open={sheetOpen}
      onOpenChange={setSheetOpen}
      score={hasScore ? (score as number) : null}
      components={components ?? null}
    />
    </>
  );
}
