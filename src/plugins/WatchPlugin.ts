import { Capacitor, registerPlugin } from "@capacitor/core";

interface WatchPluginInterface {
  isAvailable(): Promise<{ available: boolean }>;
  sendWorkout(options: { workout: WatchWorkout }): Promise<void>;
  clearWorkout(): Promise<void>;
  sendMessage(options: { message: Record<string, unknown> }): Promise<void>;
  sendStructuredWorkout(options: { workout: WatchWorkout }): Promise<void>;
  startMirroredWorkout(options: { activityType: string; workoutName?: string }): Promise<{ mirroring: boolean }>;
  endMirroredWorkout(): Promise<void>;
  prepareHealthAuth(): Promise<void>;
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
    | "triathlonShareRequested";
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

export const isWatchAvailable = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { available } = await WatchPluginImpl.isAvailable();
    return available;
  } catch {
    return false;
  }
};

export const sendWorkoutToWatch = async (workout: WatchWorkout): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  await WatchPluginImpl.sendWorkout({ workout });
};

export const clearWatchWorkout = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  await WatchPluginImpl.clearWorkout();
};

export const sendStructuredWorkoutToWatch = async (workout: WatchWorkout): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  await WatchPluginImpl.sendStructuredWorkout({ workout });
};

export const sendTriathlonToWatch = async (plan: TriathlonPlan): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  await WatchPluginImpl.sendMessage({ message: { triathlon: plan } });
};

export const startWorkoutMirroring = async (activityType = "hiit", workoutName = "HIIT Workout"): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { mirroring } = await WatchPluginImpl.startMirroredWorkout({ activityType, workoutName });
    return mirroring;
  } catch { return false; }
};

export const endWorkoutMirroring = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try { await WatchPluginImpl.endMirroredWorkout(); } catch {}
};

// Call ONCE after sign-in so the comprehensive HealthKit prompt fires while
// the user is in-app and authenticated, not at app launch before sign-in.
// Idempotent — iOS skips the UI on types that are already determined.
export const prepareWatchHealthAuth = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try { await WatchPluginImpl.prepareHealthAuth(); } catch {}
};

export const onWatchWorkoutEvent = (handler: (event: WatchWorkoutEvent) => void) => {
  if (!Capacitor.isNativePlatform()) return () => {};
  let listenerHandle: { remove: () => void } | null = null;
  WatchPluginImpl.addListener("workoutEvent", handler).then((h) => {
    listenerHandle = h;
  });
  return () => listenerHandle?.remove();
};
