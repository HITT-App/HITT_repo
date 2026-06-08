import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { notifyUser } from '@/lib/notify';
import { recordActiveDay } from '@/lib/activeDay';

// Leaderboard point values for actions
const POINTS = {
  WORKOUT_COMPLETE: 50,
  STREAK_DAY_BONUS: 10,
  BADGE_EARNED: 25,
  DAILY_CHECKIN: 5,
  MEAL_LOGGED: 5,
} as const;

interface UserStreak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  total_workouts: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement_type: string;
  requirement_value: number;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

export function useStreaksAndBadges() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user streak
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (streakData) {
        setStreak(streakData);
      }

      // Fetch all badges
      const { data: badgesData } = await supabase
        .from('badges')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (badgesData) {
        setAllBadges(badgesData);
      }

      // Fetch earned badges
      const { data: earnedData } = await supabase
        .from('user_badges')
        .select('*, badge:badges(*)')
        .eq('user_id', user.id);

      if (earnedData) {
        setEarnedBadges(earnedData as UserBadge[]);
      }
    } catch (error) {
      console.error('Error fetching streaks and badges:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Update streak after workout completion
  const recordWorkout = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      await recordActiveDay(supabase, user.id);

      const { data: current } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!current) return 0;

      const updatedStreak: UserStreak = { ...current, total_workouts: current.total_workouts + 1 };

      await supabase
        .from('user_streaks')
        .update({ total_workouts: updatedStreak.total_workouts })
        .eq('user_id', user.id);

      setStreak(updatedStreak);

      let pointsToAward = POINTS.WORKOUT_COMPLETE;
      if (updatedStreak.current_streak > 1) {
        pointsToAward += POINTS.STREAK_DAY_BONUS * Math.min(updatedStreak.current_streak, 10);
      }
      await supabase.rpc("award_points", {
        p_user_id: user.id,
        p_points: pointsToAward,
        p_category: "worldwide",
      });

      await checkAndAwardBadges(updatedStreak);

      return pointsToAward;
    } catch (error) {
      console.error('Error recording workout:', error);
      return 0;
    }
  }, [user, allBadges, earnedBadges]);

  const checkAndAwardBadges = async (currentStreak: UserStreak) => {
    if (!user || !allBadges.length) return;

    const earnedBadgeIds = earnedBadges.map(eb => eb.badge_id);
    const newlyEarned: Badge[] = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.includes(badge.id)) continue;

      let earned = false;
      
      if (badge.requirement_type === 'total_workouts') {
        earned = currentStreak.total_workouts >= badge.requirement_value;
      } else if (badge.requirement_type === 'current_streak') {
        earned = currentStreak.current_streak >= badge.requirement_value;
      }

      if (earned) {
        const { error } = await supabase
          .from('user_badges')
          .insert({ user_id: user.id, badge_id: badge.id });

        if (!error) {
          newlyEarned.push(badge);
        }
      }
    }

    if (newlyEarned.length > 0) {
      setNewBadges(newlyEarned);

      // Push notifications for each badge
      for (const badge of newlyEarned) {
        notifyUser(user.id, "workout", `🏆 Badge unlocked: ${badge.name}`, badge.description || "Keep it up!", "/achievements");
      }

      // Award leaderboard points for each badge
      if (user) {
        await supabase.rpc("award_points", {
          p_user_id: user.id,
          p_points: POINTS.BADGE_EARNED * newlyEarned.length,
          p_category: "worldwide",
        });
      }

      // Show toast for each new badge
      newlyEarned.forEach(badge => {
        toast({
          title: "🏆 Badge Earned!",
          description: `You earned "${badge.name}" - ${badge.description}`,
        });
      });

      // Refresh earned badges
      fetchData();
    }
  };

  const clearNewBadges = () => {
    setNewBadges([]);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    streak,
    allBadges,
    earnedBadges,
    loading,
    newBadges,
    recordWorkout,
    clearNewBadges,
    refetch: fetchData
  };
}
