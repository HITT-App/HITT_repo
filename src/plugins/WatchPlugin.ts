import { Capacitor, registerPlugin } from "@capacitor/core";

interface WatchPluginInterface {
  isAvailable(): Promise<{ available: boolean }>;
  sendWorkout(options: { workout: WatchWorkout }): Promise<void>;
  clearWorkout(): Promise<void>;
  addListener(event: "workoutEvent", handler: (data: WatchWorkoutEvent) => void): Promise<{ remove: () => void }>;
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
}

export interface WatchWorkoutEvent {
  event: "workoutStarted" | "workoutCompleted" | "workoutCancelled";
  workoutId?: string;
  workoutName?: string;
  durationSeconds?: number;
  calories?: number;
  averageHeartRate?: number;
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

export const onWatchWorkoutEvent = (handler: (event: WatchWorkoutEvent) => void) => {
  if (!Capacitor.isNativePlatform()) return () => {};
  let listenerHandle: { remove: () => void } | null = null;
  WatchPluginImpl.addListener("workoutEvent", handler).then((h) => {
    listenerHandle = h;
  });
  return () => listenerHandle?.remove();
};
