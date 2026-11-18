import { useQuery } from "@tanstack/react-query"
import { Capacitor } from "@capacitor/core"
import type { HealthDataType, HealthSample } from "@capgo/capacitor-health"

export type TodayCalories = {
  active: number | null
  resting: number | null
}

const EMPTY: TodayCalories = { active: null, resting: null }

const sumBuckets = (samples: { value: number }[]) =>
  samples.reduce((total, s) => total + (s.value || 0), 0)

// Health Connect can't aggregate total calories, and raw samples from two apps
// overlap, so take the single source that reported the most instead of adding them.
function largestSourceTotal(samples: HealthSample[]): number {
  const bySource = new Map<string, number>()
  for (const s of samples) {
    const key = s.sourceId ?? s.sourceName ?? "unknown"
    bySource.set(key, (bySource.get(key) ?? 0) + (s.value || 0))
  }
  return Math.max(0, ...bySource.values())
}

const rounded = (value: number) => (value > 0 ? Math.round(value) : null)

async function readTodayCalories(): Promise<TodayCalories> {
  const { Health } = await import("@capgo/capacitor-health")
  const { available } = await Health.isAvailable()
  if (!available) return EMPTY

  const platform = Capacitor.getPlatform()
  // iOS: active + resting energy. Android: active + total (resting is the difference),
  // because the basal permission was removed under Play's Minimum Scope policy.
  const read: HealthDataType[] = platform === "ios"
    ? ["calories", "basalCalories"]
    : ["calories", "totalCalories"]
  await Health.requestAuthorization({ read }).catch(() => {})

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const range = { startDate: start.toISOString(), endDate: new Date().toISOString() }

  const active = await Health.queryAggregated({ ...range, dataType: "calories", bucket: "day" })
    .then((r) => sumBuckets(r.samples))
    .catch(() => 0)

  let resting = 0
  if (platform === "ios") {
    resting = await Health.queryAggregated({ ...range, dataType: "basalCalories", bucket: "day" })
      .then((r) => sumBuckets(r.samples))
      .catch(() => 0)
  } else {
    const total = await Health.readSamples({ ...range, dataType: "totalCalories", limit: 1000 })
      .then((r) => largestSourceTotal(r.samples ?? []))
      .catch(() => 0)
    resting = total > active ? total - active : 0
  }

  return { active: rounded(active), resting: rounded(resting) }
}

export function useTodayCalories() {
  return useQuery({
    queryKey: ["today-calories"],
    queryFn: readTodayCalories,
    enabled: Capacitor.isNativePlatform(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}
