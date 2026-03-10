import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pause, Play, Settings, Timer, Flame, Footprints, Signal, SignalZero, Loader2 } from "lucide-react";
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

// --- Haversine ---
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // metres
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
}

type GpsStatus = "searching" | "active" | "unavailable" | "denied";

const DEFAULT_WEIGHT_KG = 70;
const GPS_ACCURACY_THRESHOLD = 50; // metres
const GPS_INITIAL_ACCURACY = 100; // metres – relaxed for first fix
const GPS_MIN_MOVE = 2; // metres – noise filter
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

  // GPS state
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>("searching");
  const [totalDistance, setTotalDistance] = useState(0); // metres
  const [positions, setPositions] = useState<GpsPoint[]>([]);
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
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // --- Timer ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
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

        const point: GpsPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, ts: Date.now() };
        const positions = positionsRef.current;

        if (positions.length > 0) {
          const last = positions[positions.length - 1];
          const d = haversineDistance(last.lat, last.lng, point.lat, point.lng);
          if (d < GPS_MIN_MOVE) return; // noise
          if (d > 500) return; // GPS jump protection
          setTotalDistance((prev) => prev + d);
          lastMoveTimeRef.current = Date.now();

          // Auto-resume if was auto-paused
          if (autoPausedRef.current) {
            autoPausedRef.current = false;
            setIsPaused(false);
            if (settingsRef.current.autoVibrate) navigator.vibrate?.(100);
          }
        }

        positions.push(point);
        setPositions([...positions]);
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
    setIsPaused((p) => {
      if (settingsRef.current.autoVibrate) navigator.vibrate?.(50);
      autoPausedRef.current = false;
      return !p;
    });
  }, []);

  // --- Hold to finish ---
  const handleHoldStart = () => {
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
      <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
        <Signal className="w-4 h-4" /> GPS Active
      </div>
    );
    if (gpsStatus === "searching") return (
      <div className="flex items-center gap-2 bg-muted text-muted-foreground px-3 py-1 rounded-full text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Searching GPS…
      </div>
    );
    return (
      <div className="flex items-center gap-2 bg-destructive/20 text-destructive px-3 py-1 rounded-full text-sm">
        <SignalZero className="w-4 h-4" /> GPS Off
      </div>
    );
  };

  // ========== COMPLETED SCREEN ==========
  if (showCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-4xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Activity Completed</h1>
        <p className="text-muted-foreground mb-8">{getCompletionMessage()}</p>

        <Card className="w-full p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{Math.floor(elapsed / 60)}m</div>
              <div className="text-sm text-muted-foreground">Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{calories}</div>
              <div className="text-sm text-muted-foreground">Calories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{distanceKm.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">km</div>
            </div>
          </div>
        </Card>

        <div className="w-full space-y-3">
          <Button className="w-full" onClick={() => navigate(`/activity-summary?elapsed=${elapsed}&distance=${distanceKm.toFixed(2)}&calories=${calories}`)}>
            See Full Summary
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/activity")}>
            Great, thanks!
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
        <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm rounded-full shadow" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-semibold capitalize text-foreground bg-background/80 backdrop-blur-sm px-4 py-1.5 rounded-full shadow">{activityType}</span>
        <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-sm rounded-full shadow" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* Full-width Map */}
      <div className="relative w-full" style={{ height: "45vh", minHeight: 220 }}>
        <LiveActivityMap positions={positions} gpsStatus={gpsStatus} />
        <div className="absolute top-16 left-4 z-[1001]"><GpsIndicator /></div>
        {autoPausedRef.current && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] bg-background/90 backdrop-blur-sm text-muted-foreground px-4 py-1.5 rounded-full text-sm font-medium shadow">
            Auto-paused (no movement)
          </div>
        )}
      </div>

      {/* Stats Panel */}
      <div className="flex-1 flex flex-col justify-between p-4 -mt-4 bg-background rounded-t-3xl relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div>
          <div className="text-center mb-4 pt-2">
            <div className="text-5xl font-mono font-bold mb-1 tracking-tight">{formatTime(elapsed)}</div>
            <p className="text-sm text-muted-foreground">
              {isPaused ? (autoPausedRef.current ? "Auto-Paused" : "Paused") : "Total Duration"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="p-3 text-center border-border/50">
              <Flame className="w-5 h-5 text-primary mx-auto mb-1" />
              <div className="font-semibold text-lg">{calories}</div>
              <div className="text-xs text-muted-foreground">kcal</div>
            </Card>
            <Card className="p-3 text-center border-border/50">
              <Footprints className="w-5 h-5 text-primary mx-auto mb-1" />
              <div className="font-semibold text-lg">{distanceKm.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">km</div>
            </Card>
            <Card className="p-3 text-center border-border/50">
              <Timer className="w-5 h-5 text-primary mx-auto mb-1" />
              <div className="font-semibold text-lg">{pace}</div>
              <div className="text-xs text-muted-foreground">min/km</div>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 pb-4">
          <Button variant="outline" size="icon" className="w-16 h-16 rounded-full" onClick={togglePause}>
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>

          <div className="relative">
            <button
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all touch-manipulation",
                isHolding ? "bg-destructive scale-110" : "bg-destructive/80"
              )}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
            >
              <span className="text-destructive-foreground text-sm font-medium">
                Hold to<br />Finish
              </span>
            </button>
            {isHolding && (
              <svg className="absolute inset-0 w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="4" strokeDasharray={`${holdProgress * 2.83} 283`} className="transition-all" />
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
