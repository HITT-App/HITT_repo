import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Bell, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSleep } from "@/hooks/useSleep";
import { format, addHours } from "date-fns";
import { cn } from "@/lib/utils";

const StartSleep = () => {
  const navigate = useNavigate();
  const { activeSchedule, preferences } = useSleep();
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate wake time based on target hours
  const targetHours = Number(preferences?.target_hours) || 8;
  const wakeTime = addHours(currentTime, targetHours);
  
  // Get alarm time from schedule or calculate
  const alarmTime = activeSchedule?.wake_time 
    ? activeSchedule.wake_time.slice(0, 5) 
    : format(wakeTime, "HH:mm");

  const handleStartSleep = () => {
    // Store sleep start time in localStorage for tracking
    localStorage.setItem("sleepStartTime", currentTime.toISOString());
    localStorage.setItem("alarmEnabled", String(alarmEnabled));
    localStorage.setItem("alarmTime", alarmTime);
    
    // Navigate to a sleeping screen or back to dashboard
    navigate("/sleeping");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Close Button */}
      <header className="shrink-0 bg-background p-4 flex justify-end">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <X className="w-5 h-5" />
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center overflow-y-auto">
        {/* Target Icon */}
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <Play className="w-8 h-8 text-primary ml-1" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-4">Start Sleeping</h1>

        {/* Alarm Toggle */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-muted-foreground">Set Alarm?</span>
          <Switch
            checked={alarmEnabled}
            onCheckedChange={setAlarmEnabled}
          />
        </div>

        {/* Alarm Info */}
        {alarmEnabled && (
          <div className="flex items-center gap-2 text-muted-foreground mb-8">
            <Bell className="w-4 h-4" />
            <span>Alarm on {alarmTime} AM</span>
          </div>
        )}
      </div>

      {/* Sleep Schedule Preview */}
      <div className="shrink-0 p-4 bg-card border-t border-border">
        <div className="flex items-center justify-around mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <Moon className="w-4 h-4" />
              <span>Bedtime</span>
            </div>
            <p className="text-lg font-semibold">{format(currentTime, "h:mm a")}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
              <Sun className="w-4 h-4" />
              <span>Wake Up</span>
            </div>
            <p className="text-lg font-semibold">{format(wakeTime, "h:mm a")}</p>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground">
            Target sleep: {targetHours}h {preferences?.target_minutes || 0}m
          </p>
        </div>

        {/* Start Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleStartSleep}
        >
          <Moon className="w-5 h-5 mr-2" />
          Start Sleeping
        </Button>
      </div>
    </div>
  );
};

export default StartSleep;
