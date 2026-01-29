import { useState } from "react";
import { HomeHero } from "@/components/HomeHero";
import { TodayFocusCard } from "@/components/dashboard/TodayFocusCard";
import { BottomNav } from "@/components/BottomNav";
import { FullNavMenu } from "@/components/FullNavMenu";
import { RecommendationsSection } from "@/components/dashboard/RecommendationsSection";
import { WorkoutPlanCard } from "@/components/dashboard/WorkoutPlanCard";
import { MealPlanCard } from "@/components/dashboard/MealPlanCard";
import { CoachingCard } from "@/components/dashboard/CoachingCard";
import { WorkoutRecommendations } from "@/components/workout/WorkoutRecommendations";
import { StreakUrgencyBanner } from "@/components/gamification/StreakUrgencyBanner";
import { QuickStartFAB } from "@/components/QuickStartFAB";
import { DailyMotivationQuote } from "@/components/DailyMotivationQuote";
import { DailyCheckIn } from "@/components/DailyCheckIn";
import { LevelUpModal } from "@/components/gamification/LevelUpModal";
import { FriendActivityFeed } from "@/components/community/FriendActivityFeed";
import { WeeklyChallengeCard } from "@/components/challenges/WeeklyChallengeCard";
import { WeeklySummaryCard } from "@/components/dashboard/WeeklySummaryCard";
import { ResumeWorkoutBanner } from "@/components/workout/ResumeWorkoutBanner";
import { AccountabilityPartnerCard } from "@/components/gamification/AccountabilityPartnerCard";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useProfile } from "@/hooks/useProfile";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useUserLevel, XP_REWARDS } from "@/hooks/useUserLevel";
import { ChevronRight, Dumbbell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{
    isOpen: boolean;
    newLevel: number;
    newTitle: string;
    previousLevel: number;
  }>({ isOpen: false, newLevel: 1, newTitle: "Rookie", previousLevel: 1 });

  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { profile } = useProfile();
  const { streak } = useStreaksAndBadges();
  const { userLevel, addXP, previousLevel } = useUserLevel();
  const navigate = useNavigate();
  
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

        {/* Hero Section */}
        <HomeHero userName={displayName} />

        {/* Streak Urgency Banner - Shows when streak is at risk */}
        <StreakUrgencyBanner />

        {/* Resume Workout Banner - Shows interrupted workouts */}
        <ResumeWorkoutBanner />

        {isAdmin && (
          <div className="px-4 -mt-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between min-h-[44px] touch-manipulation"
              onClick={() => navigate("/admin")}
            >
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Panel
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {/* Today Focus Card with Activity Rings */}
        <TodayFocusCard userName={displayName} />

        {/* Weekly Summary - Shows on Mondays */}
        <WeeklySummaryCard />

        {/* Daily Motivation Quote */}
        <DailyMotivationQuote streak={streak?.current_streak || 0} />

        {/* Weekly Challenge Widget */}
        <WeeklyChallengeCard />

        {/* Friend Activity Feed */}
        <FriendActivityFeed />

        {/* Accountability Partner Card */}
        <AccountabilityPartnerCard />
        
        {/* Workout Plan */}
        <WorkoutPlanCard />
        
        {/* AI Workout Recommendations */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-muted-foreground" />
              Recommended For You
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary p-0 h-auto touch-manipulation text-sm"
              onClick={() => navigate('/workout-library')}
            >
              See all <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <WorkoutRecommendations limit={3} showMessage={true} />
        </div>
        
        {/* Personal Coaching */}
        <CoachingCard />
        
        {/* Recommendations */}
        <RecommendationsSection />
        
        {/* Meal Plan */}
        <MealPlanCard />

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
