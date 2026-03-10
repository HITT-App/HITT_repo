import { useState, useEffect, useRef, useCallback } from "react";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

// --- Haversine ---
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
const GPS_ACCURACY_THRESHOLD = 50;
const GPS_INITIAL_ACCURACY = 100;
const GPS_MIN_MOVE = 2;
const AUTO_PAUSE_IDLE_MS = 10_000;

const ActivityLive = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityType = searchParams.get("type") || searchParams.get("sport") || "jogging";
  const { logActivity } = useActivity();

  // Core state
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("searching");
  const [totalDistance, setTotalDistance] = useState(0);
  const [positions, setPositions] = useState<GpsPoint[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState(0); // km/h
  const [elevation, setElevation] = useState<number | null>(null);
  const positionsRef = useRef<GpsPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
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

  // --- GPS ---
  useEffect(() => {
    if (!settings.gpsTracking) {
      setGpsStatus("unavailable");
      return;
    }
    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      toast.error("GPS not available on this device");
      return;
    }

    setGpsStatus("searching");
    hasInitialLockRef.current = false;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        const threshold = hasInitialLockRef.current ? GPS_ACCURACY_THRESHOLD : GPS_INITIAL_ACCURACY;
        if (acc > threshold) return;

        const point: GpsPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          ts: Date.now(),
          alt: pos.coords.altitude,
        };
        const positions = positionsRef.current;

        if (positions.length > 0) {
          const last = positions[positions.length - 1];
          const d = haversineDistance(last.lat, last.lng, point.lat, point.lng);
          if (d < GPS_MIN_MOVE) return;
          if (d > 500) return;
          setTotalDistance((prev) => prev + d);
          lastMoveTimeRef.current = Date.now();

          if (autoPausedRef.current) {
            autoPausedRef.current = false;
            setIsPaused(false);
            if (settingsRef.current.autoVibrate) navigator.vibrate?.(100);
          }
        }

        positions.push(point);
        setPositions([...positions]);
        setCurrentSpeed(calculateSpeed(positions));
        if (point.alt !== null && point.alt !== undefined) {
          setElevation(Math.round(point.alt));
        }
        hasInitialLockRef.current = true;
        setGpsStatus("active");
      },
      (err) => {
        console.error("GPS error:", err.code, err.message);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("denied");
          toast.error("GPS permission denied");
        } else {
          setGpsStatus("unavailable");
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );

    watchIdRef.current = id;
    return () => navigator.geolocation.clearWatch(id);
  }, [settings.gpsTracking, calculateSpeed]);

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
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    wakeLockRef.current?.release();

    try {
      await logActivity.mutateAsync({
        activity_type: activityType,
        duration_seconds: elapsed,
        distance_km: Number(distanceKm.toFixed(2)),
        calories_burned: calories,
        intensity_level: 3,
      });
      setShowCompleted(true);
      // Fire confetti
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
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-scale-in">
          <span className="text-4xl">🏆</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Activity Completed</h1>
        <p className="text-muted-foreground mb-8 max-w-xs">{getCompletionMessage()}</p>

        <Card className="w-full p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{formatTime(elapsed)}</div>
              <div className="text-xs text-muted-foreground mt-1">Duration</div>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-primary">{calories}</div>
              <div className="text-xs text-muted-foreground mt-1">Calories</div>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{distanceKm.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">Kilometers</div>
            </div>
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-foreground">{pace}</div>
              <div className="text-xs text-muted-foreground mt-1">Avg Pace (min/km)</div>
            </div>
          </div>
        </Card>

        <div className="w-full space-y-3">
          <Button className="w-full" onClick={() => navigate(`/activity-summary?elapsed=${elapsed}&distance=${distanceKm.toFixed(2)}&calories=${calories}`)}>
            See Full Summary
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/activity")}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  // ========== LIVE SCREEN ==========
  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-500",
      isHolding ? "bg-destructive/20" : "bg-background"
    )}>
      {/* Header - floating over map */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-[1002]">
        <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm rounded-full shadow-sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">{activityType}</span>
        <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm rounded-full shadow-sm" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Full-width Map */}
      <div className="relative w-full" style={{ height: "45vh", minHeight: 220 }}>
        <LiveActivityMap positions={positions} gpsStatus={gpsStatus} />
        <div className="absolute top-16 left-4 z-[1001]"><GpsIndicator /></div>

        {/* Mini floating timer on map */}
        <div className="absolute bottom-6 right-4 z-[1001] bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm">
          <span className="text-sm font-mono font-semibold text-foreground">{formatTime(elapsed)}</span>
        </div>

        {/* Auto-pause banner */}
        {autoPausedRef.current && (
          <button
            onClick={() => {
              autoPausedRef.current = false;
              setIsPaused(false);
              if (settings.autoVibrate) navigator.vibrate?.(100);
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1001] bg-accent/90 text-accent-foreground px-5 py-2 rounded-full text-sm font-semibold shadow-lg animate-bounce"
          >
            Auto-paused · Tap to resume
          </button>
        )}
      </div>

      {/* Stats Panel — gradient fade transition */}
      <div className="flex-1 flex flex-col justify-between -mt-6 relative z-10">
        {/* Gradient fade from map */}
        <div className="h-6 bg-gradient-to-b from-transparent to-background" />

        <div className="flex-1 flex flex-col justify-between px-4 pb-4 bg-background">
          <div>
            {/* Large timer */}
            <div className="text-center mb-5">
              <div className={cn(
                "font-mono font-bold tracking-tight transition-all",
                elapsed >= 3600 ? "text-4xl" : "text-6xl"
              )}>
                {formatTime(elapsed)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isPaused ? (autoPausedRef.current ? "Auto-Paused" : "Paused") : "Elapsed Time"}
              </p>
            </div>

            {/* 2x2 Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3.5">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/80 to-primary/20" />
                <Flame className="w-4 h-4 text-primary mb-1.5" />
                <div className="text-2xl font-bold text-foreground">{calories}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Calories</div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3.5">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/80 to-primary/20" />
                <Footprints className="w-4 h-4 text-primary mb-1.5" />
                <div className="text-2xl font-bold text-foreground">{distanceKm.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Kilometers</div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3.5">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/60 to-primary/10" />
                <Gauge className="w-4 h-4 text-primary mb-1.5" />
                <div className="text-2xl font-bold text-foreground">{currentSpeed > 0 ? currentSpeed.toFixed(1) : "--"}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Speed km/h</div>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3.5">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary/60 to-primary/10" />
                <Mountain className="w-4 h-4 text-primary mb-1.5" />
                <div className="text-2xl font-bold text-foreground">{pace}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pace min/km</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-5 pb-2">
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
                "w-16 h-16 rounded-full transition-transform active:scale-90",
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
                  "w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all touch-manipulation",
                  isLocked && "opacity-40 pointer-events-none",
                  isHolding ? "bg-destructive scale-110" : "bg-destructive/80"
                )}
                onMouseDown={handleHoldStart}
                onMouseUp={handleHoldEnd}
                onMouseLeave={handleHoldEnd}
                onTouchStart={handleHoldStart}
                onTouchEnd={handleHoldEnd}
              >
                <span className="text-destructive-foreground text-[11px] font-semibold leading-tight text-center">
                  Hold to<br />Finish
                </span>
              </button>
              {/* Always-visible subtle pulse ring */}
              {!isHolding && !isLocked && (
                <div className="absolute inset-[-6px] rounded-full border-2 border-destructive/30 animate-ping pointer-events-none" style={{ animationDuration: "2.5s" }} />
              )}
              {/* Hold progress ring */}
              {isHolding && (
                <svg className="absolute inset-[-4px] w-[80px] h-[80px] -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--destructive-foreground))" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${holdProgress * 2.89} 289`} className="transition-all" />
                </svg>
              )}
            </div>
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
