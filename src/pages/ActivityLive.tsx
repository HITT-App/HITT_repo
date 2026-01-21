import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pause, Play, Settings, MapPin, Timer, Flame, Footprints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useActivity } from "@/hooks/useActivity";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const activityIcons: Record<string, string> = {
  jogging: "🏃",
  swimming: "🏊",
  yoga: "🧘",
  "martial-arts": "🥋",
  aerobics: "💪",
  cycling: "🚴",
  walking: "🚶",
  other: "⚡",
};

const ActivityLive = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityType = searchParams.get("type") || "jogging";
  const { logActivity } = useActivity();

  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [settings, setSettings] = useState({
    gpsTracking: true,
    showMetrics: true,
    autoPause: true,
    autoVibrate: true,
  });

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartRef = useRef<number>(0);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isPaused && !showCompleted) {
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, showCompleted]);

  // Calculated stats
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const distance = (elapsed * 0.003).toFixed(1); // ~180m per minute jogging
  const calories = Math.round(elapsed * 0.15);
  const pace = elapsed > 0 ? (elapsed / 60 / Number(distance)).toFixed(1) : "0.0";

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleHoldStart = () => {
    setIsHolding(true);
    holdStartRef.current = Date.now();
    
    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min((elapsed / 2000) * 100, 100);
      setHoldProgress(progress);
      
      if (progress >= 100) {
        clearInterval(holdTimerRef.current!);
        handleFinish();
      }
    }, 50);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleFinish = async () => {
    try {
      await logActivity.mutateAsync({
        activity_type: activityType,
        duration_seconds: elapsed,
        distance_km: Number(distance),
        calories_burned: calories,
        intensity_level: 3,
      });
      setShowCompleted(true);
    } catch (error) {
      toast.error("Failed to save activity");
    }
  };

  if (showCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-4xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Activity Completed</h1>
        <p className="text-muted-foreground mb-8">
          You jogged for a short period of time and burned very little calorie.
        </p>

        <Card className="w-full p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{minutes}m</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{calories}c</div>
              <div className="text-sm text-muted-foreground">Calorie Burn</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{minutes}m</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
          </div>
        </Card>

        <div className="w-full space-y-3">
          <Button className="w-full" onClick={() => navigate(`/activity-summary?elapsed=${elapsed}&distance=${distance}&calories=${calories}`)}>
            See Full Summary
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/activity")}>
            Great, thanks!
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-500",
      isHolding ? "bg-destructive/20" : "bg-background"
    )}>
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">Map</Button>
          <Button variant="ghost" size="sm">Stopwatch</Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Map Placeholder */}
      <div className="flex-1 relative bg-muted/30 mx-4 rounded-xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="w-12 h-12 text-primary" />
        </div>
        {/* Route indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
          <MapPin className="w-4 h-4" />
          <span>GPS Active</span>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="p-4">
        {/* Main Timer */}
        <div className="text-center mb-6">
          <div className="text-6xl font-mono font-bold mb-1">
            {formatTime(elapsed)}
          </div>
          <p className="text-sm text-muted-foreground">
            {isPaused ? "Activity Paused" : "Total Duration"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-3 text-center">
            <Flame className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="font-semibold">{calories}</div>
            <div className="text-xs text-muted-foreground">kcal</div>
          </Card>
          <Card className="p-3 text-center">
            <Footprints className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="font-semibold">{distance}</div>
            <div className="text-xs text-muted-foreground">km</div>
          </Card>
          <Card className="p-3 text-center">
            <Timer className="w-5 h-5 text-primary mx-auto mb-1" />
            <div className="font-semibold">{pace}</div>
            <div className="text-xs text-muted-foreground">min/km</div>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>

          <div className="relative">
            <button
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all",
                isHolding ? "bg-destructive scale-110" : "bg-destructive/80"
              )}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
            >
              <span className="text-destructive-foreground text-sm font-medium">
                Hold to<br/>Finish
              </span>
            </button>
            {isHolding && (
              <svg 
                className="absolute inset-0 w-20 h-20 -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeDasharray={`${holdProgress * 2.83} 283`}
                  className="transition-all"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Activity Controls</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-4">
            {[
              { key: "gpsTracking", label: "GPS Tracking" },
              { key: "showMetrics", label: "Show Metrics" },
              { key: "autoPause", label: "Auto Pause" },
              { key: "autoVibrate", label: "Auto Vibrate" },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span>{label}</span>
                <Switch
                  checked={settings[key as keyof typeof settings]}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => setShowSettings(false)}>
            Save Settings
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ActivityLive;
