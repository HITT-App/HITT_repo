import { useState, useRef, useCallback, useEffect } from "react";

interface PedometerState {
  steps: number;
  isActive: boolean;
  isSupported: boolean;
  elapsed: number; // seconds
}

const STEP_THRESHOLD = 12;    // acceleration magnitude threshold
const STEP_COOLDOWN = 300;    // ms between steps to avoid double-counting
const TICK_INTERVAL = 1000;

export function usePedometer() {
  const [state, setState] = useState<PedometerState>({
    steps: 0,
    isActive: false,
    isSupported: typeof DeviceMotionEvent !== "undefined",
    elapsed: 0,
  });

  const lastStepTime = useRef(0);
  const timerRef = useRef<number | null>(null);
  const stepsRef = useRef(0);

  const handleMotion = useCallback((e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

    const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
    const now = Date.now();

    if (magnitude > STEP_THRESHOLD && now - lastStepTime.current > STEP_COOLDOWN) {
      lastStepTime.current = now;
      stepsRef.current += 1;
      setState((s) => ({ ...s, steps: stepsRef.current }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // iOS 13+ requires explicit permission
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
    setState({ steps: 0, isActive: true, isSupported: true, elapsed: 0 });

    window.addEventListener("devicemotion", handleMotion);

    const startTime = Date.now();
    timerRef.current = window.setInterval(() => {
      setState((s) => ({ ...s, elapsed: Math.floor((Date.now() - startTime) / 1000) }));
    }, TICK_INTERVAL);
  }, [handleMotion, requestPermission]);

  const stop = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState((s) => ({ ...s, isActive: false }));
    return stepsRef.current;
  }, [handleMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [handleMotion]);

  return { ...state, start, stop };
}
