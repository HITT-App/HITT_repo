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
import { LiveActivity as LiveActivityPlugin } from "capacitor-live-activity"

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
  listActivities: () => Promise<Array<{ id: string; activityId: string; state: string }>>
}

// IMPORTANT: getPlugin must be synchronous. The Capacitor plugin proxy treats
// every property access (including `.then`) as a native method call, so returning
// the proxy through an async function causes JS's Promise resolution to invoke
// `proxy.then` to "thenify" the value — Capacitor then attempts a non-existent
// native `then` method and throws "LiveActivity.then() is not implemented on ios".
function getPlugin(): PluginShape | null {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return null
  return (LiveActivityPlugin as unknown as PluginShape) ?? null
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
    const plugin = getPlugin()
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
    const plugin = getPlugin()
    if (!plugin) return null
    try {
      const { value } = await plugin.isAvailable()
      if (!value) return null
    } catch {
      return null
    }
    // Defensive sweep — clear any orphan activity from a previous process
    // before starting a new one, so we never accumulate stuck cards.
    try {
      const list = await plugin.listActivities()
      const empty = { elapsedSeconds: "0", distanceMeters: "0", paceString: "", heartRate: "", isPaused: "0" }
      await Promise.all(
        list
          .filter(a => a.state !== "dismissed" && a.state !== "ended")
          .map(a =>
            plugin.endActivity({
              id: a.id,
              contentState: empty,
              dismissalPolicy: "immediate",
            }).catch(() => {})
          )
      )
    } catch {
      // Silent.
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
    const plugin = getPlugin()
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
    const plugin = getPlugin()
    if (!plugin) return
    const content = finalState
      ? stateToRecord(finalState)
      : { elapsedSeconds: "0", distanceMeters: "0", paceString: "", heartRate: "", isPaused: "0" }
    try {
      await plugin.endActivity({
        id: activityId,
        contentState: content,
        // immediate so the card actually disappears now, not in 4 hours.
        dismissalPolicy: "immediate",
      })
    } catch {
      // Silent.
    }
  },

  // Sweep all in-flight Live Activities and dismiss them. Use on app launch so
  // orphans from a previous force-killed session (where end() never ran) don't
  // sit on the lock screen until iOS's own timeout. Also enforces "one workout
  // card at a time" — call before start() to clear stragglers.
  async endAll(): Promise<void> {
    const plugin = getPlugin()
    if (!plugin) return
    try {
      const list = await plugin.listActivities()
      const empty = { elapsedSeconds: "0", distanceMeters: "0", paceString: "", heartRate: "", isPaused: "0" }
      await Promise.all(
        list
          .filter(a => a.state !== "dismissed" && a.state !== "ended")
          .map(a =>
            plugin.endActivity({
              id: a.id,
              contentState: empty,
              dismissalPolicy: "immediate",
            }).catch(() => {})
          )
      )
    } catch {
      // Silent.
    }
  },
}
