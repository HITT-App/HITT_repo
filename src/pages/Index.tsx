import { useState } from "react";
import { HomeHero } from "@/components/HomeHero";
import { StatsGrid } from "@/components/StatsGrid";
import { BottomNav } from "@/components/BottomNav";
import { QuickActionsSheet } from "@/components/QuickActionsSheet";
import { RecommendationsSection } from "@/components/dashboard/RecommendationsSection";
import { WorkoutPlanCard } from "@/components/dashboard/WorkoutPlanCard";
import { MealPlanCard } from "@/components/dashboard/MealPlanCard";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const { user } = useAuth();
  
  const displayName = user?.user_metadata?.display_name || 
                      user?.email?.split("@")[0] || 
                      "Athlete";

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md min-h-screen relative overflow-hidden pb-24">
        {/* Hero Section */}
        <HomeHero userName={displayName} />
        
        {/* Stats Grid */}
        <StatsGrid />
        
        {/* Workout Plan */}
        <WorkoutPlanCard />
        
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
