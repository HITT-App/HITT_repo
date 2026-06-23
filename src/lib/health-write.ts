/**
 * HealthKit write bridge — saves phone-recorded GPS activities as HKWorkout
 * with attached HKWorkoutRoute so they appear in Apple Fitness with the route polyline.
 *
 * Backed by the native HealthWritePlugin (ios/App/App/HealthWritePlugin.swift).
 * The existing @capgo/capacitor-health usage is read-only and untouched.
 */
import { Capacitor, registerPlugin } from "@capacitor/core"

export type HealthWriteResult =
  | { ok: true; uuid: string }
  | { ok: false; reason: string }

interface HealthWritePluginInterface {
  requestAuth(): Promise<HealthWriteResult>
  saveWorkoutWithRoute(options: SaveWorkoutOptions): Promise<HealthWriteResult>
}

export interface SavePosition {
  lat: number
  lng: number
  ts: number
  alt?: number | null
  accuracy?: number
}

export interface SaveWorkoutOptions {
  activityType: string
  startedAt: number
  endedAt: number
  distanceMeters: number
  calories?: number
  positions: SavePosition[]
  metadata?: Record<string, string | number | boolean>
}

const HealthWrite = registerPlugin<HealthWritePluginInterface>("HealthWrite")

export async function ensureHealthWriteAuth(): Promise<HealthWriteResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: "not_native" }
  }
  try {
    const res = await HealthWrite.requestAuth()
    return res
  } catch (err) {
    return { ok: false, reason: (err as Error)?.message || "error" }
  }
}

export async function saveActivityToHealth(
  params: SaveWorkoutOptions,
): Promise<HealthWriteResult> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, reason: "not_native" }
  }
  try {
    const res = await HealthWrite.saveWorkoutWithRoute(params)
    return res
  } catch (err) {
    return { ok: false, reason: (err as Error)?.message || "error" }
  }
}
