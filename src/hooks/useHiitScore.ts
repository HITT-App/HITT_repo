import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface HiitScoreComponents {
  workouts: number;
  streak: number;
  nutrition: number;
  sleep: number;
  intensity: number;
  inputs?: {
    workoutCount: number;
    streakDays: number;
    nutritionDaysHit: number;
    sleepDaysGood: number;
    avgDurationMinutes: number;
  };
}

interface HiitScoreRow {
  score: number;
  components: HiitScoreComponents;
  computed_at: string;
}

export function useHiitScore() {
  const { user } = useAuth();
  const [score, setScore] = useState<number | null>(null);
  const [components, setComponents] = useState<HiitScoreComponents | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatest = useCallback(async (): Promise<HiitScoreRow | null> => {
    if (!user) return null;
    const { data } = await supabase
      .from("hiit_score_history")
      .select("score, components, computed_at")
      .eq("user_id", user.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      score: data.score,
      components: data.components as unknown as HiitScoreComponents,
      computed_at: data.computed_at,
    };
  }, [user]);

  const recompute = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("compute-hiit-score", {
      body: {},
    });
    if (error) throw error;
    return data as { score: number; components: HiitScoreComponents };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const latest = await fetchLatest();

      // Recompute if we've never scored this user, or the latest score is from
      // before today (UTC) — keeps the trend chart at daily granularity for
      // users who open the app daily, without relying on pg_cron.
      // audit:ignore CA-44 — UTC anchor: compared to computed_at (stored UTC), must stay UTC
      const todayUTC = new Date().toISOString().split("T")[0];
      const latestDate = latest?.computed_at.split("T")[0];
      const stale = !latest || latestDate !== todayUTC;

      if (stale) {
        try {
          const fresh = await recompute();
          if (!cancelled) {
            setScore(fresh.score);
            setComponents(fresh.components);
          }
        } catch (err) {
          console.error("useHiitScore: recompute failed", err);
          if (!cancelled && latest) {
            setScore(latest.score);
            setComponents(latest.components);
          }
        }
      } else if (!cancelled) {
        setScore(latest.score);
        setComponents(latest.components);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, fetchLatest, recompute]);

  return { score, components, loading, recompute };
}
