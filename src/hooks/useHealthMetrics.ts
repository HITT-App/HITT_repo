import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type MetricType = "heart_rate" | "blood_pressure" | "steps" | "weight" | "hydration";

interface HealthMetricRow {
  id: string;
  user_id: string;
  metric_type: string;
  value: number;
  secondary_value: number | null;
  unit: string;
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export function useHealthMetrics() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch latest reading per metric type
  const { data: latestMetrics, isLoading } = useQuery({
    queryKey: ["health-metrics-latest", user?.id],
    queryFn: async () => {
      // Get the most recent reading for each metric type
      const types: MetricType[] = ["heart_rate", "blood_pressure", "steps", "weight", "hydration"];
      const results: Record<string, HealthMetricRow | null> = {};

      const promises = types.map(async (type) => {
        const { data } = await supabase
          .from("health_metrics")
          .select("*")
          .eq("user_id", user!.id)
          .eq("metric_type", type)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        results[type] = data as HealthMetricRow | null;
      });

      await Promise.all(promises);
      return results;
    },
    enabled: !!user?.id,
  });

  // Fetch history for a specific metric type
  const useMetricHistory = (type: MetricType, limit = 30) => {
    return useQuery({
      queryKey: ["health-metrics-history", user?.id, type, limit],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("health_metrics")
          .select("*")
          .eq("user_id", user!.id)
          .eq("metric_type", type)
          .order("recorded_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return (data || []) as HealthMetricRow[];
      },
      enabled: !!user?.id,
    });
  };

  // Fetch today's aggregate for steps/hydration
  const useTodayTotal = (type: "steps" | "hydration") => {
    return useQuery({
      queryKey: ["health-metrics-today", user?.id, type],
      queryFn: async () => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from("health_metrics")
          .select("value")
          .eq("user_id", user!.id)
          .eq("metric_type", type)
          .gte("recorded_at", todayStart.toISOString());

        if (error) throw error;
        return (data || []).reduce((sum, row) => sum + Number(row.value), 0);
      },
      enabled: !!user?.id,
    });
  };

  // Log a new metric reading
  const logMetric = useMutation({
    mutationFn: async (data: {
      metric_type: MetricType;
      value: number;
      secondary_value?: number;
      unit: string;
      notes?: string;
      recorded_at?: string;
    }) => {
      const { error } = await supabase.from("health_metrics").insert({
        user_id: user!.id,
        metric_type: data.metric_type,
        value: data.value,
        secondary_value: data.secondary_value ?? null,
        unit: data.unit,
        notes: data.notes ?? null,
        recorded_at: data.recorded_at ?? new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-metrics-latest"] });
      queryClient.invalidateQueries({ queryKey: ["health-metrics-history"] });
      queryClient.invalidateQueries({ queryKey: ["health-metrics-today"] });
    },
  });

  // Helper to get formatted latest value
  const getLatestValue = (type: MetricType): string | null => {
    const metric = latestMetrics?.[type];
    if (!metric) return null;

    if (type === "blood_pressure" && metric.secondary_value != null) {
      return `${Math.round(metric.value)}/${Math.round(metric.secondary_value)}`;
    }
    if (type === "weight") {
      return metric.value.toFixed(1);
    }
    if (type === "steps" || type === "hydration") {
      return Math.round(metric.value).toLocaleString();
    }
    return Math.round(metric.value).toString();
  };

  return {
    latestMetrics,
    isLoading,
    logMetric,
    getLatestValue,
    useMetricHistory,
    useTodayTotal,
  };
}
