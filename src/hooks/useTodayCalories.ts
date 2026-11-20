import { useQuery } from "@tanstack/react-query"
import { Capacitor } from "@capacitor/core"
import type { HealthDataType, HealthSample } from "@capgo/capacitor-health"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"

export type TodayCalories = {
  active: number | null
  resting: number | null
}

export type TodayCaloriesWithSource = TodayCalories & { fromGarmin: boolean }

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

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

// garmin-health.ts keys each day's calories by the user's Garmin calendar date.
async function readGarminCalories(userId: string): Promise<TodayCalories> {
  const date = localDate(new Date())
  const { data, error } = await supabase
    .from("health_metrics")
    .select("metric_type, value")
    .eq("user_id", userId)
    .eq("source_platform", "garmin_api")
    .in("source_platform_id", [`active-kcal-${date}`, `resting-kcal-${date}`])
  if (error) throw error
  const value = (type: string) => {
    const row = (data ?? []).find((r) => r.metric_type === type)
    return row ? rounded(Number(row.value)) : null
  }
  return { active: value("active_calories"), resting: value("resting_calories") }
}

export function pickTodayCalories(
  phone: TodayCalories | undefined,
  garmin: TodayCalories | undefined,
): TodayCaloriesWithSource {
  if (garmin && (garmin.active != null || garmin.resting != null)) return { ...garmin, fromGarmin: true }
  return { ...(phone ?? EMPTY), fromGarmin: false }
}

export function useTodayCalories() {
  const { user } = useAuth()
  const phone = useQuery({
    queryKey: ["today-calories"],
    queryFn: readTodayCalories,
    enabled: Capacitor.isNativePlatform(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
  const garmin = useQuery({
    queryKey: ["today-calories", "garmin", user?.id],
    queryFn: () => readGarminCalories(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
  return { data: pickTodayCalories(phone.data, garmin.data) }
}
