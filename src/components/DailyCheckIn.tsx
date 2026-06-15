import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, Sparkles } from "lucide-react";

const moods = [
  { emoji: "😴", label: "Tired", value: "tired", color: "from-blue-400/20 to-blue-500/10", ring: "ring-blue-400/50" },
  { emoji: "😊", label: "Good", value: "good", color: "from-green-400/20 to-green-500/10", ring: "ring-green-400/50" },
  { emoji: "💪", label: "Strong", value: "strong", color: "from-amber-400/20 to-amber-500/10", ring: "ring-amber-400/50" },
  { emoji: "🔥", label: "Fired Up", value: "fired_up", color: "from-orange-400/20 to-red-500/10", ring: "ring-orange-400/50" },
  { emoji: "😤", label: "Stressed", value: "stressed", color: "from-purple-400/20 to-purple-500/10", ring: "ring-purple-400/50" },
];

const energyLevels = [
  { level: 1, label: "Drained", icon: "🪫" },
  { level: 2, label: "Low", icon: "😶" },
  { level: 3, label: "Okay", icon: "🙂" },
  { level: 4, label: "Good", icon: "⚡" },
  { level: 5, label: "Max", icon: "🔋" },
];

interface DailyCheckInProps {
  onComplete?: (mood: string, energy: number) => void;
}

export function DailyCheckIn({ onComplete }: DailyCheckInProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mood" | "energy" | "done">("mood");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!user) return;

    const skippedThisSession = sessionStorage.getItem("dailyCheckinSkipped") === "true";
    if (skippedThisSession) return;

    const checkTodaysCheckin = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();

      if (!data) {
        setTimeout(() => setOpen(true), 1500);
      }
    };

    checkTodaysCheckin();
  }, [user]);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setAnimating(true);
    setTimeout(() => {
      setStep("energy");
      setAnimating(false);
    }, 300);
  };

  const handleEnergySelect = async (energy: number) => {
    setSelectedEnergy(energy);

    if (!user || !selectedMood) return;

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("daily_checkins").upsert({
      user_id: user.id,
      mood: selectedMood,
      energy: energy,
      date: today,
    });

    setStep("done");
    onComplete?.(selectedMood, energy);

    // Auto-close after celebration
    setTimeout(() => {
      setOpen(false);
      // Reset for next time
      setTimeout(() => {
        setStep("mood");
        setSelectedMood(null);
        setSelectedEnergy(null);
      }, 300);
    }, 2000);
  };

  const handleSkip = () => {
    sessionStorage.setItem("dailyCheckinSkipped", "true");
    setOpen(false);
  };

  const handleClose = () => {
    sessionStorage.setItem("dailyCheckinSkipped", "true");
    setOpen(false);
  };

  const selectedMoodData = moods.find(m => m.value === selectedMood);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden border-border/50 gap-0 [&>button]:hidden">
        <DialogTitle className="sr-only">Daily Check-in</DialogTitle>
        <DialogDescription className="sr-only">Log your mood and energy for today</DialogDescription>
        {/* Header */}
        <div className="relative px-5 pt-5 pb-3">
          {step === "energy" && (
            <button
              onClick={() => setStep("mood")}
              className="absolute left-4 top-5 p-1 rounded-full hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="absolute right-4 top-5 p-1 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 mb-4">
            <div className={cn(
              "h-1 rounded-full transition-all duration-300",
              step === "mood" ? "w-8 bg-primary" : "w-8 bg-primary"
            )} />
            <div className={cn(
              "h-1 rounded-full transition-all duration-300",
              step === "energy" || step === "done" ? "w-8 bg-primary" : "w-8 bg-muted"
            )} />
          </div>

          <h2 className="text-center text-xl font-bold text-foreground">
            {step === "mood" && "How are you feeling?"}
            {step === "energy" && "Energy level today?"}
            {step === "done" && "You're all set! 🎉"}
          </h2>
          {step === "mood" && (
            <p className="text-center text-sm text-muted-foreground mt-1">
              Your coach adapts to how you feel
            </p>
          )}
          {step === "energy" && (
            <p className="text-center text-sm text-muted-foreground mt-1">
              This helps tailor your workout intensity
            </p>
          )}
        </div>

        {/* Content */}
        <div className={cn(
          "px-5 pb-5 transition-all duration-300",
          animating && "opacity-50 scale-95"
        )}>
          {step === "mood" && (
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-1.5">
                {moods.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => handleMoodSelect(mood.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl transition-all duration-200",
                      "hover:scale-105 active:scale-95",
                      "bg-gradient-to-b",
                      selectedMood === mood.value
                        ? `${mood.color} ring-2 ${mood.ring}`
                        : "from-transparent to-transparent hover:from-secondary/80 hover:to-secondary/40"
                    )}
                  >
                    <span className="text-4xl leading-none drop-shadow-sm">{mood.emoji}</span>
                    <span className="text-[11px] font-medium text-muted-foreground">{mood.label}</span>
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </div>
          )}

          {step === "energy" && (
            <div className="space-y-5">
              {/* Energy bar visualization */}
              <div className="flex justify-center gap-2 pt-2">
                {energyLevels.map((e) => {
                  const isSelected = selectedEnergy === e.level;
                  const fillWidth = (e.level / 5) * 100;

                  return (
                    <button
                      key={e.level}
                      onClick={() => handleEnergySelect(e.level)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-2.5 rounded-2xl transition-all duration-200 flex-1",
                        "hover:scale-105 active:scale-95",
                        isSelected
                          ? "bg-primary/10 ring-2 ring-primary/50"
                          : "hover:bg-secondary/80"
                      )}
                    >
                      <span className="text-2xl leading-none">{e.icon}</span>
                      {/* Mini energy bar */}
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-400 via-amber-400 to-green-400 transition-all"
                          style={{ width: `${fillWidth}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{e.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-6 space-y-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-in zoom-in duration-500">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-foreground">Check-in complete</p>
                <p className="text-sm text-muted-foreground">
                  Feeling {selectedMoodData?.label.toLowerCase()} with {selectedEnergy}/5 energy
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
