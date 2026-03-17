import { useState, useEffect, ReactNode } from "react";

import { QuickStartFAB } from "@/components/QuickStartFAB";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { StatsGrid } from "@/components/StatsGrid";
import { HomeHero } from "@/components/HomeHero";
import { PostLoginWelcome } from "@/components/PostLoginWelcome";
import { AppTutorial } from "@/components/AppTutorial";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserLevel, XP_REWARDS } from "@/hooks/useUserLevel";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useHomeLayout } from "@/hooks/useHomeLayout";

import {
  HomeHeader,
  FitnessMetricsCard,
  ActivitySection,
  WorkoutsSection,
  CoachSessionSection,
  NutritionSection,
  SleepSection,
  AICoachSection,
  ResourcesSection,
  SmartDailyBriefing,
} from "@/components/home";

const Index = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    isOpen: boolean;
    newLevel: number;
    newTitle: string;
    previousLevel: number;
  }>({ isOpen: false, newLevel: 1, newTitle: "Rookie", previousLevel: 1 });

  const { user } = useAuth();
  const { profile } = useProfile();
  const { addXP, previousLevel } = useUserLevel();
  const { flags } = useFeatureFlags();
  const { sections, loading: layoutLoading } = useHomeLayout();
  
  const displayName = profile?.display_name || 
                      user?.user_metadata?.display_name || 
                      user?.email?.split("@")[0] || 
                      "Athlete";

  useEffect(() => {
    if (user && !sessionStorage.getItem("hiit_welcomed")) {
      setShowWelcome(true);
    }
  }, [user]);

  const handleWelcomeDismiss = () => {
    setShowWelcome(false);
    sessionStorage.setItem("hiit_welcomed", "true");
    const tutorialSeen = localStorage.getItem("hiit_tutorial_complete");
    if (!tutorialSeen) {
      setShowTutorial(true);
    }
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem("hiit_tutorial_complete", "true");
  };

  const handleCheckInComplete = async (mood: string, energy: number) => {
    const result = await addXP(XP_REWARDS.DAILY_CHECKIN);
    // Award leaderboard points for daily check-in
    if (user?.id) {
      const { supabase } = await import("@/integrations/supabase/client");
      await supabase.rpc("award_points", {
        p_user_id: user.id,
        p_points: 5,
        p_category: "worldwide",
      });
    }
    if (result?.leveledUp) {
      setLevelUpData({
        isOpen: true,
        newLevel: result.newLevel,
        newTitle: result.newTitle,
        previousLevel: previousLevel || 1,
      });
    }
  };

  // Map section keys to feature flag keys (null = always show)
  const featureFlagMap: Record<string, string | null> = {
    hero: null,
    header: null,
    daily_briefing: null,
    stats_grid: null,
    fitness_metrics: "health_metrics_enabled",
    activity: "activity_enabled",
    workouts: "workouts_enabled",
    coaching: "coaching_enabled",
    nutrition: "nutrition_enabled",
    sleep: "sleep_enabled",
    ai_coach: "ai_coach_enabled",
    resources: "resources_enabled",
  };

  // Map section keys to components
  const sectionComponents: Record<string, ReactNode> = {
    hero: <HomeHero userName={displayName} />,
    header: <HomeHeader userName={displayName} score={61} avatarUrl={profile?.avatar_url} />,
    daily_briefing: <SmartDailyBriefing />,
    stats_grid: <StatsGrid />,
    fitness_metrics: <FitnessMetricsCard hasData={true} />,
    activity: <ActivitySection />,
    workouts: <WorkoutsSection />,
    coaching: <CoachSessionSection />,
    nutrition: <NutritionSection hasData={true} />,
    sleep: <SleepSection hasData={true} />,
    ai_coach: <AICoachSection />,
    resources: <ResourcesSection />,
  };

  const renderSections = () => {
    if (layoutLoading || sections.length === 0) {
      // Fallback to default order
      return (
        <>
          <HomeHero userName={displayName} />
          <HomeHeader userName={displayName} score={61} avatarUrl={profile?.avatar_url} />
          <StatsGrid />
          {flags.health_metrics_enabled && <FitnessMetricsCard hasData={true} />}
          {flags.activity_enabled && <ActivitySection />}
          {flags.workouts_enabled && <WorkoutsSection />}
          {flags.coaching_enabled && <CoachSessionSection />}
          {flags.nutrition_enabled && <NutritionSection hasData={true} />}
          {flags.sleep_enabled && <SleepSection hasData={true} />}
          {flags.ai_coach_enabled && <AICoachSection />}
          {flags.resources_enabled && <ResourcesSection />}
        </>
      );
    }

    return sections
      .filter((s) => {
        if (!s.enabled) return false;
        const flagKey = featureFlagMap[s.section_key];
        if (flagKey && !flags[flagKey]) return false;
        return true;
      })
      .map((s) => (
        <div key={s.section_key}>{sectionComponents[s.section_key]}</div>
      ));
  };

  return (
    <div className="min-h-screen bg-background flex justify-center">
      {showWelcome && (
        <PostLoginWelcome userName={displayName} onDismiss={handleWelcomeDismiss} />
      )}

      {showTutorial && (
        <AppTutorial onComplete={handleTutorialComplete} />
      )}

      <div className="w-full max-w-md min-h-screen relative overflow-x-hidden pb-28">
        {flags.gamification_enabled && (
          <DailyCheckIn onComplete={handleCheckInComplete} />
        )}

        {flags.gamification_enabled && (
          <LevelUpModal
            isOpen={levelUpData.isOpen}
            onClose={() => setLevelUpData(prev => ({ ...prev, isOpen: false }))}
            newLevel={levelUpData.newLevel}
            newTitle={levelUpData.newTitle}
            previousLevel={levelUpData.previousLevel}
          />
        )}

        {renderSections()}
      </div>
    </div>
  );
};

export default Index;
