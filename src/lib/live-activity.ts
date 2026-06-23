// Live Activity wrapper — iOS 16.2+ Lock Screen + Dynamic Island for in-progress workouts.
//
// We hide the underlying plugin (capacitor-live-activity by kisimediaDE) behind a typed
// surface so call sites don't deal with stringly-typed `Record<string, string>` payloads
// or the plugin's `id`-based addressing scheme. On web, simulator, iOS < 16.2, or when
// the user has Live Activities disabled, every method is a safe no-op.
//
// The native plugin uses a single shared `GenericAttributes` Swift type — see widget
// extension (`ios/App/HIITLiveActivity/`) which reads from the same map.

import { Capacitor } from "@capacitor/core"

export type WorkoutAttributes = {
  workoutType: string
  workoutTitle: string
  startedAt: number
}

export type WorkoutContentState = {
  elapsedSeconds: number
  distanceMeters: number
  paceString: string
  heartRate?: number | null
  isPaused: boolean
}

export type LiveActivityHandle = { activityId: string }

type PluginShape = {
  isAvailable: () => Promise<{ value: boolean }>
  startActivity: (opts: {
    id: string
    attributes: Record<string, string>
    contentState: Record<string, string>
    timestamp?: number
  }) => Promise<void>
  updateActivity: (opts: {
    id: string
    contentState: Record<string, string>
    timestamp?: number
  }) => Promise<void>
  endActivity: (opts: {
    id: string
    contentState: Record<string, string>
    dismissalPolicy?: "default" | "immediate" | "after"
    dismissalDate?: number
  }) => Promise<void>
}

let cachedPlugin: PluginShape | null | undefined = undefined

async function getPlugin(): Promise<PluginShape | null> {
  if (cachedPlugin !== undefined) return cachedPlugin
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    cachedPlugin = null
    return null
  }
  try {
    const mod = await import("capacitor-live-activity")
    cachedPlugin = (mod.LiveActivity as unknown as PluginShape) ?? null
  } catch {
    cachedPlugin = null
  }
  return cachedPlugin
}

function attrsToRecord(a: WorkoutAttributes): Record<string, string> {
  return {
    workoutType: a.workoutType,
    workoutTitle: a.workoutTitle,
    startedAt: String(a.startedAt),
  }
}

function stateToRecord(s: WorkoutContentState): Record<string, string> {
  return {
    elapsedSeconds: String(Math.max(0, Math.floor(s.elapsedSeconds))),
    distanceMeters: String(Math.max(0, s.distanceMeters)),
    paceString: s.paceString,
    heartRate: s.heartRate != null ? String(Math.round(s.heartRate)) : "",
    isPaused: s.isPaused ? "1" : "0",
  }
}

function newLogicalId(): string {
  return `hitt-workout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export const LiveActivity = {
  async isSupported(): Promise<boolean> {
    const plugin = await getPlugin()
    if (!plugin) return false
    try {
      const { value } = await plugin.isAvailable()
      return !!value
    } catch {
      return false
    }
  },

  async start(
    attrs: WorkoutAttributes,
    initial: WorkoutContentState,
  ): Promise<LiveActivityHandle | null> {
    const plugin = await getPlugin()
    if (!plugin) return null
    try {
      const { value } = await plugin.isAvailable()
      if (!value) return null
    } catch {
      return null
    }
    const id = newLogicalId()
    try {
      await plugin.startActivity({
        id,
        attributes: attrsToRecord(attrs),
        contentState: stateToRecord(initial),
        timestamp: Date.now(),
      })
      return { activityId: id }
    } catch {
      return null
    }
  },

  async update(activityId: string, state: WorkoutContentState): Promise<void> {
    if (!activityId) return
    const plugin = await getPlugin()
    if (!plugin) return
    try {
      await plugin.updateActivity({
        id: activityId,
        contentState: stateToRecord(state),
        timestamp: Date.now(),
      })
    } catch {
      // Silent — Live Activity failures must never break the live workout.
    }
  },

  async end(activityId: string, finalState?: WorkoutContentState): Promise<void> {
    if (!activityId) return
    const plugin = await getPlugin()
    if (!plugin) return
    const content = finalState
      ? stateToRecord(finalState)
      : { elapsedSeconds: "0", distanceMeters: "0", paceString: "", heartRate: "", isPaused: "0" }
    try {
      await plugin.endActivity({
        id: activityId,
        contentState: content,
        dismissalPolicy: "default",
      })
    } catch {
      // Silent.
    }
  },
}
