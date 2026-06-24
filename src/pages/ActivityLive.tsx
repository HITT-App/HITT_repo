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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { useActivity } from "@/hooks/useActivity";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { CompletionSummary } from "@/components/workout/CompletionSummary";
import { Analytics } from "@/lib/analytics";
import { getSportConfig } from "@/lib/sports";
import { App as CapApp } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";

import { GpsFilter, haversineDistance, type GpsPoint } from "@/lib/gps-filter";
import { startGpsWatch } from "@/lib/native-gps";
import { ensureHealthWriteAuth, saveActivityToHealth } from "@/lib/health-write";
import { LiveActivity, type LiveActivityHandle, type WorkoutContentState } from "@/lib/live-activity";

// --- Crash-recovery persistence ---
const PERSIST_KEY = "hitt.activeWorkout";
const PERSIST_THROTTLE_MS = 2000;
const PERSIST_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

type PersistedWorkout = {
  version: 1;
  startedAt: number;
  activityType: string;
  positions: GpsPoint[];
  totalDistance: number;
  isPaused: boolean;
  lastFixAt: number;
};

async function loadPersistedWorkout(): Promise<PersistedWorkout | null> {
  try {
    const { value } = await Preferences.get({ key: PERSIST_KEY });
    if (!value) return null;
    const parsed = JSON.parse(value) as PersistedWorkout;
    if (parsed?.version !== 1 || typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

async function clearPersistedWorkout(): Promise<void> {
  try {
    await Preferences.remove({ key: PERSIST_KEY });
  } catch { /* silent */ }
}

function writePersistedWorkout(data: PersistedWorkout): void {
  // Fire-and-forget — never block the caller (GPS callback).
  Preferences.set({ key: PERSIST_KEY, value: JSON.stringify(data) }).catch(() => {});
}

const RC = { bg: '#0a0a0a', card: '#141414', line: '#262626', fg: '#fafafa', dim: '#9a9a9a', primary: '#f97316' };

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


type GpsStatus = "searching" | "active" | "unavailable" | "denied";

const DEFAULT_WEIGHT_KG = 70;
const AUTO_PAUSE_IDLE_MS = 10_000;

const ActivityLive = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activityType = searchParams.get("type") || searchParams.get("sport") || "jogging";
  const { logActivity } = useActivity();
  const { recordWorkout } = useStreaksAndBadges();

  // Pre-start setup phase — timer and recording don't begin until user taps Start
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);
  startedRef.current = started;

  // Crash-recovery: tracks the live session's epoch start so persistence has a stable key.
  const sessionStartedAtRef = useRef<number>(0);
  const lastPersistAtRef = useRef<number>(0);
  // Gate writes until recovery check completes, so we don't overwrite a recoverable workout.
  const persistReadyRef = useRef(false);

  // Recovery dialog state — populated synchronously on mount before any other init runs.
  const [recoveryCandidate, setRecoveryCandidate] = useState<PersistedWorkout | null>(null);

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
  const lastGpsPointRef = useRef<GpsPoint | null>(null);
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
  // Tracks whether we've already retried HealthKit auth this session so we don't loop.
  const healthAuthRetriedRef = useRef(false);

  // --- Live Activity (Lock Screen / Dynamic Island) ---
  const liveActivityRef = useRef<LiveActivityHandle | null>(null);
  const lastLAPushRef = useRef(0);
  const lastLAPausedRef = useRef(false);

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

  // Pace string for Live Activity — "M:SS /km" derived from current km/h.
  const formatLAPace = (speedKmh: number): string => {
    if (!isFinite(speedKmh) || speedKmh < 0.3) return "--:-- /km";
    const secPerKm = 3600 / speedKmh;
    const m = Math.floor(secPerKm / 60);
    const s = Math.floor(secPerKm % 60);
    return `${m}:${s.toString().padStart(2, "0")} /km`;
  };


  // --- Crash-recovery: check persisted workout on mount ---
  // Runs once, before any GPS / timer side effects do meaningful work, because writes
  // are gated behind `persistReadyRef`.
  useEffect(() => {
    let cancelled = false;
    loadPersistedWorkout().then((persisted) => {
      if (cancelled) return;
      if (!persisted) {
        persistReadyRef.current = true;
        return;
      }
      const age = Date.now() - persisted.startedAt;
      if (age >= PERSIST_MAX_AGE_MS) {
        clearPersistedWorkout();
        persistReadyRef.current = true;
        return;
      }
      // Show dialog — writes stay gated until user picks Resume or Discard.
      setRecoveryCandidate(persisted);
    });
    return () => { cancelled = true; };
  }, []);

  // --- Persistence helper ---
  // Stash latest values in a ref so the GPS callback (long-lived closure) can read fresh state
  // without us having to re-subscribe the GPS watcher every render.
  const persistInputsRef = useRef({ activityType, totalDistance, isPaused });
  persistInputsRef.current = { activityType, totalDistance, isPaused };

  const persistNow = useCallback((opts?: { force?: boolean }) => {
    if (!persistReadyRef.current) return;
    if (!startedRef.current) return;
    const now = Date.now();
    if (!opts?.force && now - lastPersistAtRef.current < PERSIST_THROTTLE_MS) return;
    lastPersistAtRef.current = now;
    const { activityType: at, totalDistance: td, isPaused: ip } = persistInputsRef.current;
    const payload: PersistedWorkout = {
      version: 1,
      startedAt: sessionStartedAtRef.current || now,
      activityType: at,
      positions: positionsRef.current,
      totalDistance: td,
      isPaused: ip,
      lastFixAt: now,
    };
    writePersistedWorkout(payload);
  }, []);

  // Force-write on pause / resume / started transitions — state changes that matter.
  useEffect(() => {
    if (!started) return;
    persistNow({ force: true });
  }, [started, isPaused, persistNow]);

  // --- Live Activity throttled updates ---
  // Push at most once every 5 seconds while running, but always push immediately when
  // the pause state flips so the lock screen reflects pause/resume without lag.
  useEffect(() => {
    if (!started) return;
    const handle = liveActivityRef.current;
    if (!handle) return;
    const now = Date.now();
    const pausedChanged = lastLAPausedRef.current !== isPaused;
    if (!pausedChanged && now - lastLAPushRef.current < 5000) return;
    lastLAPushRef.current = now;
    lastLAPausedRef.current = isPaused;
    const state: WorkoutContentState = {
      elapsedSeconds: elapsed,
      distanceMeters: totalDistance,
      paceString: formatLAPace(currentSpeed),
      isPaused,
    };
    void LiveActivity.update(handle.activityId, state);
  }, [started, elapsed, totalDistance, isPaused, currentSpeed]);

  // End the Live Activity if the page unmounts while still running (back nav, etc.).
  useEffect(() => {
    return () => {
      const handle = liveActivityRef.current;
      if (handle) {
        liveActivityRef.current = null;
        void LiveActivity.end(handle.activityId);
      }
    };
  }, []);

  // --- Timer — only runs after user taps Start ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (started && !isPaused && !showCompleted) {
      interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [started, isPaused, showCompleted]);

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

  // Fire workout_started once on mount
  useEffect(() => {
    Analytics.workoutStarted(activityType);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

        // Always update GPS status indicator so the pre-start screen shows "Ready"
        setGpsStatus("active");
        lastGpsPointRef.current = result.point;

        // Only record positions and update stats after the user taps Start
        if (!startedRef.current) return;

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

        // Throttled, fire-and-forget persist for crash recovery.
        persistNow();
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

    // End the Live Activity — fire-and-forget, must never block completion.
    const liveHandle = liveActivityRef.current;
    if (liveHandle) {
      liveActivityRef.current = null;
      void LiveActivity.end(liveHandle.activityId, {
        elapsedSeconds: elapsed,
        distanceMeters: totalDistance,
        paceString: formatLAPace(currentSpeed),
        isPaused: false,
      });
    }

    try {
      const inserted = await logActivity.mutateAsync({
        activity_type: activityType,
        duration_seconds: elapsed,
        distance_km: Number(distanceKm.toFixed(2)),
        calories_burned: calories,
        intensity_level: 3,
      });
      // Successful save to backend — discard recovery snapshot.
      await clearPersistedWorkout();

      // Fire-and-forget: write to Apple Health so the activity appears in Fitness with its route.
      const startedAt = sessionStartedAtRef.current || (Date.now() - elapsed * 1000);
      const endedAt = Date.now();
      const healthMetadata: Record<string, string | number | boolean> = {};
      const supabaseId = (inserted as { id?: string } | null)?.id;
      if (supabaseId) healthMetadata.HITT_ACTIVITY_ID = supabaseId;
      const healthParams = {
        activityType,
        startedAt,
        endedAt,
        distanceMeters: totalDistance,
        calories,
        positions: positionsRef.current.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          ts: p.ts,
          alt: p.alt ?? null,
        })),
        metadata: healthMetadata,
      };
      void (async () => {
        try {
          const result = await saveActivityToHealth(healthParams);
          if (result.ok) return;
          if (
            !healthAuthRetriedRef.current &&
            (result.reason === "permission_denied" || result.reason === "denied")
          ) {
            healthAuthRetriedRef.current = true;
            const auth = await ensureHealthWriteAuth();
            if (auth.ok) {
              const retry = await saveActivityToHealth(healthParams);
              if (!retry.ok) {
                console.error("[health-write] retry failed:", retry.reason);
              }
            } else {
              console.error("[health-write] auth failed:", auth.reason);
            }
          } else if (result.reason !== "not_native") {
            console.error("[health-write] save failed:", result.reason);
          }
        } catch (err) {
          console.error("[health-write] unexpected error:", err);
        }
      })();

      const pts = await recordWorkout();
      setPointsEarned(pts);
      Analytics.workoutCompleted({
        type: activityType,
        durationSecs: elapsed,
        distanceKm: distanceKm > 0 ? Number(distanceKm.toFixed(2)) : undefined,
        calories,
      });
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

  // --- Recovery dialog handlers ---
  const handleRecoveryResume = useCallback(() => {
    if (!recoveryCandidate) return;
    const resumed = recoveryCandidate;
    positionsRef.current = resumed.positions.slice();
    setPositions(resumed.positions.slice());
    setTotalDistance(resumed.totalDistance);
    sessionStartedAtRef.current = resumed.startedAt;
    // Re-seed elapsed from wall-clock so the timer reflects real time spent.
    const elapsedSecs = Math.max(0, Math.floor((Date.now() - recoveryCandidate.startedAt) / 1000));
    setElapsed(elapsedSecs);
    setIsPaused(recoveryCandidate.isPaused);
    lastMoveTimeRef.current = Date.now();
    gpsFilterRef.current.reset();
    persistReadyRef.current = true;
    setStarted(true);
    setRecoveryCandidate(null);
    toast.success("Resumed unfinished workout");
    void (async () => {
      const handle = await LiveActivity.start(
        {
          workoutType: activityType,
          workoutTitle: activityType.charAt(0).toUpperCase() + activityType.slice(1),
          startedAt: resumed.startedAt,
        },
        {
          elapsedSeconds: Math.max(0, Math.floor((Date.now() - resumed.startedAt) / 1000)),
          distanceMeters: resumed.totalDistance,
          paceString: "--:-- /km",
          isPaused: resumed.isPaused,
        },
      );
      if (handle) liveActivityRef.current = handle;
    })();
  }, [recoveryCandidate, activityType]);

  const handleRecoveryDiscard = useCallback(() => {
    clearPersistedWorkout();
    setRecoveryCandidate(null);
    persistReadyRef.current = true;
  }, []);

  const recoveryDialog = recoveryCandidate ? (
    <AlertDialog open={true}>
      <AlertDialogContent className="max-w-sm rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Unfinished workout</AlertDialogTitle>
          <AlertDialogDescription>
            We found an unfinished workout. Resume it or discard?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction className="w-full" onClick={handleRecoveryResume}>
            Resume
          </AlertDialogAction>
          <AlertDialogCancel className="w-full mt-0" onClick={handleRecoveryDiscard}>
            Discard
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  // ========== COMPLETED SCREEN ==========
  if (showCompleted) {
    // Use human-readable duration so the AI insight doesn't mistake "00:42" (MM:SS) for 42 minutes
    const formatDuration = (secs: number) => {
      if (secs < 60) return `${secs} sec`;
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      if (h > 0) return s > 0 ? `${h} hr ${m} min ${s} sec` : `${h} hr ${m} min`;
      return s > 0 ? `${m} min ${s} sec` : `${m} min`;
    };
    const completionStats = [
      { label: 'Distance', value: distanceKm.toFixed(2), unit: 'km' },
      { label: 'Duration', value: formatDuration(elapsed) },
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
        routePositions={hasRoute ? positions : undefined}
        mapComponent={
          hasRoute ? (
            <LiveActivityMap positions={positions} gpsStatus="active" fitBoundsOnMount />
          ) : undefined
        }
        onDone={() => navigate("/activity", { replace: true })}
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

  // ========== PRE-START SCREEN ==========
  if (!started) {
    const sportCfg = getSportConfig(activityType);
    const label = activityType.charAt(0).toUpperCase() + activityType.slice(1);
    const SportIcon = sportCfg?.icon;
    const iconColor = sportCfg ? '#f97316' : '#f97316';
    const gpsColor = gpsStatus === 'active' ? '#4ade80' : gpsStatus === 'denied' ? '#ef4444' : '#facc15';
    const gpsLabel = gpsStatus === 'active' ? 'GPS ready' : gpsStatus === 'denied' ? 'Location access denied' : 'Acquiring GPS…';
    const isDenied = gpsStatus === 'denied';

    const openSettings = () => CapApp.openUrl({ url: 'app-settings:' }).catch(() => {});

    return (
      <div style={{ height: '100dvh', background: RC.bg, display: 'flex', flexDirection: 'column', color: RC.fg, paddingTop: 'calc(var(--safe-area-inset-top, 44px) + 8px)' }}>
        <div style={{ padding: '0 16px 12px' }}>
          <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${RC.line}`, background: RC.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <ArrowLeft size={18} color={RC.fg} strokeWidth={2.2} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 32px' }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {SportIcon ? <SportIcon size={44} color={iconColor} strokeWidth={1.8} /> : <Flame size={44} color={iconColor} strokeWidth={1.8} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: RC.fg, letterSpacing: -0.5, margin: 0 }}>{label}</h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: gpsColor }} />
              <span style={{ fontSize: 13, color: RC.dim }}>{gpsLabel}</span>
            </div>
          </div>

          {isDenied && (
            <div style={{ width: '100%', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: '14px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: '#fca5a5', margin: '0 0 10px', lineHeight: 1.5 }}>
                Location access is off. Enable it so this activity can track your route and distance.
              </p>
              <button
                onClick={openSettings}
                style={{ padding: '8px 20px', borderRadius: 10, background: '#ef4444', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
              >
                Open Settings
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: '0 16px 32px' }}>
          <button
            onClick={() => {
              const now = Date.now();
              lastMoveTimeRef.current = now;
              sessionStartedAtRef.current = now;
              setStarted(true);
              gpsFilterRef.current.reset();
              positionsRef.current = [];
              // Fire-and-forget: Live Activity on Lock Screen / Dynamic Island.
              void (async () => {
                const handle = await LiveActivity.start(
                  {
                    workoutType: activityType,
                    workoutTitle: activityType.charAt(0).toUpperCase() + activityType.slice(1),
                    startedAt: now,
                  },
                  {
                    elapsedSeconds: 0,
                    distanceMeters: 0,
                    paceString: "--:-- /km",
                    isPaused: false,
                  },
                );
                if (handle) liveActivityRef.current = handle;
              })();
            }}
            style={{ width: '100%', height: 60, borderRadius: 18, background: RC.primary, border: 'none', color: '#0a0a0a', fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(249,115,22,0.32)', WebkitTapHighlightColor: 'transparent' }}
          >
            Ready?
          </button>
        </div>
        {recoveryDialog}
      </div>
    );
  }

  // ========== LIVE SCREEN ==========
  return (
    <div className="h-[100dvh] relative overflow-hidden bg-background">
      {/* Full-screen map */}
      <div className="absolute inset-0">
        <LiveActivityMap positions={positions} gpsStatus={gpsStatus} seedPosition={lastGpsPointRef.current ?? undefined} />
      </div>

      {/* Floating header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pb-4 z-[1002]" style={{ paddingTop: "calc(var(--safe-area-inset-top, 44px) + 0.5rem)" }}>
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
                "w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all touch-manipulation select-none",
                isLocked && "opacity-40 pointer-events-none",
                isHolding ? "bg-destructive scale-110" : "bg-destructive/80"
              )}
              style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              onTouchCancel={handleHoldEnd}
            >
              <span className="text-destructive-foreground text-[10px] font-semibold leading-tight text-center select-none pointer-events-none">
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
      {recoveryDialog}
    </div>
  );
};

export default ActivityLive;
