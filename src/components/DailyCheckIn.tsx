import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const moods = [
  { emoji: "😴", label: "Tired", value: "tired" },
  { emoji: "😊", label: "Good", value: "good" },
  { emoji: "💪", label: "Strong", value: "strong" },
  { emoji: "🔥", label: "Fired Up", value: "fired_up" },
  { emoji: "😤", label: "Stressed", value: "stressed" },
];

const energyLevels = [1, 2, 3, 4, 5];

interface DailyCheckInProps {
  onComplete?: (mood: string, energy: number) => void;
}

export function DailyCheckIn({ onComplete }: DailyCheckInProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mood" | "energy">("mood");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Check if user has checked in today
    const checkTodaysCheckin = async () => {
      const today = new Date().toISOString().split("T")[0];
      
      const { data } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      // Show check-in modal if not checked in today
      if (!data) {
        // Small delay to not interrupt initial load
        setTimeout(() => setOpen(true), 1500);
      }
    };

    checkTodaysCheckin();
  }, [user]);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setStep("energy");
  };

  const handleEnergySelect = async (energy: number) => {
    setSelectedEnergy(energy);

    if (!user || !selectedMood) return;

    // Save to database
    const today = new Date().toISOString().split("T")[0];
    
    await supabase.from("daily_checkins").upsert({
      user_id: user.id,
      mood: selectedMood,
      energy: energy,
      date: today,
    });

    onComplete?.(selectedMood, energy);
    setOpen(false);
  };

  const handleSkip = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[340px] p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {step === "mood" ? "How are you feeling?" : "Energy level today?"}
          </DialogTitle>
        </DialogHeader>

        {step === "mood" ? (
          <div className="py-4">
            <div className="grid grid-cols-5 gap-2">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => handleMoodSelect(mood.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
                    "hover:bg-secondary active:scale-95",
                    selectedMood === mood.value && "bg-primary/10 ring-2 ring-primary"
                  )}
                >
                  <span className="text-3xl">{mood.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{mood.label}</span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4 text-muted-foreground"
              onClick={handleSkip}
            >
              Skip for now
            </Button>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-center text-sm text-muted-foreground mb-4">
              1 = Low energy, 5 = Fully charged
            </p>
            <div className="flex justify-center gap-3">
              {energyLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => handleEnergySelect(level)}
                  className={cn(
                    "w-12 h-12 rounded-full text-lg font-semibold transition-all",
                    "border-2 border-border hover:border-primary",
                    "active:scale-95",
                    selectedEnergy === level && "bg-primary text-primary-foreground border-primary"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setStep("mood")}
            >
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
