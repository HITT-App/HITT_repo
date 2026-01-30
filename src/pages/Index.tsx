import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { FullNavMenu } from "@/components/FullNavMenu";
import { QuickStartFAB } from "@/components/QuickStartFAB";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { HomeHero } from "@/components/HomeHero";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserLevel, XP_REWARDS } from "@/hooks/useUserLevel";

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
  const [levelUpData, setLevelUpData] = useState<{
    isOpen: boolean;
    newLevel: number;
    newTitle: string;
    previousLevel: number;
  }>({ isOpen: false, newLevel: 1, newTitle: "Rookie", previousLevel: 1 });

  const { user } = useAuth();
  const { profile } = useProfile();
  const { addXP, previousLevel } = useUserLevel();
  
  const displayName = profile?.display_name || 
                      user?.user_metadata?.display_name || 
                      user?.email?.split("@")[0] || 
                      "Athlete";

  // Handler for daily check-in completion
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
      <div className="w-full max-w-md min-h-screen relative overflow-x-hidden pb-28">
        {/* Daily Check-in Modal */}
        <DailyCheckIn onComplete={handleCheckInComplete} />

        {/* Level Up Celebration Modal */}
        <LevelUpModal
          isOpen={levelUpData.isOpen}
          onClose={() => setLevelUpData(prev => ({ ...prev, isOpen: false }))}
          newLevel={levelUpData.newLevel}
          newTitle={levelUpData.newTitle}
          previousLevel={levelUpData.previousLevel}
        />

        {/* Video Hero Section */}
        <HomeHero userName={displayName} />

        {/* Header with HIIT Score + Search */}
        <HomeHeader userName={displayName} score={61} />

        {/* Fitness Metrics Card */}
        <FitnessMetricsCard hasData={true} />

        {/* Activity Section */}
        <ActivitySection />

        {/* Workouts Carousel */}
        <WorkoutsSection />

        {/* Coach Session */}
        <CoachSessionSection />

        {/* Nutrition */}
        <NutritionSection hasData={true} />

        {/* Sleep */}
        <SleepSection hasData={true} />

        {/* AI Coach */}
        <AICoachSection />

        {/* Resources */}
        <ResourcesSection />

        {/* Quick Start FAB */}
        <QuickStartFAB />
        
        {/* Bottom Navigation */}
        <BottomNav onCenterClick={() => setQuickActionsOpen(true)} />
        
        {/* Full Navigation Menu */}
        <FullNavMenu 
          open={quickActionsOpen} 
          onOpenChange={setQuickActionsOpen} 
        />
      </div>
    </div>
  );
};

export default Index;
