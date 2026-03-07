import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { ChooseSportSheet } from "@/components/ChooseSportSheet";
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

// New home components
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
} from "@/components/home";

const Index = () => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
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
  
  const displayName = profile?.display_name || 
                      user?.user_metadata?.display_name || 
                      user?.email?.split("@")[0] || 
                      "Athlete";

  // Show welcome screen on first sign-in per session
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
    if (result?.leveledUp) {
      setLevelUpData({
        isOpen: true,
        newLevel: result.newLevel,
        newTitle: result.newTitle,
        previousLevel: previousLevel || 1,
      });
    }
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
        {/* Daily Check-in - only if gamification enabled */}
        {flags.gamification_enabled && (
          <DailyCheckIn onComplete={handleCheckInComplete} />
        )}

        {/* Level Up Celebration Modal */}
        {flags.gamification_enabled && (
          <LevelUpModal
            isOpen={levelUpData.isOpen}
            onClose={() => setLevelUpData(prev => ({ ...prev, isOpen: false }))}
            newLevel={levelUpData.newLevel}
            newTitle={levelUpData.newTitle}
            previousLevel={levelUpData.previousLevel}
          />
        )}

        {/* Video Hero Section */}
        <HomeHero userName={displayName} />

        {/* Header with HIIT Score + Search */}
        <HomeHeader userName={displayName} score={61} avatarUrl={profile?.avatar_url} />

        {/* Stats Grid */}
        <StatsGrid />

        {/* Fitness Metrics Card */}
        {flags.health_metrics_enabled && (
          <FitnessMetricsCard hasData={true} />
        )}

        {/* Activity Section */}
        {flags.activity_enabled && <ActivitySection />}

        {/* Workouts Carousel */}
        {flags.workouts_enabled && <WorkoutsSection />}

        {/* Coach Session */}
        {flags.coaching_enabled && <CoachSessionSection />}

        {/* Nutrition */}
        {flags.nutrition_enabled && <NutritionSection hasData={true} />}

        {/* Sleep */}
        {flags.sleep_enabled && <SleepSection hasData={true} />}

        {/* AI Coach */}
        {flags.ai_coach_enabled && <AICoachSection />}

        {/* Resources */}
        {flags.resources_enabled && <ResourcesSection />}

        {/* Quick Start FAB removed */}
        
        {/* Bottom Navigation */}
        <BottomNav onCenterClick={() => setQuickActionsOpen(true)} />
        
        {/* Choose a Sport Drawer */}
        <ChooseSportSheet 
          open={quickActionsOpen} 
          onOpenChange={setQuickActionsOpen} 
        />
      </div>
    </div>
  );
};

export default Index;
