import { Capacitor, registerPlugin } from "@capacitor/core";

// Capacitor bridge to native HealthKit reads. Mirrors the methods on
// ios/App/App/HealthKitReadPlugin.swift. v1 = foreground pulls only.

export interface HealthKitWorkout {
  uuid: string;
  sourceBundleId: string;
  sourceName: string;
  startedAt: string;       // ISO
  endedAt: string;         // ISO
  durationSeconds: number;
  activityType: string;
  isIndoor: boolean;
  calories?: number;
  distanceKm?: number;
  externalUUID?: string;
  deviceName?: string;
  deviceManufacturer?: string;
  deviceModel?: string;
}

export interface HealthKitDailyHR {
  date: string;    // YYYY-MM-DD (UTC anchor)
  avgBpm: number;
}

export interface HealthKitDailySteps {
  date: string;
  steps: number;
}

export interface HealthKitSleepNight {
  date: string;          // YYYY-MM-DD anchor (morning of)
  durationMinutes: number;
  bedtime: string;       // ISO
  wakeTime: string;      // ISO
  sourceBundleId: string;
}

interface HealthKitReadInterface {
  queryWorkouts(opts: { sinceISO: string }): Promise<{ workouts: HealthKitWorkout[] }>;
  queryHeartRateAverages(opts: { sinceISO: string }): Promise<{ days: HealthKitDailyHR[] }>;
  queryDailySteps(opts: { sinceISO: string }): Promise<{ days: HealthKitDailySteps[] }>;
  querySleep(opts: { sinceISO: string }): Promise<{ nights: HealthKitSleepNight[] }>;
}

const HealthKitReadImpl = registerPlugin<HealthKitReadInterface>("HealthKitRead");

export const isHealthKitReadAvailable = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";

export const HealthKitRead = HealthKitReadImpl;
