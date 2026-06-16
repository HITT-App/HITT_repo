import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useSleep } from "@/hooks/useSleep";
import { toast } from "sonner";
import { format, subDays } from "date-fns";

const LogSleep = () => {
  const navigate = useNavigate();
  const { logSleep } = useSleep();
  const [isLoading, setIsLoading] = useState(false);
  
  // Default to last night
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  const [sleepDate, setSleepDate] = useState(yesterday.toISOString().split("T")[0]);
  const [bedtimeHour, setBedtimeHour] = useState(22);
  const [bedtimeMinute, setBedtimeMinute] = useState(30);
  const [wakeHour, setWakeHour] = useState(6);
  const [wakeMinute, setWakeMinute] = useState(30);
  const [sleepQuality, setSleepQuality] = useState(70);
  const [notes, setNotes] = useState("");

  // Calculate duration
  const calculateDuration = () => {
    let bedMins = bedtimeHour * 60 + bedtimeMinute;
    let wakeMins = wakeHour * 60 + wakeMinute;
    
    // If wake time is before bed time, assume next day
    if (wakeMins < bedMins) {
      wakeMins += 24 * 60;
    }
    
    const durationMins = wakeMins - bedMins;
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    
    return { hours, mins, total: durationMins };
  };

  const duration = calculateDuration();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Construct timestamps
      const bedtime = new Date(sleepDate);
      bedtime.setHours(bedtimeHour, bedtimeMinute, 0, 0);
      
      const wakeTime = new Date(sleepDate);
      if (wakeHour < bedtimeHour) {
        wakeTime.setDate(wakeTime.getDate() + 1);
      }
      wakeTime.setHours(wakeHour, wakeMinute, 0, 0);

      // Estimate sleep phases based on total duration
      const totalMins = duration.total;
      const deepSleep = Math.round(totalMins * 0.2); // ~20% deep sleep
      const remSleep = Math.round(totalMins * 0.25); // ~25% REM
      const lightSleep = Math.round(totalMins * 0.5); // ~50% light sleep
      const awake = Math.round(totalMins * 0.05); // ~5% awake

      await logSleep.mutateAsync({
        sleep_date: sleepDate,
        bedtime: bedtime.toISOString(),
        wake_time: wakeTime.toISOString(),
        sleep_quality: sleepQuality,
        deep_sleep_minutes: deepSleep,
        rem_sleep_minutes: remSleep,
        light_sleep_minutes: lightSleep,
        awake_minutes: awake,
        notes: notes || undefined,
      });

      toast.success("Sleep logged successfully!");
      navigate("/sleep");
    } catch (error) {
      console.error("Error logging sleep:", error);
      toast.error("Failed to log sleep");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-base font-semibold">Log Sleep</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6 pb-28">
        {/* Date Selection */}
        <Card className="p-4">
          <label className="text-sm text-muted-foreground mb-2 block">Sleep Date</label>
          <input
            type="date"
            value={sleepDate}
            onChange={(e) => setSleepDate(e.target.value)}
            className="w-full p-3 rounded-xl border border-border bg-background"
            max={today.toISOString().split("T")[0]}
          />
        </Card>

        {/* Bedtime */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-primary" />
            <span className="font-medium">Bedtime</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <select
                value={bedtimeHour}
                onChange={(e) => setBedtimeHour(Number(e.target.value))}
                className="text-3xl font-bold bg-muted rounded-xl p-3 text-center appearance-none cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground mt-1">hour</span>
            </div>
            <span className="text-3xl font-bold">:</span>
            <div className="flex flex-col items-center">
              <select
                value={bedtimeMinute}
                onChange={(e) => setBedtimeMinute(Number(e.target.value))}
                className="text-3xl font-bold bg-muted rounded-xl p-3 text-center appearance-none cursor-pointer"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground mt-1">minute</span>
            </div>
          </div>
        </Card>

        {/* Wake Time */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Sun className="w-5 h-5 text-primary" />
            <span className="font-medium">Wake Time</span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <select
                value={wakeHour}
                onChange={(e) => setWakeHour(Number(e.target.value))}
                className="text-3xl font-bold bg-muted rounded-xl p-3 text-center appearance-none cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground mt-1">hour</span>
            </div>
            <span className="text-3xl font-bold">:</span>
            <div className="flex flex-col items-center">
              <select
                value={wakeMinute}
                onChange={(e) => setWakeMinute(Number(e.target.value))}
                className="text-3xl font-bold bg-muted rounded-xl p-3 text-center appearance-none cursor-pointer"
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground mt-1">minute</span>
            </div>
          </div>
        </Card>

        {/* Duration Display */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-primary" />
            <span className="font-medium">Total Sleep Duration</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            {duration.hours}h {duration.mins}m
          </p>
        </Card>

        {/* Sleep Quality */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Sleep Quality</span>
            <span className="text-lg font-bold text-primary">{sleepQuality}%</span>
          </div>
          <Slider
            value={[sleepQuality]}
            onValueChange={(v) => setSleepQuality(v[0])}
            min={0}
            max={100}
            step={5}
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-4">
          <label className="font-medium mb-2 block">Notes (optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How did you sleep? Any dreams or disturbances?"
            className="min-h-[100px]"
          />
        </Card>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Log Sleep"}
        </Button>
      </div>
      </div>
    </div>
  );
};

export default LogSleep;
