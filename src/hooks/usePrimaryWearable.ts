// React-Query wrapper around getPrimaryWearable with two layers of caching:
//   - In-memory (React Query): 1h staleTime, so re-renders don't re-fetch.
//   - localStorage: 7-day decision cache, surfaced as placeholder data so the
//     UI never flickers between vendor variants while React Query loads.
// The localStorage cache also dampens day-to-day noise — a Garmin user who
// does a single Apple Watch walk doesn't get yanked between flows.

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getPrimaryWearable,
  type PrimaryWearable,
} from "@/lib/wearable-detection";
import { isWatchPaired } from "@/plugins/WatchPlugin";

const CACHE_KEY = "hitt.primaryWearable.v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const STALE_TIME_MS = 60 * 60 * 1000;          // 1 hour — re-fetch on next mount only
const GC_TIME_MS = 24 * 60 * 60 * 1000;        // 24 hours

interface CachedDecision {
  userId: string;
  wearable: PrimaryWearable;
  cachedAt: number;
}

function readCachedDecision(userId: string): PrimaryWearable | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CachedDecision;
    if (parsed.userId !== userId) return undefined;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return undefined;
    return parsed.wearable;
  } catch {
    return undefined;
  }
}

function writeCachedDecision(userId: string, wearable: PrimaryWearable): void {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ userId, wearable, cachedAt: Date.now() } satisfies CachedDecision),
    );
  } catch {
    // localStorage unavailable (private browsing / disabled) — silently no-op.
  }
}

export function usePrimaryWearable() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["primaryWearable", user?.id],
    queryFn: async (): Promise<PrimaryWearable> => {
      if (!user?.id) return "phone_only";
      let wearable = await getPrimaryWearable(supabase, user.id);
      // Fallback for the fresh-install case: activity_logs is empty so
      // getPrimaryWearable returns phone_only, but WCSession knows a Watch
      // is paired + has the HITT app installed. Upgrade to apple_watch so
      // the "Launch on Watch" affordance surfaces on day one instead of
      // waiting for the user to record two workouts. Non-Apple vendors
      // still win when they meet the history threshold (§getPrimaryWearable).
      if (wearable === "phone_only") {
        const { paired, installed } = await isWatchPaired();
        if (paired && installed) wearable = "apple_watch";
      }
      writeCachedDecision(user.id, wearable);
      return wearable;
    },
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    placeholderData: user?.id ? readCachedDecision(user.id) : undefined,
  });

  return {
    wearable: (query.data ?? "phone_only") as PrimaryWearable,
    isLoading: query.isLoading && !query.data,
    refetch: query.refetch,
  };
}
