import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface ActivityTypeStepProps {
  value: string[];
  onChange: (value: string[]) => void;
  onContinue: () => void;
}

const activities = [
  { id: "jogging", label: "Jogging", icon: "🏃" },
  { id: "swimming", label: "Swimming", icon: "🏊" },
  { id: "skating", label: "Skating", icon: "⛸️" },
  { id: "walking", label: "Walking", icon: "🚶" },
  { id: "cycling", label: "Cycling", icon: "🚴" },
  { id: "other", label: "Other", icon: "⚡" },
];

export const ActivityTypeStep = ({
  value,
  onChange,
  onContinue,
}: ActivityTypeStepProps) => {
  const toggleActivity = (activityId: string) => {
    if (value.includes(activityId)) {
      onChange(value.filter((id) => id !== activityId));
    } else {
      onChange([...value, activityId]);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 pb-10">
      {/* Content */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          What type of activity/exercise do you prefer?
        </h1>

        <div className="space-y-3">
          {activities.map((activity) => {
            const isSelected = value.includes(activity.id);
            return (
              <button
                key={activity.id}
                onClick={() => toggleActivity(activity.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-primary/50"
                }`}
              >
                <span className="text-2xl">{activity.icon}</span>
                <span className={`font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                  {activity.label}
                </span>
                <div
                  className={`ml-auto w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={onContinue}
        disabled={value.length === 0}
        className="w-full btn-primary"
      >
        Continue
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
