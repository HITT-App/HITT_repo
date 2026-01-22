import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

// Import notification background images
import stepsImage from "@/assets/notification-steps.jpg";
import hydrationImage from "@/assets/notification-hydration.jpg";
import caloriesImage from "@/assets/notification-calories.jpg";
import workoutImage from "@/assets/notification-workout.jpg";
import coachingImage from "@/assets/notification-coaching.jpg";

export type NotificationType = 
  | "steps" 
  | "hydration" 
  | "calories-intake" 
  | "calories-burned" 
  | "coaching";

interface NotificationData {
  type: NotificationType;
  value: string;
  title: string;
  description: string;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  progress?: {
    current: number;
    max: number;
  };
  coachName?: string;
}

interface FitnessNotificationModalProps {
  data: NotificationData;
  onDismiss: () => void;
}

const backgroundImages: Record<NotificationType, string> = {
  steps: stepsImage,
  hydration: hydrationImage,
  "calories-intake": caloriesImage,
  "calories-burned": workoutImage,
  coaching: coachingImage,
};

export function FitnessNotificationModal({ data, onDismiss }: FitnessNotificationModalProps) {
  const bgImage = backgroundImages[data.type];
  
  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col justify-end p-6 pb-8 text-white">
        {/* Main Value */}
        <h1 className="text-5xl font-bold mb-2 animate-fade-up">
          {data.value}
        </h1>
        
        {/* Title */}
        <h2 className="text-xl font-semibold mb-2 animate-fade-up stagger-1">
          {data.title}
        </h2>
        
        {/* Description */}
        <p className="text-white/80 text-sm mb-4 animate-fade-up stagger-2">
          {data.description}
        </p>

        {/* Hydration Progress Bar */}
        {data.type === "hydration" && data.progress && (
          <div className="mb-6 animate-fade-up stagger-3">
            <Progress 
              value={(data.progress.current / data.progress.max) * 100} 
              className="h-2 bg-white/20"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>{data.progress.current}</span>
              <span>{data.progress.max}</span>
            </div>
          </div>
        )}

        {/* Macros Display for Calories Intake */}
        {data.type === "calories-intake" && data.macros && (
          <div className="flex gap-8 mb-6 animate-fade-up stagger-3">
            <div className="text-center">
              <p className="text-2xl font-bold">{data.macros.protein}</p>
              <p className="text-xs text-white/60">protein</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{data.macros.carbs}</p>
              <p className="text-xs text-white/60">carb</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{data.macros.fat}</p>
              <p className="text-xs text-white/60">fat</p>
            </div>
          </div>
        )}

        {/* Dismiss Button */}
        <Button 
          onClick={onDismiss}
          className="w-full h-14 rounded-xl bg-primary text-primary-foreground gap-2 text-base font-semibold animate-fade-up stagger-4"
        >
          Great, thanks!
          <Check className="w-5 h-5" />
        </Button>

        {/* Home Indicator */}
        <div className="flex justify-center mt-4">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default FitnessNotificationModal;
