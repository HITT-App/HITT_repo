import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Play, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useActivity } from "@/hooks/useActivity";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { toast } from "sonner";

const activityTypes = [
  { id: "walking", label: "Walking", icon: "🚶" },
  { id: "jogging", label: "Jogging", icon: "🏃" },
  { id: "swimming", label: "Swimming", icon: "🏊" },
  { id: "cycling", label: "Cycling", icon: "🚴" },
  { id: "yoga", label: "Yoga", icon: "🧘" },
  { id: "breathing", label: "Breathing", icon: "🌬️" },
  { id: "other", label: "Other", icon: "⚡" },
];

const LogActivity = () => {
  const navigate = useNavigate();
  const { logActivity } = useActivity();
  const { recordWorkout } = useStreaksAndBadges();
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState("");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState(3);
  const [calories, setCalories] = useState(200);

  const handleLog = async () => {
    try {
      await logActivity.mutateAsync({
        activity_type: selectedType,
        duration_seconds: duration * 60,
        calories_burned: calories,
        intensity_level: intensity,
        distance_km: selectedType === "walking" || selectedType === "jogging" || selectedType === "cycling" 
          ? Number((duration * 0.15).toFixed(1)) 
          : undefined,
      });
      await recordWorkout();
      toast.success("Activity logged successfully!");
      navigate("/activity");
    } catch (error) {
      toast.error("Failed to log activity");
    }
  };

  const startLiveTracking = () => {
    navigate(`/activity-live?type=${selectedType}`);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => step > 0 ? setStep(0) : navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold">Add New Activity</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 pb-28">
        {/* Step 0: Select Activity Type */}
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-center mb-6">
              What would you like to do?
            </h2>
            <div className="space-y-3">
              {activityTypes.map((type) => (
                <Card
                  key={type.id}
                  className={cn(
                    "p-4 cursor-pointer transition-all flex items-center gap-4",
                    selectedType === type.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => {
                    setSelectedType(type.id);
                    setStep(1);
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl">{type.icon}</span>
                  </div>
                  <span className="font-medium flex-1">{type.label}</span>
                  <span className="text-muted-foreground">→</span>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Configure Activity */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">
                  {activityTypes.find((t) => t.id === selectedType)?.icon}
                </span>
              </div>
              <h2 className="text-xl font-semibold capitalize">
                {selectedType.replace("-", " ")}
              </h2>
            </div>

            {/* Duration */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Duration</span>
                <span className="text-primary font-semibold">{duration} min</span>
              </div>
              <Slider
                value={[duration]}
                onValueChange={([val]) => {
                  setDuration(val);
                  setCalories(Math.round(val * 7 * (intensity / 3)));
                }}
                min={5}
                max={120}
                step={5}
              />
            </Card>

            {/* Intensity */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Intensity</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setIntensity(level);
                        setCalories(Math.round(duration * 7 * (level / 3)));
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full text-lg transition-all",
                        level <= intensity ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}
                    >
                      🔥
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {intensity <= 2 ? "Low" : intensity <= 3 ? "Moderate" : "High"} intensity
              </p>
            </Card>

            {/* Estimated Calories */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium">Calorie Burn (Est.)</span>
                <span className="text-primary font-semibold">{calories} kcal</span>
              </div>
              <Slider
                value={[calories]}
                onValueChange={([val]) => setCalories(val)}
                min={50}
                max={1000}
                step={10}
              />
            </Card>

            {/* Privacy Notice */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>✓</span>
              <span>Your activity data will not be tracked by us – it's completely yours.</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {step === 1 && (
        <div className="p-6 pt-0 space-y-3">
          <Button 
            className="w-full" 
            onClick={startLiveTracking}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Live Tracking
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleLog}
            disabled={logActivity.isPending}
          >
            <Timer className="w-4 h-4 mr-2" />
            {logActivity.isPending ? "Saving..." : "Log Manually"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LogActivity;
