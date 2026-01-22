import { useState } from "react";
import { HomeHero } from "@/components/HomeHero";
import { StatsGrid } from "@/components/StatsGrid";
import { BottomNav } from "@/components/BottomNav";
import { QuickActionsSheet } from "@/components/QuickActionsSheet";
import { RecommendationsSection } from "@/components/dashboard/RecommendationsSection";
import { WorkoutPlanCard } from "@/components/dashboard/WorkoutPlanCard";
import { MealPlanCard } from "@/components/dashboard/MealPlanCard";
import { CoachingCard } from "@/components/dashboard/CoachingCard";
import { WorkoutRecommendations } from "@/components/workout/WorkoutRecommendations";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { ChevronRight, Dumbbell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  
  const displayName = user?.user_metadata?.display_name || 
                      user?.email?.split("@")[0] || 
                      "Athlete";

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen relative overflow-hidden pb-24">
        {/* Hero Section */}
        <HomeHero userName={displayName} />

        {isAdmin && (
          <div className="px-4 -mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
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
        
        {/* Workout Plan */}
        <WorkoutPlanCard />
        
        {/* AI Workout Recommendations */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              Recommended For You
            </h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary p-0"
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
        
        {/* Bottom Navigation */}
        <BottomNav onCenterClick={() => setQuickActionsOpen(true)} />
        
        {/* Quick Actions Sheet */}
        <QuickActionsSheet 
          open={quickActionsOpen} 
          onOpenChange={setQuickActionsOpen} 
        />
      </div>
    </div>
  );
};

export default Index;
