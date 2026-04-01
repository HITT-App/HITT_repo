import { useState, useEffect, useRef, useCallback, createRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pause, Play, Settings, Flame, Footprints, Signal, SignalZero, Loader2, Lock, Unlock, Gauge, Mountain } from "lucide-react";
import LiveActivityMap from "@/components/activity/LiveActivityMap";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useActivity } from "@/hooks/useActivity";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { CompletionSummary } from "@/components/workout/CompletionSummary";

import { GpsFilter, haversineDistance } from "@/lib/gps-filter";
import { startGpsWatch } from "@/lib/native-gps";

// --- MET values ---
const MET_VALUES: Record<string, number> = {
  jogging: 9.8, run: 9.8, "trail run": 9.0,
  walking: 3.5, walk: 3.5, hike: 6.0,
  cycling: 7.5, swimming: 8.0, swim: 8.0, surf: 6.0,
  yoga: 2.5, "weight training": 5.0, hiit: 8.0, workout: 8.0,
  "martial-arts": 7.0, aerobics: 6.5, other: 5.0,
};

function getMET(activityType: string): number {
  return MET_VALUES[activityType.toLowerCase()] ?? 5.0;
}

interface GpsPoint {
  lat: number;
  lng: number;
  ts: number;
  alt?: number | null;
}

type GpsStatus = "searching" | "active" | "unavailable" | "denied";

const DEFAULT_WEIGHT_KG = 70;
const AUTO_PAUSE_IDLE_MS = 10_000;

const ActivityLive = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityType = searchParams.get("type") || searchParams.get("sport") || "jogging";
  const { logActivity } = useActivity();
  const { recordWorkout } = useStreaksAndBadges();

  // Core state
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pointsEarned, setPointsEarned] = useState(0);

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("searching");
  const [totalDistance, setTotalDistance] = useState(0);
  const [positions, setPositions] = useState<GpsPoint[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [elevation, setElevation] = useState<number | null>(null);
  const positionsRef = useRef<GpsPoint[]>([]);
  const gpsWatchRef = useRef<{ stop: () => void } | null>(null);
  const gpsFilterRef = useRef(new GpsFilter());
  const lastMoveTimeRef = useRef(Date.now());

  // Settings
  const [settings, setSettings] = useState({
    gpsTracking: true,
    showMetrics: true,
    autoPause: true,
    autoVibrate: true,
  });

  // Refs
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdStartRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const autoPausedRef = useRef(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const hasInitialLockRef = useRef(false);

  // --- Derived stats ---
  const distanceKm = totalDistance / 1000;
  const met = getMET(activityType);
  const calories = Math.round(met * DEFAULT_WEIGHT_KG * (elapsed / 3600));
  const pace = distanceKm > 0.01 ? (elapsed / 60 / distanceKm).toFixed(1) : "--";

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- Calculate speed from recent GPS points ---
  const calculateSpeed = useCallback((pts: GpsPoint[]) => {
    if (pts.length < 3) return 0;
    const recent = pts.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dist = haversineDistance(first.lat, first.lng, last.lat, last.lng);
    const timeDiff = (last.ts - first.ts) / 1000;
    if (timeDiff <= 0) return 0;
    return (dist / timeDiff) * 3.6; // m/s to km/h
  }, []);

  // --- Timer ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (!isPaused && !showCompleted) {
      interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused, showCompleted]);

  // --- Wake Lock ---
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch { /* silent */ }
    };
    requestWakeLock();
    return () => { wakeLockRef.current?.release(); };
  }, []);

  // --- GPS (Kalman-filtered, speed-adaptive, native-capable) ---
  useEffect(() => {
    if (!settings.gpsTracking) {
      setGpsStatus("unavailable");
      return;
    }

    setGpsStatus("searching");
    gpsFilterRef.current.reset();
    let cancelled = false;

    startGpsWatch({
      onPosition: (pos) => {
        if (cancelled) return;
        const result = gpsFilterRef.current.process(
          pos.lat, pos.lng, pos.timestamp, pos.accuracy, pos.altitude,
        );

        if (!result.accepted) return;

        const positions = positionsRef.current;

        if (result.distanceDelta > 0) {
          setTotalDistance((prev) => prev + result.distanceDelta);
          lastMoveTimeRef.current = Date.now();

          if (autoPausedRef.current) {
            autoPausedRef.current = false;
            setIsPaused(false);
            if (settingsRef.current.autoVibrate) navigator.vibrate?.(100);
          }
        }

        positions.push(result.point);
        setPositions([...positions]);
        setCurrentSpeed(result.speed);
        if (result.point.alt !== null && result.point.alt !== undefined) {
          setElevation(Math.round(result.point.alt));
        }
        setGpsStatus("active");
      },
      onError: (code) => {
        if (cancelled) return;
        console.error("GPS error:", code);
        if (code === "permission_denied") {
          setGpsStatus("denied");
          toast.error("GPS permission denied");
        } else {
          setGpsStatus("unavailable");
        }
      },
    }).then((handle) => {
      if (cancelled) { handle.stop(); return; }
      gpsWatchRef.current = handle;
    });

    return () => {
      cancelled = true;
      gpsWatchRef.current?.stop();
      gpsWatchRef.current = null;
    };
  }, [settings.gpsTracking]);

  // --- Auto-pause ---
  useEffect(() => {
    if (!settings.autoPause || isPaused || showCompleted || gpsStatus !== "active") return;
    const interval = setInterval(() => {
      if (Date.now() - lastMoveTimeRef.current > AUTO_PAUSE_IDLE_MS && !autoPausedRef.current) {
        autoPausedRef.current = true;
        setIsPaused(true);
        if (settingsRef.current.autoVibrate) navigator.vibrate?.([100, 50, 100]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [settings.autoPause, isPaused, showCompleted, gpsStatus]);

  // --- Vibrate on manual pause/resume ---
  const togglePause = useCallback(() => {
    if (isLocked) return;
    setIsPaused((p) => {
      if (settingsRef.current.autoVibrate) navigator.vibrate?.(50);
      autoPausedRef.current = false;
      return !p;
    });
  }, [isLocked]);

  // --- Hold to finish ---
  const handleHoldStart = () => {
    if (isLocked) return;
    setIsHolding(true);
    holdStartRef.current = Date.now();
    holdTimerRef.current = setInterval(() => {
      const prog = Math.min(((Date.now() - holdStartRef.current) / 2000) * 100, 100);
      setHoldProgress(prog);
      if (prog >= 100) {
        clearInterval(holdTimerRef.current!);
        handleFinish();
      }
    }, 50);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleFinish = async () => {
    if (settings.autoVibrate) navigator.vibrate?.([100, 100, 200]);
    gpsWatchRef.current?.stop();
    wakeLockRef.current?.release();

    try {
      await logActivity.mutateAsync({
        activity_type: activityType,
        duration_seconds: elapsed,
        distance_km: Number(distanceKm.toFixed(2)),
        calories_burned: calories,
        intensity_level: 3,
      });
      const pts = await recordWorkout();
      setPointsEarned(pts);
      setShowCompleted(true);
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["hsl(24,95%,50%)", "#FFD700", "#FF6347", "#ffffff"],
      });
    } catch {
      toast.error("Failed to save activity");
    }
  };

  // --- Completion message ---
  const getCompletionMessage = () => {
    const mins = Math.floor(elapsed / 60);
    if (mins >= 60) return `Amazing! You crushed a ${mins}-minute ${activityType} session!`;
    if (mins >= 30) return `Great work! ${mins} minutes of solid ${activityType}.`;
    if (mins >= 10) return `Nice effort! ${mins} minutes of ${activityType} logged.`;
    return `Quick ${activityType} session completed. Every minute counts!`;
  };

  const GpsIndicator = () => {
    if (gpsStatus === "active") return (
      <div className="flex items-center gap-1.5 bg-primary/90 text-primary-foreground px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
        <Signal className="w-3 h-3" /> GPS
      </div>
    );
    if (gpsStatus === "searching") return (
      <div className="flex items-center gap-1.5 bg-muted/90 text-muted-foreground px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
        <Loader2 className="w-3 h-3 animate-spin" /> GPS…
      </div>
    );
    return (
      <div className="flex items-center gap-1.5 bg-destructive/80 text-destructive-foreground px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
        <SignalZero className="w-3 h-3" /> Off
      </div>
    );
  };

  // ========== COMPLETED SCREEN ==========
  if (showCompleted) {
    const completionStats = [
      { label: 'Distance', value: distanceKm.toFixed(2), unit: 'km' },
      { label: 'Duration', value: formatTime(elapsed) },
      { label: 'Calories', value: calories, unit: 'kcal' },
      { label: 'Avg Pace', value: pace, unit: 'min/km' },
    ];

    const hasRoute = positions.length > 1;

    return (
      <CompletionSummary
        activityTitle={activityType.charAt(0).toUpperCase() + activityType.slice(1)}
        activityType={activityType}
        stats={completionStats}
        pointsEarned={pointsEarned}
        mapComponent={
          hasRoute ? (
            <LiveActivityMap positions={positions} gpsStatus="active" />
          ) : undefined
        }
        onDone={() => navigate("/activity")}
        postData={{
          duration: Math.floor(elapsed / 60),
          calories,
          distance: distanceKm.toFixed(2),
          pace,
          type: activityType,
        }}
      />
    );
  }

  // ========== LIVE SCREEN ==========
  return (
    <div className="h-[100dvh] relative overflow-hidden bg-background">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <LiveActivityMap positions={positions} gpsStatus={gpsStatus} />
      </div>

      {/* Floating header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-[1002]">
        <Button variant="ghost" size="icon" className="bg-card/70 backdrop-blur-md rounded-full border border-border/20" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground bg-card/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-border/20">
          {activityType}
        </span>
        <Button variant="ghost" size="icon" className="bg-card/70 backdrop-blur-md rounded-full border border-border/20" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* GPS indicator - floating on map */}
      <div className="absolute top-16 left-4 z-[1001]"><GpsIndicator /></div>

      {/* Auto-pause banner */}
      {autoPausedRef.current && (
        <button
          onClick={() => {
            autoPausedRef.current = false;
            setIsPaused(false);
            if (settings.autoVibrate) navigator.vibrate?.(100);
          }}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-[1001] bg-accent/90 text-accent-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-lg animate-bounce"
        >
          Auto-paused · Tap to resume
        </button>
      )}

      {/* Compact bottom card */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-[1002] transition-colors duration-500",
        isHolding ? "bg-destructive/95" : "bg-card/95",
        "backdrop-blur-xl rounded-t-[28px] border-t border-border/20"
      )}>
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Inline stats row */}
        <div className="flex items-center justify-around px-5 pb-4 pt-1">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Footprints className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Distance</span>
            </div>
            <span className="text-xl font-bold text-foreground font-mono">{distanceKm.toFixed(2)}<span className="text-xs text-muted-foreground ml-0.5">km</span></span>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border/30" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider mb-0.5">Duration</span>
            <span className={cn(
              "font-bold text-foreground font-mono",
              isPaused ? "text-muted-foreground" : "text-foreground",
              elapsed >= 3600 ? "text-lg" : "text-xl"
            )}>
              {formatTime(elapsed)}
            </span>
            {isPaused && !autoPausedRef.current && (
              <span className="text-[9px] text-muted-foreground">Paused</span>
            )}
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-border/30" />

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Calories</span>
            </div>
            <span className="text-xl font-bold text-foreground font-mono">{calories}</span>
          </div>
        </div>

        {/* Extra stats row - speed & pace */}
        <div className="flex items-center justify-around px-5 pb-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {currentSpeed > 0 ? currentSpeed.toFixed(1) : "--"} km/h
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Mountain className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {pace} min/km
            </span>
          </div>
          {elevation !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                ↑ {elevation}m
              </span>
            </div>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-center gap-5 px-5 pb-8">
          {/* Lock toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "w-11 h-11 rounded-full transition-all",
              isLocked ? "bg-muted text-muted-foreground" : "text-muted-foreground"
            )}
            onClick={() => {
              setIsLocked((l) => !l);
              if (settings.autoVibrate) navigator.vibrate?.(30);
            }}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </Button>

          {/* Pause/Play */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "w-16 h-16 rounded-full transition-transform active:scale-90 border-2",
              isLocked && "opacity-40 pointer-events-none"
            )}
            onClick={togglePause}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>

          {/* Hold to Finish */}
          <div className="relative">
            <button
              className={cn(
                "w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all touch-manipulation",
                isLocked && "opacity-40 pointer-events-none",
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
            {!isHolding && !isLocked && (
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
          <SheetHeader><SheetTitle>Activity Controls</SheetTitle></SheetHeader>
          <div className="py-4 space-y-4">
            {([
              { key: "gpsTracking", label: "GPS Tracking" },
              { key: "showMetrics", label: "Show Metrics" },
              { key: "autoPause", label: "Auto Pause" },
              { key: "autoVibrate", label: "Vibration Feedback" },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span>{label}</span>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, [key]: checked }))}
                />
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={() => setShowSettings(false)}>Save Settings</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ActivityLive;
