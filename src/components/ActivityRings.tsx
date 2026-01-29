import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RingProps {
  progress: number; // 0-100
  color: string;
  size: number;
  strokeWidth: number;
  delay?: number;
}

const Ring = ({ progress, color, size, strokeWidth, delay = 0 }: RingProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, delay);
    return () => clearTimeout(timer);
  }, [progress, delay]);

  return (
    <svg width={size} height={size} className="absolute inset-0">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
        opacity={0.3}
      />
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-1000 ease-out"
        style={{
          filter: animatedProgress >= 100 ? `drop-shadow(0 0 6px ${color})` : undefined,
        }}
      />
    </svg>
  );
};

interface ActivityRingsProps {
  moveProgress: number;
  exerciseProgress: number;
  standProgress: number;
  moveGoal?: number;
  exerciseGoal?: number;
  standGoal?: number;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ActivityRings({
  moveProgress,
  exerciseProgress,
  standProgress,
  moveGoal = 500,
  exerciseGoal = 30,
  standGoal = 12,
  showLabels = true,
  size = "md",
}: ActivityRingsProps) {
  const sizeConfig = {
    sm: { container: 100, outer: 100, middle: 76, inner: 52, stroke: 10 },
    md: { container: 140, outer: 140, middle: 108, inner: 76, stroke: 14 },
    lg: { container: 180, outer: 180, middle: 140, inner: 100, stroke: 18 },
  };

  const config = sizeConfig[size];

  // Calculate actual progress percentages
  const movePercent = Math.min((moveProgress / moveGoal) * 100, 100);
  const exercisePercent = Math.min((exerciseProgress / exerciseGoal) * 100, 100);
  const standPercent = Math.min((standProgress / standGoal) * 100, 100);

  return (
    <div className="flex items-center gap-6">
      {/* Rings Container */}
      <div 
        className="relative flex items-center justify-center"
        style={{ width: config.container, height: config.container }}
      >
        {/* Outer ring - Move (Red/Pink) */}
        <Ring
          progress={movePercent}
          color="hsl(350, 85%, 60%)"
          size={config.outer}
          strokeWidth={config.stroke}
          delay={100}
        />
        {/* Middle ring - Exercise (Green) */}
        <Ring
          progress={exercisePercent}
          color="hsl(145, 70%, 50%)"
          size={config.middle}
          strokeWidth={config.stroke}
          delay={200}
        />
        {/* Inner ring - Stand (Cyan) */}
        <Ring
          progress={standPercent}
          color="hsl(185, 85%, 50%)"
          size={config.inner}
          strokeWidth={config.stroke}
          delay={300}
        />
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(350,85%,60%)]" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {moveProgress}<span className="text-muted-foreground text-xs">/{moveGoal} cal</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Move</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(145,70%,50%)]" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {exerciseProgress}<span className="text-muted-foreground text-xs">/{exerciseGoal} min</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Exercise</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[hsl(185,85%,50%)]" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {standProgress}<span className="text-muted-foreground text-xs">/{standGoal} hrs</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Stand</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
