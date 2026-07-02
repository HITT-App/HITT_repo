import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

export interface ActivityItem {
  id: string;
  type: "signup" | "post" | "badge" | "workout" | "meal";
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
}

export function useRecentActivity(limit: number = 10) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch recent data in parallel
      const [profilesRes, postsRes, badgesRes, workoutProgressRes, mealLogsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, user_id, display_name, created_at")
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("community_posts")
          .select("id, content, created_at")
          .is("deleted_at", null)
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("user_badges")
          .select("id, badge_id, earned_at, badges(name)")
          .gte("earned_at", sevenDaysAgo.toISOString())
          .order("earned_at", { ascending: false })
          .limit(5),
        supabase
          .from("workout_progress")
          .select("id, workout_id, created_at, workouts(title)")
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("meal_logs")
          .select("id, meal_id, logged_at, meals(name)")
          .gte("logged_at", sevenDaysAgo.toISOString())
          .order("logged_at", { ascending: false })
          .limit(5),
      ]);

      const allActivities: ActivityItem[] = [];

      // Process signups
      profilesRes.data?.forEach((profile) => {
        allActivities.push({
          id: `signup-${profile.id}`,
          type: "signup",
          title: "New User Signup",
          description: profile.display_name || "Anonymous user joined",
          timestamp: profile.created_at,
          relativeTime: formatDistanceToNow(new Date(profile.created_at), { addSuffix: true }),
        });
      });

      // Process posts
      postsRes.data?.forEach((post) => {
        allActivities.push({
          id: `post-${post.id}`,
          type: "post",
          title: "New Community Post",
          description: post.content?.substring(0, 50) + (post.content?.length > 50 ? "..." : "") || "New post",
          timestamp: post.created_at,
          relativeTime: formatDistanceToNow(new Date(post.created_at), { addSuffix: true }),
        });
      });

      // Process badges
      badgesRes.data?.forEach((badge: any) => {
        allActivities.push({
          id: `badge-${badge.id}`,
          type: "badge",
          title: "Badge Earned",
          description: badge.badges?.name || "Achievement unlocked",
          timestamp: badge.earned_at,
          relativeTime: formatDistanceToNow(new Date(badge.earned_at), { addSuffix: true }),
        });
      });

      // Process workout progress
      workoutProgressRes.data?.forEach((progress: any) => {
        allActivities.push({
          id: `workout-${progress.id}`,
          type: "workout",
          title: "Workout Completed",
          description: progress.workouts?.title || "Workout finished",
          timestamp: progress.created_at,
          relativeTime: formatDistanceToNow(new Date(progress.created_at), { addSuffix: true }),
        });
      });

      // Process meal logs
      mealLogsRes.data?.forEach((log: any) => {
        allActivities.push({
          id: `meal-${log.id}`,
          type: "meal",
          title: "Meal Logged",
          description: log.meals?.name || "Meal tracked",
          timestamp: log.logged_at,
          relativeTime: formatDistanceToNow(new Date(log.logged_at), { addSuffix: true }),
        });
      });

      // Sort by timestamp and limit
      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(allActivities.slice(0, limit));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [limit]);

  return { activities, loading, refetch: fetchActivity };
}
