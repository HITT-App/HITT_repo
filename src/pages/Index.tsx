import { useState } from "react";
import { HomeHero } from "@/components/HomeHero";
import { StatsGrid } from "@/components/StatsGrid";
import { TodaysWorkouts } from "@/components/TodaysWorkouts";
import { BottomNav } from "@/components/BottomNav";
import { QuickActionsSheet } from "@/components/QuickActionsSheet";

const Index = () => {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex justify-center">
      {/* Mobile Container - Simulates phone viewport */}
      <div className="w-full max-w-md min-h-screen relative overflow-hidden">
        {/* Hero Section */}
        <HomeHero userName="Makise" />
        
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
