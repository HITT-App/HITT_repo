import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Types
export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
  created_at: string;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
};

export type AchievementProgress = {
  id: string;
  user_id: string;
  badge_id: string;
  current_value: number;
  target_value: number;
  is_completed: boolean;
  completed_at: string | null;
  badge?: Badge;
};

export type LeaderboardEntry = {
  id: string;
  user_id: string;
  total_points: number;
  weekly_points: number;
  monthly_points: number;
  category: string;
  rank_position: number | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

// Hook for badges
export function useBadges() {
  return useQuery({
    queryKey: ["badges"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .order("requirement_value", { ascending: true });
      
      if (error) throw error;
      return data as Badge[];
    },
  });
}

// Hook for user's earned badges
export function useUserBadges() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          *,
          badge:badges(*)
        `)
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      
      if (error) throw error;
      return data as (UserBadge & { badge: Badge })[];
    },
    enabled: !!user?.id,
  });
}

// Hook for achievement progress
export function useAchievementProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achievement-progress", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("achievement_progress")
        .select(`
          *,
          badge:badges(*)
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      if (error) throw error;
      return data as (AchievementProgress & { badge: Badge })[];
    },
    enabled: !!user?.id,
  });
}

// Hook for leaderboard
export function useLeaderboard(
  category: "gym" | "worldwide" | "friends" = "worldwide",
  sortBy: "total_points" | "weekly_points" | "monthly_points" = "total_points"
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["leaderboard", category, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("leaderboard_scores")
        .select("*")
        .eq("category", category)
        .order(sortBy, { ascending: false })
        .limit(100);

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch profiles + levels for each user
      const userIds = data.map((entry: any) => entry.user_id);
      const [profilesRes, levelsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds),
        supabase.from("user_levels").select("user_id, level, title, xp").in("user_id", userIds),
      ]);
      
      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const levelMap = new Map(levelsRes.data?.map(l => [l.user_id, l]) || []);
      
      return data.map((entry: any, index: number) => ({
        ...entry,
        rank_position: index + 1,
        profile: profileMap.get(entry.user_id) || null,
        userLevel: levelMap.get(entry.user_id) || null,
      })) as (LeaderboardEntry & { userLevel: { level: number; title: string; xp: number } | null })[];
    },
  });
}

// Hook for friends leaderboard
export function useFriendsLeaderboard(
  sortBy: "total_points" | "weekly_points" | "monthly_points" = "total_points"
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["friends-leaderboard", sortBy, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get accepted friends where current user is either side
      const [{ data: sent }, { data: received }] = await Promise.all([
        supabase
          .from("user_friends")
          .select("friend_id")
          .eq("user_id", user.id)
          .eq("status", "accepted"),
        supabase
          .from("user_friends")
          .select("user_id")
          .eq("friend_id", user.id)
          .eq("status", "accepted"),
      ]);

      const friendIds = new Set<string>();
      friendIds.add(user.id);
      sent?.forEach(f => friendIds.add(f.friend_id));
      received?.forEach(f => friendIds.add(f.user_id));

      const ids = Array.from(friendIds);
      if (ids.length <= 1) return []; // Only self = no friends

      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select("*")
        .eq("category", "worldwide")
        .in("user_id", ids)
        .order(sortBy, { ascending: false });

      if (error) throw error;

      const [profilesRes, levelsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", ids),
        supabase.from("user_levels").select("user_id, level, title, xp").in("user_id", ids),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const levelMap = new Map(levelsRes.data?.map(l => [l.user_id, l]) || []);

      return data.map((entry: any, index: number) => ({
        ...entry,
        rank_position: index + 1,
        profile: profileMap.get(entry.user_id) || null,
        userLevel: levelMap.get(entry.user_id) || null,
      })) as (LeaderboardEntry & { userLevel: { level: number; title: string; xp: number } | null })[];
    },
    enabled: !!user?.id,
  });
}

// Hook for user's own leaderboard position
export function useUserRanking(category: "gym" | "worldwide" | "friends" = "worldwide") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-ranking", category, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select("*")
        .eq("user_id", user.id)
        .eq("category", category)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as LeaderboardEntry | null;
    },
    enabled: !!user?.id,
  });
}

// Hook for real-time leaderboard updates
export function useRealtimeLeaderboard(category: "gym" | "worldwide" | "friends" = "worldwide") {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`leaderboard-${category}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leaderboard_scores",
          filter: `category=eq.${category}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard", category] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [category, queryClient]);
}

// Actions hook
export function useAchievementActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Award points mutation
  const awardPoints = useMutation({
    mutationFn: async ({ points, category = "worldwide" }: { points: number; category?: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase.rpc("award_points", {
        p_user_id: user.id,
        p_points: points,
        p_category: category,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-ranking"] });
    },
  });

  // Check and award badge mutation
  const checkBadge = useMutation({
    mutationFn: async ({ badgeId, currentValue }: { badgeId: string; currentValue: number }) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.rpc("check_and_award_badge", {
        p_user_id: user.id,
        p_badge_id: badgeId,
        p_current_value: currentValue,
      });
      
      if (error) throw error;
      return data as boolean; // Returns true if badge was newly awarded
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
      queryClient.invalidateQueries({ queryKey: ["achievement-progress"] });
    },
  });

  // Initialize user on leaderboard
  const initializeLeaderboard = useMutation({
    mutationFn: async (category: string = "worldwide") => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("leaderboard_scores")
        .upsert({
          user_id: user.id,
          category,
          total_points: 0,
          weekly_points: 0,
          monthly_points: 0,
        }, {
          onConflict: "user_id,category",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  return {
    awardPoints,
    checkBadge,
    initializeLeaderboard,
  };
}

// Combined stats hook
export function useAchievementStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achievement-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Get total badges earned
      const { count: badgesEarned } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      // Get total badges available
      const { count: totalBadges } = await supabase
        .from("badges")
        .select("*", { count: "exact", head: true });
      
      // Get user streak
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      // Get user ranking
      const { data: rankingData } = await supabase
        .from("leaderboard_scores")
        .select("*")
        .eq("user_id", user.id)
        .eq("category", "worldwide")
        .single();
      
      return {
        badgesEarned: badgesEarned || 0,
        totalBadges: totalBadges || 0,
        currentStreak: streakData?.current_streak || 0,
        longestStreak: streakData?.longest_streak || 0,
        totalWorkouts: streakData?.total_workouts || 0,
        totalPoints: rankingData?.total_points || 0,
        rank: rankingData?.rank_position || null,
      };
    },
    enabled: !!user?.id,
  });
}
