import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Bell, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSleep } from "@/hooks/useSleep";
import { format, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";

const Sleeping = () => {
  const navigate = useNavigate();
  const { logSleep, preferences } = useSleep();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sleepStartTime, setSleepStartTime] = useState<Date | null>(null);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);

  // Get stored sleep start time
  useEffect(() => {
    const stored = localStorage.getItem("sleepStartTime");
    if (stored) {
      setSleepStartTime(new Date(stored));
    } else {
      // If no stored time, use current time
      const now = new Date();
      localStorage.setItem("sleepStartTime", now.toISOString());
      setSleepStartTime(now);
    }
  }, []);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate sleep duration
  const getSleepDuration = () => {
    if (!sleepStartTime) return { hours: 0, minutes: 0 };
    const mins = differenceInMinutes(currentTime, sleepStartTime);
    return {
      hours: Math.floor(mins / 60),
      minutes: mins % 60,
    };
  };

  const duration = getSleepDuration();

  // Handle hold to wake up
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isHolding) {
      interval = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            handleWakeUp();
            return 100;
          }
          return prev + 5;
        });
      }, 50);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding]);

  const handleWakeUp = async () => {
    if (!sleepStartTime) return;

    const wakeTime = new Date();
    const durationMins = differenceInMinutes(wakeTime, sleepStartTime);

    // Log the sleep
    try {
      await logSleep.mutateAsync({
        sleep_date: format(sleepStartTime, "yyyy-MM-dd"),
        bedtime: sleepStartTime.toISOString(),
        wake_time: wakeTime.toISOString(),
        sleep_quality: 70, // Default quality
        deep_sleep_minutes: Math.round(durationMins * 0.2),
        rem_sleep_minutes: Math.round(durationMins * 0.25),
        light_sleep_minutes: Math.round(durationMins * 0.5),
        awake_minutes: Math.round(durationMins * 0.05),
      });
    } catch (error) {
      console.error("Error logging sleep:", error);
    }

    // Clear stored data
    localStorage.removeItem("sleepStartTime");
    localStorage.removeItem("alarmEnabled");
    localStorage.removeItem("alarmTime");

    // Navigate to summary
    navigate("/sleep");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/20 to-background flex flex-col">
      {/* Header */}
      <div className="p-4 text-center">
        <p className="text-sm text-primary font-medium">
          ALARM AT {localStorage.getItem("alarmTime") || "07:00"} AM
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        {/* Greeting */}
        <h2 className="text-xl text-muted-foreground mb-2">Good Night!</h2>
        
        {/* Current Time */}
        <h1 className="text-6xl font-bold mb-4">
          {format(currentTime, "h:mm")} <span className="text-2xl">{format(currentTime, "a")}</span>
        </h1>

        {/* Duration */}
        <div className="flex items-center gap-2 text-muted-foreground mb-8">
          <Clock className="w-4 h-4" />
          <span>Duration: {duration.hours}h {duration.minutes}m</span>
        </div>

        {/* Moon Animation */}
        <div className="relative w-32 h-32 mb-12">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary/30" />
          <div className="absolute inset-8 rounded-full bg-primary/40 flex items-center justify-center">
            <Moon className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Wake Up Button */}
      <div className="p-8">
        <div className="relative">
          {/* Progress Circle */}
          <svg className="w-full h-20 absolute inset-0" viewBox="0 0 100 20">
            <rect
              x="0"
              y="8"
              width="100"
              height="4"
              rx="2"
              fill="currentColor"
              className="text-muted"
            />
            <rect
              x="0"
              y="8"
              width={holdProgress}
              height="4"
              rx="2"
              fill="currentColor"
              className="text-primary transition-all"
            />
          </svg>

          <Button
            className={cn(
              "w-full h-16 text-lg transition-all",
              isHolding && "scale-95"
            )}
            size="lg"
            variant="outline"
            onMouseDown={() => setIsHolding(true)}
            onMouseUp={() => setIsHolding(false)}
            onMouseLeave={() => setIsHolding(false)}
            onTouchStart={() => setIsHolding(true)}
            onTouchEnd={() => setIsHolding(false)}
          >
            <Sun className="w-5 h-5 mr-2" />
            {holdProgress > 0 ? `Waking up... ${holdProgress}%` : "Swipe to wake up!"}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {holdProgress === 0 
            ? "Hold the button to wake up" 
            : "Congratulations for waking up in time! 🎉"}
        </p>
      </div>
    </div>
  );
};

export default Sleeping;
