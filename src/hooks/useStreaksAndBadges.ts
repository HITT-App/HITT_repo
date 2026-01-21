import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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
  const recordWorkout = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Get or create streak record
      let currentStreak = streak;
      
      if (!currentStreak) {
        // Create new streak record
        const { data: newStreak, error: createError } = await supabase
          .from('user_streaks')
          .insert({ 
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_workout_date: today,
            total_workouts: 1
          })
          .select()
          .single();

        if (createError) throw createError;
        currentStreak = newStreak;
      } else {
        // Calculate new streak
        const lastDate = currentStreak.last_workout_date;
        let newCurrentStreak = currentStreak.current_streak;
        
        if (lastDate) {
          const lastWorkout = new Date(lastDate);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate.getTime() - lastWorkout.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            // Same day, don't update streak
          } else if (diffDays === 1) {
            // Consecutive day, increment streak
            newCurrentStreak += 1;
          } else {
            // Streak broken, reset to 1
            newCurrentStreak = 1;
          }
        } else {
          newCurrentStreak = 1;
        }

        const newLongestStreak = Math.max(currentStreak.longest_streak, newCurrentStreak);
        const newTotalWorkouts = currentStreak.total_workouts + 1;

        const { data: updatedStreak, error: updateError } = await supabase
          .from('user_streaks')
          .update({
            current_streak: newCurrentStreak,
            longest_streak: newLongestStreak,
            last_workout_date: today,
            total_workouts: newTotalWorkouts
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;
        currentStreak = updatedStreak;
      }

      setStreak(currentStreak);

      // Check for new badges
      await checkAndAwardBadges(currentStreak);
      
    } catch (error) {
      console.error('Error recording workout:', error);
    }
  }, [user, streak, allBadges, earnedBadges]);

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
