import { useState, useEffect } from "react";
import { HomeHero } from "@/components/HomeHero";
import { StatsGrid } from "@/components/StatsGrid";
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
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useProfile } from "@/hooks/useProfile";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { ChevronRight, Dumbbell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const { profile } = useProfile();
  const { streak } = useStreaksAndBadges();
  const navigate = useNavigate();
  
  const displayName = profile?.display_name || 
                      user?.user_metadata?.display_name || 
                      user?.email?.split("@")[0] || 
                      "Athlete";

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen relative overflow-x-hidden pb-28">
        {/* Daily Check-in Modal */}
        <DailyCheckIn />

        {/* Hero Section */}
        <HomeHero userName={displayName} />

        {/* Streak Urgency Banner - Shows when streak is at risk */}
        <StreakUrgencyBanner />

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
        
        {/* Stats Grid */}
        <StatsGrid />

        {/* Daily Motivation Quote */}
        <DailyMotivationQuote streak={streak?.current_streak || 0} />
        
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
        <QuickStartFAB lastWorkoutType="HIIT Blast" />
        
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
