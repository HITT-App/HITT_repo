import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DailyNutrition {
  calories: { consumed: number; target: number };
  protein: { consumed: number; target: number };
  carbs: { consumed: number; target: number };
  fat: { consumed: number; target: number };
  waterMl: { consumed: number; target: number };
  loading: boolean;
  refresh: () => void;
}

const DEFAULT_TARGETS = {
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 65,
  waterMl: 2000,
};

export function useDailyNutrition(): DailyNutrition {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState({
    consumed: { calories: 0, protein: 0, carbs: 0, fat: 0, waterMl: 0 },
    targets: DEFAULT_TARGETS,
  });

  const fetchToday = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startISO = startOfDay.toISOString();

    try {
      const [goalsRes, mealsRes, waterRes, prefsRes] = await Promise.all([
        supabase
          .from("nutrition_goals")
          .select("daily_calories, daily_protein_grams, daily_carbs_grams, daily_fat_grams")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("meal_logs")
          .select("calories, protein_grams, carbs_grams, fat_grams")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("logged_at", startISO),
        supabase
          .from("health_metrics")
          .select("value, unit")
          .eq("user_id", user.id)
          .eq("metric_type", "hydration")
          .gte("recorded_at", startISO),
        supabase
          .from("nutrition_profiles")
          .select("daily_calorie_target")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      const meals = mealsRes.data ?? [];
      const consumed = meals.reduce(
        (acc, m) => ({
          calories: acc.calories + (m.calories ?? 0),
          protein: acc.protein + Number(m.protein_grams ?? 0),
          carbs: acc.carbs + Number(m.carbs_grams ?? 0),
          fat: acc.fat + Number(m.fat_grams ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // Treat hydration metric values as ml by default; assume "glass"-logged
      // entries without a unit are 250ml each.
      const waterMl = (waterRes.data ?? []).reduce((acc, row) => {
        const v = Number(row.value ?? 0);
        return acc + (row.unit === "glass" ? v * 250 : v);
      }, 0);

      setState({
        consumed: { ...consumed, waterMl },
        targets: {
          calories: prefsRes.data?.daily_calorie_target ?? goalsRes.data?.daily_calories ?? DEFAULT_TARGETS.calories,
          protein: goalsRes.data?.daily_protein_grams ?? DEFAULT_TARGETS.protein,
          carbs: goalsRes.data?.daily_carbs_grams ?? DEFAULT_TARGETS.carbs,
          fat: goalsRes.data?.daily_fat_grams ?? DEFAULT_TARGETS.fat,
          waterMl: DEFAULT_TARGETS.waterMl,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  return {
    calories: { consumed: state.consumed.calories, target: state.targets.calories },
    protein: { consumed: state.consumed.protein, target: state.targets.protein },
    carbs: { consumed: state.consumed.carbs, target: state.targets.carbs },
    fat: { consumed: state.consumed.fat, target: state.targets.fat },
    waterMl: { consumed: state.consumed.waterMl, target: state.targets.waterMl },
    loading,
    refresh: fetchToday,
  };
}
