import { Capacitor, registerPlugin } from "@capacitor/core";

interface WatchPluginInterface {
  isAvailable(): Promise<{ available: boolean }>;
  isWatchPaired(): Promise<{ paired: boolean; installed: boolean }>;
  sendWorkout(options: { workout: WatchWorkout }): Promise<void>;
  clearWorkout(): Promise<void>;
  sendMessage(options: { message: Record<string, unknown> }): Promise<void>;
  sendStructuredWorkout(options: { workout: WatchWorkout }): Promise<void>;
  startMirroredWorkout(options: { activityType: string; workoutName?: string }): Promise<{ mirroring: boolean }>;
  endMirroredWorkout(): Promise<void>;
  prepareHealthAuth(): Promise<void>;
  isSimulator(): Promise<{ isSimulator: boolean }>;
  addListener(event: "workoutEvent", handler: (data: WatchWorkoutEvent) => void): Promise<{ remove: () => void }>;
}

export interface TriathlonLeg {
  type: "swim" | "bike" | "run";
  targetKm: number;
}

export interface TriathlonPlan {
  name: string;
  legs: TriathlonLeg[];
}

export interface WatchWorkout {
  id: string;
  name: string;
  durationMinutes: number;
  exercises: WatchExercise[];
}

export interface WatchExercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  durationSeconds?: number;
  restAfterSetSeconds?: number;
  restAfterExerciseSeconds?: number;
}

export interface TriathlonLegResult {
  type: "swim" | "bike" | "run";
  elapsedSeconds: number;
  distanceKm: number;
}

export interface WatchWorkoutEvent {
  event:
    | "workoutStarted"
    | "workoutCompleted"
    | "workoutCancelled"
    | "triathlonCompleted"
    | "triathlonShareRequested"
    | "shareRequested";
  workoutId?: string;
  workoutName?: string;
  durationSeconds?: number;
  calories?: number;
  averageHeartRate?: number;
  // Triathlon completion / share-request events
  raceName?: string;
  legs?: TriathlonLegResult[];
}

const WatchPluginImpl = registerPlugin<WatchPluginInterface>("Watch");

// The Watch plugin is Swift-only. On Android the native side doesn't exist,
// so `WatchPluginImpl.<anything>()` throws "not implemented on android"
// synchronously — including at boot (onWatchWorkoutEvent runs from
// watch-event-handler.ts on app init). Every export in this file must gate
// on this predicate, NOT Capacitor.isNativePlatform() (which is true on
// Android too).
const isIOSNative = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const isWatchAvailable = async (): Promise<boolean> => {
  if (!isIOSNative()) return false;
  try {
    const { available } = await WatchPluginImpl.isAvailable();
    return available;
  } catch {
    return false;
  }
};

// Whether an Apple Watch is paired to this iPhone AND the HITT Watch app
// is installed on it. Durable signal (unlike isReachable) — used by the
// wearable-detection fallback so a paired-but-idle Watch still surfaces
// the "Launch on Watch" affordance even before the user has any recorded
// history in activity_logs.
export const isWatchPaired = async (): Promise<{ paired: boolean; installed: boolean }> => {
  if (!isIOSNative()) return { paired: false, installed: false };
  try {
    return await WatchPluginImpl.isWatchPaired();
  } catch {
    return { paired: false, installed: false };
  }
};

export const sendWorkoutToWatch = async (workout: WatchWorkout): Promise<void> => {
  if (!isIOSNative()) return;
  try { await WatchPluginImpl.sendWorkout({ workout }); } catch {}
};

export const clearWatchWorkout = async (): Promise<void> => {
  if (!isIOSNative()) return;
  try { await WatchPluginImpl.clearWorkout(); } catch {}
};

export const sendStructuredWorkoutToWatch = async (workout: WatchWorkout): Promise<void> => {
  if (!isIOSNative()) return;
  try { await WatchPluginImpl.sendStructuredWorkout({ workout }); } catch {}
};

export const sendTriathlonToWatch = async (plan: TriathlonPlan): Promise<void> => {
  if (!isIOSNative()) return;
  try { await WatchPluginImpl.sendMessage({ message: { triathlon: plan } }); } catch {}
};

export const startWorkoutMirroring = async (activityType = "hiit", workoutName = "HIIT Workout"): Promise<boolean> => {
  if (!isIOSNative()) return false;
  try {
    const { mirroring } = await WatchPluginImpl.startMirroredWorkout({ activityType, workoutName });
    return mirroring;
  } catch { return false; }
};

export const endWorkoutMirroring = async (): Promise<void> => {
  if (!isIOSNative()) return;
  try { await WatchPluginImpl.endMirroredWorkout(); } catch {}
};

// Call ONCE after sign-in so the comprehensive HealthKit prompt fires while
// the user is in-app and authenticated, not at app launch before sign-in.
// Idempotent — iOS skips the UI on types that are already determined.
export const prepareWatchHealthAuth = async (): Promise<void> => {
  if (!isIOSNative()) return;
  try { await WatchPluginImpl.prepareHealthAuth(); } catch {}
};

// Cached simulator-detection check. Used by LiveActivity to skip starts on
// the iOS 26 simulator (widget extension XPC crash, real devices unaffected).
// Web platforms return false. Native iOS calls the WatchPlugin's native check
// which uses #if targetEnvironment(simulator) — 100% reliable, no heuristics.
let isSimulatorCached: boolean | null = null;
export const isIOSSimulator = async (): Promise<boolean> => {
  if (isSimulatorCached !== null) return isSimulatorCached;
  if (!isIOSNative()) {
    isSimulatorCached = false;
    return false;
  }
  try {
    const { isSimulator } = await WatchPluginImpl.isSimulator();
    isSimulatorCached = !!isSimulator;
  } catch {
    isSimulatorCached = false;
  }
  return isSimulatorCached;
};

export const onWatchWorkoutEvent = (handler: (event: WatchWorkoutEvent) => void) => {
  // Runs at app boot from watch-event-handler.ts. Must be a total no-op on
  // Android / web — addListener() on a nonexistent plugin throws synchronously.
  if (!isIOSNative()) return () => {};
  let listenerHandle: { remove: () => void } | null = null;
  WatchPluginImpl.addListener("workoutEvent", handler).then((h) => {
    listenerHandle = h;
  }).catch(() => {});
  return () => listenerHandle?.remove();
};
