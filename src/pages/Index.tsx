import { useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import { OnboardingFlow } from "@/components/coach/OnboardingFlow";
import { useHealthProfile } from "@/hooks/useHealthProfile";
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
import { useHiitScore } from "@/hooks/useHiitScore";

import {
  HomeHeader,
  BodyScanCard,
  FitnessMetricsCard,
  ActivitySection,
  WorkoutsSection,
  NutritionSection,
  SleepSection,
  AICoachSection,
  ResourcesSection,
  SmartDailyBriefing,
  HealthSyncPrompt,
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

  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { user } = useAuth();
  const { profile } = useProfile();
  const { addXP, previousLevel } = useUserLevel();
  const { flags } = useFeatureFlags();
  const { sections, loading: layoutLoading } = useHomeLayout();
  const { score: hiitScore, components: hiitComponents } = useHiitScore();
  const { activityLevel } = useHealthProfile();
  
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
    nutrition: "nutrition_enabled",
    sleep: "sleep_enabled",
    ai_coach: "ai_coach_enabled",
    resources: "resources_enabled",
  };

  // Map section keys to components
  const sectionComponents: Record<string, ReactNode> = {
    hero: <HomeHero userName={displayName} />,
    header: <HomeHeader userName={displayName} score={hiitScore ?? undefined} scoreComponents={hiitComponents} avatarUrl={profile?.avatar_url} />,
    daily_briefing: <SmartDailyBriefing />,
    stats_grid: <StatsGrid />,
    fitness_metrics: <FitnessMetricsCard hasData={true} />,
    activity: <ActivitySection />,
    workouts: <WorkoutsSection />,
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
          <HomeHeader userName={displayName} score={hiitScore ?? undefined} scoreComponents={hiitComponents} avatarUrl={profile?.avatar_url} />
          <HealthSyncPrompt />
          <SmartDailyBriefing />
          <StatsGrid />
          <BodyScanCard />
          {flags.nutrition_enabled && <NutritionSection hasData={true} />}
          {flags.health_metrics_enabled && <FitnessMetricsCard hasData={true} />}
          {flags.activity_enabled && <ActivitySection />}
          {flags.workouts_enabled && <WorkoutsSection />}
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
      .flatMap((s) => {
        const el = <div key={s.section_key}>{sectionComponents[s.section_key]}</div>
        return s.section_key === 'stats_grid'
          ? [el, <BodyScanCard key="body-scan-card" />]
          : [el]
      });
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

        {/* Body scan CTA — shown to active/very_active users who haven't scanned recently */}
        {(activityLevel === 'active' || activityLevel === 'very_active') &&
          (() => {
            const scanAt = localStorage.getItem('hiit-body-scan-at');
            const stale = !scanAt || Date.now() - parseInt(scanAt) > 30 * 86_400_000;
            return stale;
          })() && (
          <div className="px-4 pb-2">
            <button
              onClick={() => navigate('/body-scan')}
              className="w-full rounded-2xl bg-secondary/60 border border-border/40 p-4 text-left flex items-center gap-4 active:bg-secondary transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 text-xl">🔍</div>
              <div className="flex-1">
                <p className="font-semibold text-sm">AI Body Scan</p>
                <p className="text-xs text-muted-foreground mt-0.5">Personalise your plan with a body composition analysis</p>
              </div>
              <span className="text-primary text-lg">→</span>
            </button>
          </div>
        )}

        {/* Build my plan CTA — shown to users with no/low activity or no existing plan */}
        {!localStorage.getItem('hiit-plan-onboarding-done') && (
          <div className="px-4 pb-6">
            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full rounded-2xl bg-primary/10 border border-primary/30 p-4 text-left flex items-center gap-4 active:bg-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 text-xl">
                {activityLevel === 'none' || activityLevel === 'light' ? '🤖' : '💪'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {activityLevel === 'none' || activityLevel === 'light'
                    ? "Let me build you a routine"
                    : "Build a personalised training plan"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Answer 5 quick questions → AI creates your schedule</p>
              </div>
              <span className="text-primary text-lg">→</span>
            </button>
          </div>
        )}
      </div>

      {showOnboarding && (
        <OnboardingFlow
          onClose={() => setShowOnboarding(false)}
          activityLevel={activityLevel}
        />
      )}
    </div>
  );
};

export default Index;
