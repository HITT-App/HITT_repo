import { useState, useRef, useCallback, useEffect } from "react";

interface PedometerState {
  steps: number;
  isActive: boolean;
  isSupported: boolean;
  elapsed: number;
  wasPaused: boolean; // true if session was interrupted
}

const STEP_THRESHOLD = 12;
const STEP_COOLDOWN = 300;
const TICK_INTERVAL = 1000;
const SESSION_KEY = "pedometer-session";

interface SavedSession {
  steps: number;
  startedAt: number;
  pausedElapsed: number;
}

export function usePedometer() {
  const [state, setState] = useState<PedometerState>(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        const session: SavedSession = JSON.parse(saved);
        return {
          steps: session.steps,
          isActive: false,
          isSupported: typeof DeviceMotionEvent !== "undefined",
          elapsed: session.pausedElapsed,
          wasPaused: true,
        };
      } catch { /* ignore */ }
    }
    return {
      steps: 0,
      isActive: false,
      isSupported: typeof DeviceMotionEvent !== "undefined",
      elapsed: 0,
      wasPaused: false,
    };
  });

  const lastStepTime = useRef(0);
  const timerRef = useRef<number | null>(null);
  const stepsRef = useRef(state.steps);
  const startedAtRef = useRef(0);
  const baseElapsedRef = useRef(state.elapsed);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Persist session to sessionStorage on every step
  const persistSession = useCallback(() => {
    const session: SavedSession = {
      steps: stepsRef.current,
      startedAt: startedAtRef.current,
      pausedElapsed:
        baseElapsedRef.current +
        Math.floor((Date.now() - startedAtRef.current) / 1000),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, []);

  const acquireWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        wakeLockRef.current.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      }
    } catch {
      // Wake Lock not available or denied — no-op
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
  }, []);

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && state.isActive) {
        acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [state.isActive, acquireWakeLock]);

  const handleMotion = useCallback(
    (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      const now = Date.now();

      if (
        magnitude > STEP_THRESHOLD &&
        now - lastStepTime.current > STEP_COOLDOWN
      ) {
        lastStepTime.current = now;
        stepsRef.current += 1;
        setState((s) => ({ ...s, steps: stepsRef.current }));
        persistSession();
      }
    },
    [persistSession]
  );

  const requestPermission = useCallback(async () => {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      "requestPermission" in DeviceMotionEvent &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      const result = await (DeviceMotionEvent as any).requestPermission();
      return result === "granted";
    }
    return true;
  }, []);

  const start = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      setState((s) => ({ ...s, isSupported: false }));
      return;
    }

    stepsRef.current = 0;
    lastStepTime.current = 0;
    baseElapsedRef.current = 0;
    startedAtRef.current = Date.now();
    sessionStorage.removeItem(SESSION_KEY);

    setState({
      steps: 0,
      isActive: true,
      isSupported: true,
      elapsed: 0,
      wasPaused: false,
    });

    window.addEventListener("devicemotion", handleMotion);
    await acquireWakeLock();

    timerRef.current = window.setInterval(() => {
      const elapsed =
        baseElapsedRef.current +
        Math.floor((Date.now() - startedAtRef.current) / 1000);
      setState((s) => ({ ...s, elapsed }));
    }, TICK_INTERVAL);
  }, [handleMotion, requestPermission, acquireWakeLock]);

  const resume = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    // Keep existing steps and elapsed
    baseElapsedRef.current = state.elapsed;
    startedAtRef.current = Date.now();
    lastStepTime.current = 0;

    setState((s) => ({ ...s, isActive: true, wasPaused: false }));

    window.addEventListener("devicemotion", handleMotion);
    await acquireWakeLock();

    timerRef.current = window.setInterval(() => {
      const elapsed =
        baseElapsedRef.current +
        Math.floor((Date.now() - startedAtRef.current) / 1000);
      setState((s) => ({ ...s, elapsed }));
    }, TICK_INTERVAL);
  }, [handleMotion, requestPermission, acquireWakeLock, state.elapsed]);

  const stop = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    releaseWakeLock();
    sessionStorage.removeItem(SESSION_KEY);
    const finalSteps = stepsRef.current;
    setState((s) => ({ ...s, isActive: false, wasPaused: false }));
    return finalSteps;
  }, [handleMotion, releaseWakeLock]);

  const discard = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    releaseWakeLock();
    sessionStorage.removeItem(SESSION_KEY);
    stepsRef.current = 0;
    setState({
      steps: 0,
      isActive: false,
      isSupported: true,
      elapsed: 0,
      wasPaused: false,
    });
  }, [handleMotion, releaseWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (timerRef.current) clearInterval(timerRef.current);
      releaseWakeLock();
    };
  }, [handleMotion, releaseWakeLock]);

  return { ...state, start, stop, resume, discard };
}
