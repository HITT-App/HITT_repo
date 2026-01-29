import { Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSmartDefaults } from "@/hooks/useSmartDefaults";

export function QuickStartFAB() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: smartDefaults } = useSmartDefaults();

  const lastWorkoutType = smartDefaults?.lastWorkoutType;
  const lastWorkoutId = smartDefaults?.lastWorkoutId;

  const handleQuickStart = () => {
    if (lastWorkoutId) {
      navigate(`/workout/${lastWorkoutId}`);
    } else {
      navigate("/workouts");
    }
  };

  const handleSmartStart = () => {
    navigate("/workouts?smart=true");
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
      {/* Expanded options */}
      <div
        className={cn(
          "flex flex-col gap-2 transition-all duration-200",
          isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full shadow-lg px-4 gap-2"
          onClick={handleSmartStart}
        >
          <Zap className="w-4 h-4 text-primary" />
          Smart Start
        </Button>
        {lastWorkoutType && (
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full shadow-lg px-4 gap-2"
            onClick={handleQuickStart}
          >
            <Play className="w-4 h-4" />
            {lastWorkoutType}
          </Button>
        )}
      </div>

      {/* Main FAB */}
      <Button
        size="lg"
        className={cn(
          "w-14 h-14 rounded-full shadow-elevated p-0 transition-all duration-200",
          "bg-primary hover:bg-primary/90",
          isExpanded && "rotate-45"
        )}
        onClick={() => {
          if (isExpanded) {
            setIsExpanded(false);
          } else if (lastWorkoutType) {
            setIsExpanded(true);
          } else {
            handleQuickStart();
          }
        }}
      >
        <Play className="w-6 h-6 text-primary-foreground" />
      </Button>
    </div>
  );
}
