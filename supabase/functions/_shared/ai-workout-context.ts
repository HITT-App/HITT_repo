import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type WorkoutContext = {
  healthMetricsSummary: string;
  goalsSummary: string;
  recentActivitySummary: string;
  customMemory: string;
  customResponseStyle: string;
};

async function summariseHealthMetrics(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<string> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("health_metrics")
    .select("metric_type, value, unit, recorded_at")
    .eq("user_id", userId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: false });

  if (!data || data.length === 0) return "No health metrics on record.";

  // Group by type and compute averages
  const byType: Record<string, number[]> = {};
  for (const row of data) {
    if (!byType[row.metric_type]) byType[row.metric_type] = [];
    byType[row.metric_type].push(Number(row.value));
  }

  const avg = (arr: number[]) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  const parts: string[] = [];
  if (byType.heart_rate) parts.push(`avg resting HR ${avg(byType.heart_rate)} bpm`);
  if (byType.steps) parts.push(`avg daily steps ${avg(byType.steps).toLocaleString()}`);
  if (byType.weight) parts.push(`latest weight ${byType.weight[0]} kg`);
  if (byType.hrv) parts.push(`avg HRV ${avg(byType.hrv)} ms`);
  if (byType.vo2_max) parts.push(`VO2 max ~${avg(byType.vo2_max)}`);

  if (parts.length === 0) return "No health metrics on record.";

  return `Health metrics (last ${days} days): ${parts.join(", ")}.`;
}

async function summariseGoals(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const [{ data: prefs }, { data: goals }] = await Promise.all([
    supabase
      .from("workout_preferences")
      .select("workout_goal, fitness_level, days_per_week, session_duration, target_body_areas, available_equipment")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("activity_goals")
      .select("weekly_activities, weekly_calories, weekly_duration_minutes")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const parts: string[] = [];

  if (prefs) {
    if (prefs.workout_goal) parts.push(`goal: ${prefs.workout_goal}`);
    if (prefs.fitness_level) parts.push(`fitness level: ${prefs.fitness_level}`);
    if (prefs.days_per_week) parts.push(`trains ${prefs.days_per_week}x/week`);
    if (prefs.session_duration) parts.push(`prefers ${prefs.session_duration}-min sessions`);
    if (prefs.target_body_areas?.length) parts.push(`focus areas: ${prefs.target_body_areas.join(", ")}`);
    if (prefs.available_equipment?.length) parts.push(`equipment: ${prefs.available_equipment.join(", ")}`);
  }

  if (goals) {
    if (goals.weekly_calories) parts.push(`weekly calorie target: ${goals.weekly_calories} kcal`);
  }

  return parts.length > 0 ? `User profile: ${parts.join("; ")}.` : "No goals or preferences set.";
}

async function summariseRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<string> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const [{ data: actLogs }, { data: wkProgress }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("activity_type, duration_seconds, calories_burned, intensity_level, started_at")
      .eq("user_id", userId)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("workout_progress")
      .select("workout_title, workout_source, duration_seconds, calories_burned, completed_at")
      .eq("user_id", userId)
      .gte("completed_at", since)
      .order("completed_at", { ascending: false })
      .limit(10),
  ]);

  const lines: string[] = [];

  if (wkProgress && wkProgress.length > 0) {
    const totalWorkouts = wkProgress.length;
    const avgDuration = Math.round(
      wkProgress.reduce((s, w) => s + (w.duration_seconds ?? 0), 0) / totalWorkouts / 60
    );
    lines.push(`Completed ${totalWorkouts} workouts in last ${days} days (avg ${avgDuration} min).`);
    const recent = wkProgress.slice(0, 3).map(w =>
      `${w.completed_at?.split("T")[0]} — ${w.workout_title ?? "workout"}, ${Math.round((w.duration_seconds ?? 0) / 60)} min`
    );
    lines.push(`Recent: ${recent.join(" | ")}.`);
  }

  if (actLogs && actLogs.length > 0) {
    const typeCount: Record<string, number> = {};
    let totalCalories = 0;
    for (const a of actLogs) {
      typeCount[a.activity_type] = (typeCount[a.activity_type] || 0) + 1;
      totalCalories += a.calories_burned ?? 0;
    }
    const topTypes = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, n]) => `${t} (×${n})`)
      .join(", ");
    lines.push(`Activity logs: ${topTypes}. ~${totalCalories} kcal burned from logged activities.`);
  }

  return lines.length > 0 ? lines.join(" ") : "No recent activity logged.";
}

export async function gatherWorkoutContext(
  supabase: SupabaseClient,
  userId: string,
  client: { customMemory?: string; customResponseStyle?: string }
): Promise<WorkoutContext> {
  const [healthMetricsSummary, goalsSummary, recentActivitySummary] = await Promise.all([
    summariseHealthMetrics(supabase, userId, 90),
    summariseGoals(supabase, userId),
    summariseRecentActivity(supabase, userId, 30),
  ]);

  return {
    healthMetricsSummary,
    goalsSummary,
    recentActivitySummary,
    customMemory: client.customMemory ?? "",
    customResponseStyle: client.customResponseStyle ?? "",
  };
}
