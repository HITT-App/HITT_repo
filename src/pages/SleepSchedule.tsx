import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Check, Volume2, Bell, Vibrate, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSleep } from "@/hooks/useSleep";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const daysOfWeek = [
  { id: "Monday", short: "M" },
  { id: "Tuesday", short: "T" },
  { id: "Wednesday", short: "W" },
  { id: "Thursday", short: "T" },
  { id: "Friday", short: "F" },
  { id: "Saturday", short: "S" },
  { id: "Sunday", short: "S" },
];

const alarmSounds = [
  { id: "rooster", label: "Rooster Basic", icon: "🐓" },
  { id: "bell", label: "Bell Chime", icon: "🔔" },
  { id: "ocean", label: "Ocean Waves", icon: "🌊" },
  { id: "breeze", label: "Calm Breeze", icon: "🍃" },
  { id: "deluxe", label: "Rooster Deluxe", icon: "🎵" },
];

const SleepSchedule = () => {
  const navigate = useNavigate();
  const { activeSchedule, saveSchedule } = useSleep();
  const [isLoading, setIsLoading] = useState(false);
  
  const [activeDays, setActiveDays] = useState<string[]>(
    activeSchedule?.active_days || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  );
  const [bedtimeHour, setBedtimeHour] = useState(
    activeSchedule?.bedtime ? parseInt(activeSchedule.bedtime.split(":")[0]) : 22
  );
  const [bedtimeMinute, setBedtimeMinute] = useState(
    activeSchedule?.bedtime ? parseInt(activeSchedule.bedtime.split(":")[1]) : 30
  );
  const [wakeHour, setWakeHour] = useState(
    activeSchedule?.wake_time ? parseInt(activeSchedule.wake_time.split(":")[0]) : 6
  );
  const [wakeMinute, setWakeMinute] = useState(
    activeSchedule?.wake_time ? parseInt(activeSchedule.wake_time.split(":")[1]) : 0
  );
  const [alarmSound, setAlarmSound] = useState(activeSchedule?.alarm_sound || "rooster");
  const [repeatAlarm, setRepeatAlarm] = useState(activeSchedule?.repeat_alarm || "one-time");
  const [vibrationEnabled, setVibrationEnabled] = useState(activeSchedule?.vibration_enabled ?? true);

  const toggleDay = (day: string) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (activeDays.length === 0) {
      toast.error("Please select at least one day");
      return;
    }

    setIsLoading(true);
    try {
      await saveSchedule.mutateAsync({
        active_days: activeDays,
        bedtime: `${bedtimeHour.toString().padStart(2, "0")}:${bedtimeMinute.toString().padStart(2, "0")}:00`,
        wake_time: `${wakeHour.toString().padStart(2, "0")}:${wakeMinute.toString().padStart(2, "0")}:00`,
        alarm_sound: alarmSound,
        repeat_alarm: repeatAlarm,
        vibration_enabled: vibrationEnabled,
        is_active: true,
      });

      toast.success("Sleep schedule saved!");
      navigate("/sleep");
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-base font-semibold">New Sleep Schedule</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 pb-8 space-y-6">
        {/* Active Days */}
        <div>
          <h3 className="font-medium mb-3">Active Days</h3>
          <div className="flex gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  activeDays.includes(day.id)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {day.short}
              </button>
            ))}
          </div>
        </div>

        {/* Bedtime & Wakeup */}
        <div>
          <h3 className="font-medium mb-3">Bedtime & Wakeup</h3>
          <Card className="p-4">
            {/* Visual Clock */}
            <div className="flex justify-center mb-6">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  {/* Clock face */}
                  <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" className="text-muted" strokeWidth="2" />
                  
                  {/* Hour markers */}
                  {[0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
                    const angle = ((hour / 24) * 360 - 90) * (Math.PI / 180);
                    const x = 100 + 80 * Math.cos(angle);
                    const y = 100 + 80 * Math.sin(angle);
                    const label = hour === 0 ? "12AM" : hour === 6 ? "6AM" : hour === 12 ? "12PM" : hour === 18 ? "6PM" : "";
                    return (
                      <text
                        key={hour}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs fill-muted-foreground"
                      >
                        {label}
                      </text>
                    );
                  })}
                  
                  {/* Sleep arc */}
                  {(() => {
                    const bedAngle = ((bedtimeHour + bedtimeMinute / 60) / 24) * 360 - 90;
                    const wakeAngle = ((wakeHour + wakeMinute / 60) / 24) * 360 - 90;
                    
                    return (
                      <circle
                        cx="100"
                        cy="100"
                        r="60"
                        fill="none"
                        stroke="currentColor"
                        className="text-primary"
                        strokeWidth="20"
                        strokeDasharray={`${((wakeAngle - bedAngle + 360) % 360 / 360) * 377} 377`}
                        strokeDashoffset={-bedAngle * (377 / 360)}
                        strokeLinecap="round"
                      />
                    );
                  })()}
                </svg>
                
                {/* Center icons */}
                <div className="absolute inset-0 flex items-center justify-center gap-4">
                  <Moon className="w-6 h-6 text-primary" />
                  <Sun className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>

            {/* Time Display */}
            <div className="flex justify-around">
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <Moon className="w-4 h-4" />
                  Bedtime
                </div>
                <p className="font-semibold">
                  {bedtimeHour.toString().padStart(2, "0")}:{bedtimeMinute.toString().padStart(2, "0")} 
                  {bedtimeHour >= 12 ? " PM" : " AM"}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <Sun className="w-4 h-4" />
                  Wake Up Time
                </div>
                <p className="font-semibold">
                  {wakeHour.toString().padStart(2, "0")}:{wakeMinute.toString().padStart(2, "0")} 
                  {wakeHour >= 12 ? " PM" : " AM"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Time Pickers */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Bedtime</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={bedtimeHour}
                onChange={(e) => setBedtimeHour(Number(e.target.value))}
                className="flex-1 p-2 rounded-lg border bg-background text-center"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                ))}
              </select>
              <span>:</span>
              <select
                value={bedtimeMinute}
                onChange={(e) => setBedtimeMinute(Number(e.target.value))}
                className="flex-1 p-2 rounded-lg border bg-background text-center"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                ))}
              </select>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Wake Up</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={wakeHour}
                onChange={(e) => setWakeHour(Number(e.target.value))}
                className="flex-1 p-2 rounded-lg border bg-background text-center"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                ))}
              </select>
              <span>:</span>
              <select
                value={wakeMinute}
                onChange={(e) => setWakeMinute(Number(e.target.value))}
                className="flex-1 p-2 rounded-lg border bg-background text-center"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                ))}
              </select>
            </div>
          </Card>
        </div>

        {/* Alarm & Voice */}
        <div>
          <h3 className="font-medium mb-3">Alarm & Voice</h3>
          <Card className="p-4 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Alarm Sound
              </label>
              <Select value={alarmSound} onValueChange={setAlarmSound}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {alarmSounds.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>
                      <span className="flex items-center gap-2">
                        <span>{sound.icon}</span>
                        <span>{sound.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Repeat Alarm
              </label>
              <Select value={repeatAlarm} onValueChange={setRepeatAlarm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">One-Time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekdays">Weekdays</SelectItem>
                  <SelectItem value="weekends">Weekends</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vibrate className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Vibration</p>
                  <p className="text-xs text-muted-foreground">Vibrate when the alarm is active</p>
                </div>
              </div>
              <Switch
                checked={vibrationEnabled}
                onCheckedChange={setVibrationEnabled}
              />
            </div>
          </Card>
        </div>
      </div>
      </div>

      {/* Save Button */}
      <div className="shrink-0 p-4 border-t border-border/60 bg-background">
        <Button
          className="w-full"
          size="lg"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Set Sleep Schedule ✓"}
        </Button>
      </div>
    </div>
  );
};

export default SleepSchedule;
