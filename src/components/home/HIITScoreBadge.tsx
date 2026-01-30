import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HIITScoreBadgeProps {
  score?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showArrow?: boolean;
  onClick?: () => void;
}

export function HIITScoreBadge({
  score = 61,
  label = "Average Fitness",
  size = "md",
  showArrow = true,
  onClick,
}: HIITScoreBadgeProps) {
  const navigate = useNavigate();

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate("/health-metrics");
    }
  };

  // Calculate color based on score
  const getScoreColor = () => {
    if (score >= 75) return "text-green-500";
    if (score >= 40) return "text-primary";
    return "text-red-500";
  };

  return (
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
            strokeDasharray={`${(score / 100) * 283} 283`}
            className="opacity-80"
          />
        </svg>
        <span className="relative z-10">{score}</span>
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
  );
}
