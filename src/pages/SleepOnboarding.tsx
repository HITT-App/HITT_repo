import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Moon, Sun, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { HIITLogo } from "@/components/HIITLogo";
import { useSleep } from "@/hooks/useSleep";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const wakeTimeOptions = [
  { id: "5-6", label: "5 - 6 AM", description: "I'm a very early bird", icon: Sun },
  { id: "6-8", label: "6 - 8 AM", description: "I'm a normal person", icon: Sun },
  { id: "8-10", label: "8 - 10 AM", description: "I wake up quite late", icon: Sun },
  { id: "10-11", label: "10 - 11 AM", description: "I wake up very late", icon: Moon },
];

const SleepOnboarding = () => {
  const navigate = useNavigate();
  const { savePreferences } = useSleep();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [targetHours, setTargetHours] = useState(8);
  const [wakeTimeRange, setWakeTimeRange] = useState("6-8");
  const [bedtimeHour, setBedtimeHour] = useState(22);
  const [bedtimeMinute, setBedtimeMinute] = useState(30);
  const [sleepIssues, setSleepIssues] = useState("");

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigate("/");
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Calculate wake time based on selection
      const wakeTimeMap: Record<string, string> = {
        "5-6": "05:30:00",
        "6-8": "07:00:00",
        "8-10": "09:00:00",
        "10-11": "10:30:00",
      };

      await savePreferences.mutateAsync({
        target_hours: targetHours,
        target_minutes: 0,
        preferred_wake_time: wakeTimeMap[wakeTimeRange],
        preferred_bedtime: `${bedtimeHour.toString().padStart(2, "0")}:${bedtimeMinute.toString().padStart(2, "0")}:00`,
        sleep_issues: sleepIssues || null,
        onboarding_completed: true,
      });

      toast.success("Sleep preferences saved!");
      navigate("/sleep");
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col items-center text-center">
            <div className="w-full h-48 bg-gradient-to-b from-primary/20 to-background rounded-2xl mb-6 flex items-center justify-center">
              <Moon className="w-20 h-20 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Track Your Sleep,<br />Improve Health.</h1>
            <p className="text-muted-foreground mb-6">
              Track your sleep patterns and optimize your rest with this app.
            </p>
            <div className="space-y-2 text-left w-full">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span>Improve your daily sleep</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span>Get actionable AI insight daily</span>
              </div>
            </div>
          </div>
        );
      
      case 1:
        return (
          <div className="flex flex-col items-center text-center">
            <HIITLogo className="w-16 h-16 mb-6" />
            <p className="text-muted-foreground mb-8">
              Hey! I'm HIIT, your AI coach, and today I'll help you setup your sleep. Are you ready? 😊
            </p>
          </div>
        );

      case 2:
        return (
          <div className="flex flex-col items-center text-center">
            <HIITLogo className="w-12 h-12 mb-4" />
            <p className="text-muted-foreground mb-8">
              How many hours of sleep do you usually aim for each night?
            </p>
            <div className="text-6xl font-bold mb-8">{targetHours}</div>
            <Slider
              value={[targetHours]}
              onValueChange={(v) => setTargetHours(v[0])}
              min={4}
              max={12}
              step={1}
              className="w-full max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-4">
              I usually sleep up to {targetHours} hours daily
            </p>
          </div>
        );

      case 3:
        return (
          <div className="flex flex-col items-center">
            <HIITLogo className="w-12 h-12 mb-4" />
            <p className="text-muted-foreground mb-6 text-center">
              What's your ideal wake-up time for most days?
            </p>
            <div className="space-y-3 w-full">
              {wakeTimeOptions.map((option) => (
                <Card
                  key={option.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    wakeTimeRange === option.id 
                      ? "border-primary bg-primary/5" 
                      : "hover:border-primary/50"
                  )}
                  onClick={() => setWakeTimeRange(option.id)}
                >
                  <div className="flex items-center gap-3">
                    <option.icon className="w-5 h-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      wakeTimeRange === option.id 
                        ? "border-primary bg-primary" 
                        : "border-muted-foreground"
                    )}>
                      {wakeTimeRange === option.id && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="flex flex-col items-center">
            <HIITLogo className="w-12 h-12 mb-4" />
            <p className="text-muted-foreground mb-6 text-center">
              When do you usually go to bed?
            </p>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex flex-col items-center">
                <div className="bg-muted rounded-xl p-4">
                  <select
                    value={bedtimeHour}
                    onChange={(e) => setBedtimeHour(Number(e.target.value))}
                    className="text-4xl font-bold bg-transparent text-center appearance-none cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <span className="text-4xl font-bold">:</span>
              <div className="flex flex-col items-center">
                <div className="bg-primary/10 border-2 border-primary rounded-xl p-4">
                  <select
                    value={bedtimeMinute}
                    onChange={(e) => setBedtimeMinute(Number(e.target.value))}
                    className="text-4xl font-bold bg-transparent text-center appearance-none cursor-pointer text-primary"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              I go to bed at {bedtimeHour}:{bedtimeMinute.toString().padStart(2, "0")} {bedtimeHour >= 12 ? "PM" : "AM"}
            </p>
          </div>
        );

      case 5:
        return (
          <div className="flex flex-col items-center">
            <HIITLogo className="w-12 h-12 mb-4" />
            <p className="text-muted-foreground mb-6 text-center">
              Do you experience any sleep issues? If so, please describe it below.
            </p>
            <Textarea
              value={sleepIssues}
              onChange={(e) => setSleepIssues(e.target.value)}
              placeholder="Sometimes I always wake up at 3AM in the morning for no reason and I don't know why."
              className="min-h-[120px] mb-4"
            />
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>This helps our AI provide personalized recommendations</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background p-4 flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </header>

      {/* Progress */}
      {step > 0 && (
        <div className="px-4 mb-6">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {renderStep()}
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 space-y-3">
        {step === 0 ? (
          <>
            <Button className="w-full" onClick={handleNext}>
              Yes, start →
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/sleep")}>
              No, I'll set up manually ✏️
            </Button>
          </>
        ) : step === 5 ? (
          <Button 
            className="w-full" 
            onClick={handleComplete}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Continue →"}
          </Button>
        ) : (
          <Button className="w-full" onClick={handleNext}>
            Continue →
          </Button>
        )}
      </div>
    </div>
  );
};

export default SleepOnboarding;
