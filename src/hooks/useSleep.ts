import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { recordActiveDay } from "@/lib/activeDay";
import { startOfWeek, endOfWeek, subDays, differenceInMinutes, parseISO, format } from "date-fns";

export const useSleep = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch sleep preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["sleep-preferences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_preferences")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch sleep schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ["sleep-schedules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_schedules")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch sleep logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["sleep-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user?.id)
        .order("sleep_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch this week's sleep logs
  const { data: weeklyLogs = [] } = useQuery({
    queryKey: ["sleep-logs-weekly", user?.id],
    queryFn: async () => {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      const { data, error } = await supabase
        .from("sleep_logs")
        .select("*")
        .eq("user_id", user?.id)
        .gte("sleep_date", format(weekStart, "yyyy-MM-dd"))
        .lte("sleep_date", format(weekEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ["sleep-recommendations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_recommendations")
        .select("*")
        .eq("user_id", user?.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Calculate sleep score (0-100)
  const calculateSleepScore = () => {
    if (!preferences || weeklyLogs.length === 0) return 0;

    const targetMinutes = (Number(preferences.target_hours) || 8) * 60 + (preferences.target_minutes || 0);
    const avgDuration = weeklyLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0) / weeklyLogs.length;
    const avgQuality = weeklyLogs.reduce((sum, log) => sum + (log.sleep_quality || 70), 0) / weeklyLogs.length;

    // Score based on duration (50%) and quality (50%)
    const durationScore = Math.min((avgDuration / targetMinutes) * 50, 50);
    const qualityScore = (avgQuality / 100) * 50;

    return Math.round(durationScore + qualityScore);
  };

  // Get weekly stats
  const getWeeklyStats = () => {
    const totalMinutes = weeklyLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);
    const avgMinutes = weeklyLogs.length > 0 ? totalMinutes / weeklyLogs.length : 0;
    const avgQuality = weeklyLogs.length > 0 
      ? weeklyLogs.reduce((sum, log) => sum + (log.sleep_quality || 0), 0) / weeklyLogs.length 
      : 0;
    const totalDeep = weeklyLogs.reduce((sum, log) => sum + (log.deep_sleep_minutes || 0), 0);
    const totalRem = weeklyLogs.reduce((sum, log) => sum + (log.rem_sleep_minutes || 0), 0);
    const totalLight = weeklyLogs.reduce((sum, log) => sum + (log.light_sleep_minutes || 0), 0);

    return {
      nightsLogged: weeklyLogs.length,
      totalMinutes,
      avgMinutes: Math.round(avgMinutes),
      avgHours: Math.floor(avgMinutes / 60),
      avgRemainingMinutes: Math.round(avgMinutes % 60),
      avgQuality: Math.round(avgQuality),
      deepSleep: Math.round(totalDeep / Math.max(weeklyLogs.length, 1)),
      remSleep: Math.round(totalRem / Math.max(weeklyLogs.length, 1)),
      lightSleep: Math.round(totalLight / Math.max(weeklyLogs.length, 1)),
    };
  };

  // Get active schedule
  const activeSchedule = schedules.find(s => s.is_active) || schedules[0];

  // Save preferences
  const savePreferences = useMutation({
    mutationFn: async (data: {
      target_hours: number;
      target_minutes?: number;
      preferred_wake_time?: string;
      preferred_bedtime?: string;
      sleep_issues?: string;
      onboarding_completed?: boolean;
    }) => {
      const { error } = await supabase
        .from("sleep_preferences")
        .upsert({
          user_id: user?.id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep-preferences"] });
    },
  });

  // Save schedule
  const saveSchedule = useMutation({
    mutationFn: async (data: {
      active_days?: string[];
      bedtime: string;
      wake_time: string;
      alarm_sound?: string;
      repeat_alarm?: string;
      vibration_enabled?: boolean;
      is_active?: boolean;
    }) => {
      // Deactivate other schedules first
      if (data.is_active !== false) {
        await supabase
          .from("sleep_schedules")
          .update({ is_active: false })
          .eq("user_id", user?.id);
      }

      const { error } = await supabase
        .from("sleep_schedules")
        .insert({
          user_id: user?.id,
          ...data,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep-schedules"] });
    },
  });

  // Calculate sleep score impact based on duration and quality
  const calculateSleepScoreImpact = (
    durationMinutes: number,
    quality?: number,
    targetHours: number = 8
  ): number => {
    const targetMinutes = targetHours * 60;
    const durationRatio = durationMinutes / targetMinutes;
    
    let score = 1;
    
    // Score based on how close to target (7-9 hours optimal)
    if (durationRatio >= 0.875 && durationRatio <= 1.125) {
      score = 5; // 7-9 hours
    } else if (durationRatio >= 0.75 && durationRatio <= 1.25) {
      score = 4; // 6-10 hours
    } else if (durationRatio >= 0.625 && durationRatio <= 1.375) {
      score = 3; // 5-11 hours
    } else if (durationRatio >= 0.5) {
      score = 2; // 4+ hours
    }
    
    // Adjust by quality if provided
    if (quality !== undefined) {
      if (quality >= 80) score = Math.min(5, score + 1);
      else if (quality < 50) score = Math.max(1, score - 1);
    }
    
    return score;
  };

  // Log sleep
  const logSleep = useMutation({
    mutationFn: async (data: {
      sleep_date: string;
      bedtime: string;
      wake_time: string;
      sleep_quality?: number;
      deep_sleep_minutes?: number;
      rem_sleep_minutes?: number;
      light_sleep_minutes?: number;
      awake_minutes?: number;
      notes?: string;
    }) => {
      const bedtime = new Date(data.bedtime);
      const wakeTime = new Date(data.wake_time);
      const durationMinutes = differenceInMinutes(wakeTime, bedtime);
      const targetHours = preferences?.target_hours || 8;

      const { error } = await supabase.from("sleep_logs").insert({
        user_id: user?.id,
        ...data,
        duration_minutes: durationMinutes,
        score_impact: calculateSleepScoreImpact(durationMinutes, data.sleep_quality, targetHours),
      });

      if (error) throw error;
      recordActiveDay(supabase, user!.id).catch(() => {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep-logs"] });
      queryClient.invalidateQueries({ queryKey: ["sleep-logs-weekly"] });
    },
  });

  // Complete recommendation
  const completeRecommendation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sleep_recommendations")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sleep-recommendations"] });
    },
  });

  return {
    preferences,
    preferencesLoading,
    schedules,
    schedulesLoading,
    activeSchedule,
    logs,
    logsLoading,
    weeklyLogs,
    recommendations,
    sleepScore: calculateSleepScore(),
    weeklyStats: getWeeklyStats(),
    savePreferences,
    saveSchedule,
    logSleep,
    completeRecommendation,
  };
};
