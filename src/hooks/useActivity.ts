import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, format, subDays } from "date-fns";

export const useActivity = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch activity preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["activity-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_preferences")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch activity goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ["activity-goals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_goals")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch activity logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["activity-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user?.id)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch this week's activities
  const { data: weeklyLogs = [] } = useQuery({
    queryKey: ["activity-logs-weekly", user?.id],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user?.id)
        .gte("started_at", weekStart.toISOString())
        .lte("started_at", weekEnd.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ["activity-recommendations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_recommendations")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate activity score (based on weekly progress)
  const calculateScore = () => {
    if (!goals || weeklyLogs.length === 0) return 0;

    const totalActivities = weeklyLogs.length;
    const totalCalories = weeklyLogs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);
    const totalDistance = weeklyLogs.reduce((sum, log) => sum + Number(log.distance_km || 0), 0);
    const totalDuration = weeklyLogs.reduce((sum, log) => sum + (log.duration_seconds || 0) / 60, 0);

    const activityScore = Math.min((totalActivities / (goals.weekly_activities || 5)) * 25, 25);
    const calorieScore = Math.min((totalCalories / (goals.weekly_calories || 1500)) * 25, 25);
    const distanceScore = Math.min((totalDistance / Number(goals.weekly_distance_km || 10)) * 25, 25);
    const durationScore = Math.min((totalDuration / (goals.weekly_duration_minutes || 150)) * 25, 25);

    return Math.round(activityScore + calorieScore + distanceScore + durationScore);
  };

  // Get weekly stats
  const getWeeklyStats = () => {
    const totalCalories = weeklyLogs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);
    const totalDistance = weeklyLogs.reduce((sum, log) => sum + Number(log.distance_km || 0), 0);
    const totalMinutes = weeklyLogs.reduce((sum, log) => sum + (log.duration_seconds || 0) / 60, 0);

    return {
      activities: weeklyLogs.length,
      calories: totalCalories,
      distance: totalDistance.toFixed(1),
      minutes: Math.round(totalMinutes),
    };
  };

  // Get activity breakdown by type
  const getActivityBreakdown = () => {
    const breakdown: Record<string, number> = {};
    logs.forEach((log) => {
      breakdown[log.activity_type] = (breakdown[log.activity_type] || 0) + 1;
    });
    return Object.entries(breakdown)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  };

  // Save preferences
  const savePreferences = useMutation({
    mutationFn: async (data: {
      activity_types: string[];
      preferred_time: string;
      typical_duration_minutes: number;
      intensity_level: number;
      onboarding_completed: boolean;
    }) => {
      const { error } = await supabase
        .from("activity_preferences")
        .upsert({
          user_id: user?.id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-preferences"] });
    },
  });

  // Save goals
  const saveGoals = useMutation({
    mutationFn: async (data: {
      weekly_activities: number;
      weekly_distance_km: number;
      weekly_calories: number;
      weekly_duration_minutes: number;
    }) => {
      const { error } = await supabase
        .from("activity_goals")
        .upsert({
          user_id: user?.id,
          ...data,
        }, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-goals"] });
    },
  });

  // Calculate score impact based on activity metrics
  const calculateScoreImpact = (data: {
    duration_seconds: number;
    intensity_level?: number;
    calories_burned?: number;
  }): number => {
    // Base score on duration (longer = more impact)
    let score = 1;
    const durationMinutes = data.duration_seconds / 60;
    
    if (durationMinutes >= 60) score = 5;
    else if (durationMinutes >= 45) score = 4;
    else if (durationMinutes >= 30) score = 3;
    else if (durationMinutes >= 15) score = 2;
    
    // Boost by intensity if provided
    if (data.intensity_level && data.intensity_level >= 4) {
      score = Math.min(5, score + 1);
    }
    
    return score;
  };

  // Flip activity onboarding flag — used after a successful workout completes,
  // since by that point the user has clearly figured out how to use activities.
  // Fixes the loop where new users who bypass the onboarding wizard get bounced
  // back to it every time they tap X on the completion screen.
  const markActivityOnboardingComplete = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("activity_preferences")
        .upsert(
          { user_id: user.id, onboarding_completed: true },
          { onConflict: "user_id", ignoreDuplicates: false },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-preferences"] });
    },
  });

  // Log activity
  const logActivity = useMutation({
    mutationFn: async (data: {
      activity_type: string;
      duration_seconds: number;
      distance_km?: number;
      calories_burned?: number;
      intensity_level?: number;
      notes?: string;
      // Strength/gym sessions: sum of (weight × reps) across every completed set.
      // Used by the Strength share card and the ActivityDetail volume readout.
      total_volume_kg?: number;
    }) => {
      const { data: inserted, error } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user?.id,
          ...data,
          ended_at: new Date().toISOString(),
          score_impact: calculateScoreImpact(data),
        })
        .select("id")
        .maybeSingle();

      if (error) throw error;
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs-weekly"] });
    },
  });

  return {
    preferences,
    preferencesLoading,
    goals,
    goalsLoading,
    logs,
    logsLoading,
    weeklyLogs,
    recommendations,
    activityScore: calculateScore(),
    weeklyStats: getWeeklyStats(),
    activityBreakdown: getActivityBreakdown(),
    savePreferences,
    saveGoals,
    logActivity,
    markActivityOnboardingComplete,
  };
};
