import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalWorkouts: number;
  workoutsCompleted: number;
  totalMeals: number;
  mealsLogged: number;
  totalCoaches: number;
  coachingSessions: number;
  communityPosts: number;
  pushSubscribers: number;
  notificationsSent: number;
  totalBadges: number;
  badgesEarned: number;
  admins: number;
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalWorkouts: 0,
    workoutsCompleted: 0,
    totalMeals: 0,
    mealsLogged: 0,
    totalCoaches: 0,
    coachingSessions: 0,
    communityPosts: 0,
    pushSubscribers: 0,
    notificationsSent: 0,
    totalBadges: 0,
    badgesEarned: 0,
    admins: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      // Execute all queries in parallel
      const [
        profilesRes,
        workoutsRes,
        workoutProgressRes,
        mealsRes,
        mealLogsRes,
        coachesRes,
        appointmentsRes,
        postsRes,
        pushSubsRes,
        notificationsRes,
        badgesRes,
        userBadgesRes,
        adminsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("workouts").select("*", { count: "exact", head: true }),
        supabase.from("workout_progress").select("*", { count: "exact", head: true }),
        supabase.from("meals").select("*", { count: "exact", head: true }),
        supabase.from("meal_logs").select("*", { count: "exact", head: true }),
        supabase.from("coaches").select("*", { count: "exact", head: true }),
        supabase.from("coaching_sessions").select("*", { count: "exact", head: true }),
        supabase.from("community_posts").select("*", { count: "exact", head: true }),
        supabase.from("push_subscriptions").select("*", { count: "exact", head: true }),
        supabase.from("push_notifications").select("*", { count: "exact", head: true }),
        supabase.from("badges").select("*", { count: "exact", head: true }),
        supabase.from("user_badges").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
      ]);

      // Calculate active users (logged activity in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { count: activeUsersCount } = await supabase
        .from("activity_logs")
        .select("user_id", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      setStats({
        totalUsers: profilesRes.count || 0,
        activeUsers: activeUsersCount || 0,
        totalWorkouts: workoutsRes.count || 0,
        workoutsCompleted: workoutProgressRes.count || 0,
        totalMeals: mealsRes.count || 0,
        mealsLogged: mealLogsRes.count || 0,
        totalCoaches: coachesRes.count || 0,
        coachingSessions: appointmentsRes.count || 0,
        communityPosts: postsRes.count || 0,
        pushSubscribers: pushSubsRes.count || 0,
        notificationsSent: notificationsRes.count || 0,
        totalBadges: badgesRes.count || 0,
        badgesEarned: userBadgesRes.count || 0,
        admins: adminsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
}
