import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SmartDefaults {
  preferredTime: string | null;
  preferredDuration: number | null;
  preferredWorkoutTypes: string[];
  preferredEquipment: string[];
  lastWorkoutId: string | null;
  lastWorkoutType: string | null;
  suggestedWorkoutId: string | null;
}

export function useSmartDefaults() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["smart-defaults", user?.id],
    queryFn: async (): Promise<SmartDefaults> => {
      if (!user) {
        return {
          preferredTime: null,
          preferredDuration: null,
          preferredWorkoutTypes: [],
          preferredEquipment: [],
          lastWorkoutId: null,
          lastWorkoutType: null,
          suggestedWorkoutId: null,
        };
      }

      // Get user's workout preferences
      const { data: preferences } = await supabase
        .from("user_workout_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Get recent workout history to infer patterns
      const { data: recentWorkouts } = await supabase
        .from("workout_progress")
        .select(`
          workout_id,
          completed_at,
          duration_seconds,
          workouts (id, title, category, duration_minutes)
        `)
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(10);

      // Analyze patterns
      let inferredTime: string | null = null;
      let inferredDuration: number | null = null;
      const workoutTypes: Record<string, number> = {};

      if (recentWorkouts && recentWorkouts.length > 0) {
        // Analyze workout times
        const hours = recentWorkouts
          .filter(w => w.completed_at)
          .map(w => new Date(w.completed_at!).getHours());
        
        if (hours.length > 0) {
          const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
          if (avgHour >= 5 && avgHour < 12) inferredTime = "morning";
          else if (avgHour >= 12 && avgHour < 17) inferredTime = "afternoon";
          else inferredTime = "evening";
        }

        // Analyze duration preferences
        const durations = recentWorkouts
          .filter(w => w.duration_seconds)
          .map(w => Math.floor((w.duration_seconds || 0) / 60));
        
        if (durations.length > 0) {
          inferredDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        }

        // Analyze workout type preferences
        recentWorkouts.forEach(w => {
          const category = (w.workouts as any)?.category;
          if (category) {
            workoutTypes[category] = (workoutTypes[category] || 0) + 1;
          }
        });
      }

      return {
        preferredTime: preferences?.preferred_time || inferredTime,
        preferredDuration: preferences?.preferred_duration_minutes || inferredDuration,
        preferredWorkoutTypes: preferences?.preferred_workout_types || Object.keys(workoutTypes),
        preferredEquipment: preferences?.preferred_equipment || [],
        lastWorkoutId: preferences?.last_workout_id || recentWorkouts?.[0]?.workout_id || null,
        lastWorkoutType: preferences?.last_workout_type || (recentWorkouts?.[0]?.workouts as any)?.title || null,
        suggestedWorkoutId: null,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
