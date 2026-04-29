import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureFlags {
  workouts_enabled: boolean;
  nutrition_enabled: boolean;
  food_scanner_enabled: boolean;
  community_enabled: boolean;
  leaderboard_enabled: boolean;
  ai_coach_enabled: boolean;
  activity_enabled: boolean;
  sleep_enabled: boolean;
  health_metrics_enabled: boolean;
  coaching_enabled: boolean;
  resources_enabled: boolean;
  challenges_enabled: boolean;
  achievements_enabled: boolean;
  gamification_enabled: boolean;
  [key: string]: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  workouts_enabled: true,
  nutrition_enabled: true,
  food_scanner_enabled: true,
  community_enabled: true,
  leaderboard_enabled: true,
  ai_coach_enabled: true,
  activity_enabled: true,
  sleep_enabled: true,
  health_metrics_enabled: true,
  coaching_enabled: false,
  resources_enabled: false,
  challenges_enabled: false,
  achievements_enabled: true,
  gamification_enabled: false,
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("name, enabled");

      if (!error && data) {
        const flagMap = { ...DEFAULT_FLAGS };
        data.forEach((flag) => {
          if (flag.name in flagMap) {
            flagMap[flag.name] = flag.enabled ?? false;
          }
        });
        setFlags(flagMap);
      }
      setLoading(false);
    };

    fetchFlags();
  }, []);

  return { flags, loading };
}
