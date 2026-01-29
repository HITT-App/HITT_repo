import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserLevel {
  id: string;
  user_id: string;
  xp: number;
  level: number;
  title: string;
  updated_at: string;
}

// XP rewards for different actions
export const XP_REWARDS = {
  WORKOUT_COMPLETE: 50,
  STREAK_DAY: 10,
  MEAL_LOGGED: 5,
  DAILY_CHECKIN: 5,
  CHALLENGE_COMPLETE: 100,
  BADGE_EARNED: 25,
} as const;

export function useUserLevel() {
  const { user } = useAuth();
  const [userLevel, setUserLevel] = useState<UserLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);

  const fetchUserLevel = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_levels")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // No record exists, create one
        const { data: newLevel, error: insertError } = await supabase
          .from("user_levels")
          .insert({ user_id: user.id, xp: 0, level: 1, title: "Rookie" })
          .select()
          .single();

        if (!insertError && newLevel) {
          setUserLevel(newLevel);
        }
      } else if (data) {
        setUserLevel(data);
      }
    } catch (error) {
      console.error("Error fetching user level:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addXP = useCallback(
    async (amount: number) => {
      if (!user || !userLevel) return null;

      const newXP = userLevel.xp + amount;
      setPreviousLevel(userLevel.level);

      const { data, error } = await supabase
        .from("user_levels")
        .update({ xp: newXP })
        .eq("user_id", user.id)
        .select()
        .single();

      if (!error && data) {
        setUserLevel(data);
        // Check if level increased
        if (data.level > userLevel.level) {
          return { leveledUp: true, newLevel: data.level, newTitle: data.title };
        }
      }

      return null;
    },
    [user, userLevel]
  );

  useEffect(() => {
    fetchUserLevel();
  }, [fetchUserLevel]);

  return {
    userLevel,
    loading,
    addXP,
    previousLevel,
    refetch: fetchUserLevel,
  };
}
