import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pause, Play, Flame, Dumbbell, Plus, Minus, Activity, PersonStanding, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useActivity } from "@/hooks/useActivity";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { CompletionSummary } from "@/components/workout/CompletionSummary";

const MET_VALUES: Record<string, number> = {
  "weight training": 5.0,
  workout: 8.0,
  hiit: 8.0,
  yoga: 2.5,
};

function getMET(type: string): number {
  return MET_VALUES[type.toLowerCase()] ?? 5.0;
}

const ACTIVITY_ICONS: Record<string, typeof Dumbbell> = {
  "weight training": Dumbbell,
  workout: Activity,
  hiit: Flame,
  yoga: PersonStanding,
};

const DEFAULT_WEIGHT_KG = 70;

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const GymTimer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityType = searchParams.get("sport") || "Workout";
  const { logActivity } = useActivity();

  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sets, setSets] = useState(0);
  const [settings, setSettings] = useState({ autoVibrate: true, showCalories: true });

  const startTimeRef = useRef(Date.now());
  const pausedAtRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval>>();

  const met = getMET(activityType);
  const calories = Math.round((met * DEFAULT_WEIGHT_KG * elapsed) / 3600);
  const IconComp = ACTIVITY_ICONS[activityType.toLowerCase()] || Activity;

  // Timer
  useEffect(() => {
    if (showCompleted) return;
    const id = setInterval(() => {
      if (!isPaused) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedAtRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isPaused, showCompleted]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      startTimeRef.current += Date.now() - (startTimeRef.current + (pausedAtRef.current + elapsed) * 1000);
    }
    setIsPaused((p) => {
      if (!p) pausedAtRef.current += 0;
      return !p;
    });
    if (settings.autoVibrate) navigator.vibrate?.(50);
  }, [isPaused, elapsed, settings.autoVibrate]);

  // Hold to finish
  const handleHoldStart = useCallback(() => {
    setIsHolding(true);
    setHoldProgress(0);
    let progress = 0;
    holdTimerRef.current = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdTimerRef.current!);
        finishActivity();
      }
    }, 30);
  }, []);

  const handleHoldEnd = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
  }, []);

  const finishActivity = useCallback(async () => {
    setShowCompleted(true);
    if (settings.autoVibrate) navigator.vibrate?.([100, 50, 100, 50, 200]);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });

    try {
      await logActivity({
        activity_type: activityType,
        started_at: new Date(startTimeRef.current).toISOString(),
        ended_at: new Date().toISOString(),
        duration_seconds: elapsed,
        calories_burned: calories,
        status: "completed",
        notes: sets > 0 ? `${sets} sets completed` : undefined,
      });
    } catch {
      toast.error("Failed to save activity");
    }
  }, [activityType, elapsed, calories, sets, logActivity, settings.autoVibrate]);

  // Heart rate zone visual (decorative)
  const hrZone = elapsed < 300 ? "Warm Up" : elapsed < 1200 ? "Fat Burn" : elapsed < 2400 ? "Cardio" : "Peak";
  const hrColor = elapsed < 300 ? "text-blue-400" : elapsed < 1200 ? "text-green-400" : elapsed < 2400 ? "text-orange-400" : "text-red-400";

  if (showCompleted) {
    return (
      <CompletionSummary
        activityType={activityType}
        elapsed={elapsed}
        calories={calories}
        distance={0}
        onClose={() => navigate("/activity-dashboard")}
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      {/* Subtle radial glow background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <IconComp className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">{activityType}</span>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Heart rate zone indicator */}
      <div className="flex justify-center z-10">
        <div className="flex items-center gap-2 bg-muted/60 backdrop-blur-sm rounded-full px-4 py-1.5 border border-border/30">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", hrColor.replace("text-", "bg-"))} />
          <span className={cn("text-xs font-medium", hrColor)}>{hrZone} Zone</span>
        </div>
      </div>

      {/* Main timer area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
        {/* Big timer */}
        <div className="flex flex-col items-center">
          <span className={cn(
            "font-mono font-bold tracking-tight text-foreground",
            elapsed >= 3600 ? "text-6xl" : "text-7xl",
            isPaused && "text-muted-foreground"
          )}>
            {formatTime(elapsed)}
          </span>
          {isPaused && (
            <span className="text-sm text-muted-foreground mt-1 animate-pulse">Paused</span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Dumbbell className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Sets</span>
            </div>
            <span className="text-2xl font-bold text-foreground font-mono">{sets}</span>
          </div>
          <div className="h-10 w-px bg-border/30" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Calories</span>
            </div>
            <span className="text-2xl font-bold text-foreground font-mono">{calories}</span>
          </div>
        </div>

        {/* Set counter buttons */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => { setSets((s) => Math.max(0, s - 1)); if (settings.autoVibrate) navigator.vibrate?.(20); }}
          >
            <Minus className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground w-16 text-center">Log Set</span>
          <Button
            variant="outline"
            size="icon"
            className="w-12 h-12 rounded-full border-primary/50 text-primary"
            onClick={() => { setSets((s) => s + 1); if (settings.autoVibrate) navigator.vibrate?.(50); toast.success(`Set ${sets + 1} logged!`); }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Bottom controls */}
      <div className={cn(
        "pb-10 pt-6 px-6 transition-colors duration-500 rounded-t-[28px] border-t border-border/20 z-10",
        isHolding ? "bg-destructive/95" : "bg-card/95",
        "backdrop-blur-xl"
      )}>
        <div className="flex items-center justify-center gap-6">
          {/* Pause/Play */}
          <Button
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full transition-transform active:scale-90 border-2"
            onClick={togglePause}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>

          {/* Hold to Finish */}
          <div className="relative">
            <button
              className={cn(
                "w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all touch-manipulation",
                isHolding ? "bg-destructive scale-110" : "bg-destructive/80"
              )}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
            >
              <span className="text-destructive-foreground text-[10px] font-semibold leading-tight text-center">
                Hold to<br />Finish
              </span>
            </button>
            {!isHolding && (
              <div className="absolute inset-[-5px] rounded-full border-2 border-destructive/30 animate-ping pointer-events-none" style={{ animationDuration: "2.5s" }} />
            )}
            {isHolding && (
              <svg className="absolute inset-[-3px] w-[70px] h-[70px] -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--destructive-foreground))" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${holdProgress * 2.89} 289`} className="transition-all" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom">
          <SheetHeader><SheetTitle>Timer Settings</SheetTitle></SheetHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span>Vibration Feedback</span>
              <Switch checked={settings.autoVibrate} onCheckedChange={(c) => setSettings((p) => ({ ...p, autoVibrate: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <span>Show Calories</span>
              <Switch checked={settings.showCalories} onCheckedChange={(c) => setSettings((p) => ({ ...p, showCalories: c }))} />
            </div>
          </div>
          <Button className="w-full" onClick={() => setShowSettings(false)}>Done</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GymTimer;
