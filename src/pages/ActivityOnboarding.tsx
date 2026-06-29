import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useActivity } from "@/hooks/useActivity";
import { HIITLogo } from "@/components/HIITLogo";
import { toast } from "sonner";

const activityTypes = [
  { id: "jogging", label: "Jogging", icon: "🏃" },
  { id: "swimming", label: "Swimming", icon: "🏊" },
  { id: "yoga", label: "Yoga", icon: "🧘" },
  { id: "martial-arts", label: "Martial Arts", icon: "🥋" },
  { id: "aerobics", label: "Aerobics", icon: "💪" },
  { id: "cycling", label: "Cycling", icon: "🚴" },
  { id: "walking", label: "Walking", icon: "🚶" },
  { id: "other", label: "Other", icon: "⚡" },
];

const timePreferences = [
  { id: "morning", label: "Morning (6 - 10 AM)", description: "I usually exercise in the morning" },
  { id: "afternoon", label: "Afternoon (11 - 3PM)", description: "I do activity in the afternoon" },
  { id: "evening", label: "Evening (4 - 10PM)", description: "I do activities in the evening" },
];

const intensityLabels = ["Very Light", "Light", "Moderate", "High", "Very High"];

const ActivityOnboarding = () => {
  const navigate = useNavigate();
  const { savePreferences, saveGoals } = useActivity();
  const [step, setStep] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleNext = async () => {
    if (step === 3) {
      setIsProcessing(true);
      // Simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsProcessing(false);
      setStep(4);
    } else if (step === 4) {
      // Save preferences and goals
      try {
        await savePreferences.mutateAsync({
          activity_types: selectedTypes,
          preferred_time: preferredTime,
          typical_duration_minutes: duration,
          intensity_level: intensity,
          onboarding_completed: true,
        });

        await saveGoals.mutateAsync({
          weekly_activities: 5,
          weekly_distance_km: 10,
          weekly_calories: 1500,
          weekly_duration_minutes: duration * 5,
        });

        toast.success("Activity preferences saved!");
        navigate("/activity");
      } catch (error) {
        toast.error("Failed to save preferences");
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  const canContinue = () => {
    if (step === 0) return selectedTypes.length > 0;
    if (step === 1) return !!preferredTime;
    return true;
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <Progress value={progress} className="h-1" />
        </div>
        <span className="text-sm text-muted-foreground">{step + 1}/{totalSteps}</span>
      </header>

      <div className="flex-1 overflow-y-auto flex flex-col p-6">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <HIITLogo size="md" />
        </div>

        {/* Step 0: Activity Type */}
        {step === 0 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-xl font-semibold text-center mb-2">
              What type of activity do you usually enjoy?
            </h1>
            <div className="flex-1 mt-6 space-y-3">
              {activityTypes.map((type) => (
                <Card
                  key={type.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all flex items-center gap-4",
                    selectedTypes.includes(type.id) && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleTypeToggle(type.id)}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium flex-1">{type.label}</span>
                  {selectedTypes.includes(type.id) && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Time Preference */}
        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-xl font-semibold text-center mb-2">
              At what time do you usually do your activity?
            </h1>
            <div className="flex-1 mt-6 space-y-3">
              {timePreferences.map((time) => (
                <Card
                  key={time.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all",
                    preferredTime === time.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => setPreferredTime(time.id)}
                >
                  <h3 className="font-medium">{time.label}</h3>
                  <p className="text-sm text-muted-foreground">{time.description}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Duration */}
        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-xl font-semibold text-center mb-2">
              How much time do you usually spend on your activity?
            </h1>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 rounded-full border-4 border-primary flex items-center justify-center mb-8">
                <span className="text-5xl font-bold text-primary">{duration}</span>
              </div>
              <p className="text-muted-foreground mb-4">
                I usually do activity for {duration} minutes
              </p>
              <div className="w-full max-w-xs">
                <Slider
                  value={[duration]}
                  onValueChange={([val]) => setDuration(val)}
                  min={10}
                  max={120}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>10 min</span>
                  <span>120 min</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Intensity */}
        {step === 3 && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-xl font-semibold text-center mb-2">
              What's your preferred intensity level?
            </h1>
            <p className="text-center text-muted-foreground mb-8">Drag to adjust</p>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 mb-8">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/20"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={`${(intensity / 5) * 283} 283`}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-bold text-primary">{intensity}</span>
                </div>
              </div>
              <p className="text-lg font-medium mb-4">{intensityLabels[intensity - 1]}</p>
              <div className="w-full max-w-xs">
                <Slider
                  value={[intensity]}
                  onValueChange={([val]) => setIntensity(val)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Processing */}
        {step === 4 && isProcessing && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h1 className="text-xl font-semibold text-center mb-2">
              Please wait while we recommend you the most optimal activity for you...
            </h1>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && !isProcessing && (
          <div className="flex-1 flex flex-col">
            <h1 className="text-xl font-semibold text-center mb-2">
              OK, here are several activity suggestions based on your preference.
            </h1>
            <div className="flex-1 mt-6 space-y-3">
              {selectedTypes.slice(0, 3).map((type, i) => {
                const activity = activityTypes.find((a) => a.id === type);
                return (
                  <Card key={type} className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{activity?.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-medium capitalize">{type.replace("-", " ")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {preferredTime === "morning" ? "6:30" : preferredTime === "afternoon" ? "12:00" : "6:00"} AM - {duration} min
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>🔥 {120 + i * 30} kcal</span>
                        <span className="text-primary">+{3 + i} score</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer — pad for the home-indicator safe area so the CTA never sits
          behind the swipe bar on notched iPhones. */}
      <div
        className="px-6 pt-0"
        style={{ paddingBottom: "calc(var(--safe-area-inset-bottom, 0px) + 24px)" }}
      >
        <Button
          className="w-full"
          onClick={handleNext}
          disabled={!canContinue() || isProcessing || savePreferences.isPending}
        >
          {step === 4 ? (
            savePreferences.isPending ? "Saving..." : "See Dashboard"
          ) : (
            <>
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ActivityOnboarding;
