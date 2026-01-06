import { useState } from "react";
import { HomeHero } from "@/components/HomeHero";
import { StatsGrid } from "@/components/StatsGrid";
import { TodaysWorkouts } from "@/components/TodaysWorkouts";
import { BottomNav } from "@/components/BottomNav";
import { QuickActionsSheet } from "@/components/QuickActionsSheet";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const { user } = useAuth();
  
  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.display_name || 
                      user?.email?.split("@")[0] || 
                      "Athlete";

  return (
    <div className="min-h-screen bg-background flex justify-center">
      {/* Mobile Container - Simulates phone viewport */}
      <div className="w-full max-w-md min-h-screen relative overflow-hidden">
        {/* Hero Section */}
        <HomeHero userName={displayName} />
        
        {/* Stats Grid - Overlapping hero */}
        <StatsGrid />
        
        {/* Today's Workouts */}
        <TodaysWorkouts />
        
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
