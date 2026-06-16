import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft, Pause, Play, Plus, Minus, Settings, ChevronDown, ChevronUp, Flame } from "lucide-react";

const RC = { bg: '#0a0a0a', card: '#141414', line: '#262626', fg: '#fafafa', dim: '#9a9a9a', primary: '#f97316' };
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useActivity } from "@/hooks/useActivity";
import { useStreaksAndBadges } from "@/hooks/useStreaksAndBadges";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { CompletionSummary } from "@/components/workout/CompletionSummary";
import { getSportConfig } from "@/lib/sports";
import type { ExerciseSnapshot } from "@/hooks/useAI.types";

const DEFAULT_WEIGHT_KG = 70;

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ─── AI workout state passed via location.state.aiWorkout ─────────────────────
type AIWorkoutPayload = {
  title: string;
  description?: string;
  exercises_snapshot: ExerciseSnapshot[];
  estimated_duration_minutes: number;
  estimated_calories: number;
};

// ─── Scheduled workout row shape (after 5E migration) ────────────────────────
type ScheduledWorkoutRow = {
  id: string;
  workout_source: string;
  workout_title: string | null;
  workout_description: string | null;
  exercises_snapshot: ExerciseSnapshot[] | null;
  estimated_duration_minutes: number | null;
  estimated_calories: number | null;
};

const GymTimer = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { user } = useAuth();

  // ─── Mode detection ──────────────────────────────────────────────────────
  const scheduledId = searchParams.get("scheduled_id");
  const adhocWorkout = (location.state as { aiWorkout?: AIWorkoutPayload } | null)?.aiWorkout;
  const isAIMode = !!(scheduledId || adhocWorkout);

  // Mode C: existing freeform sport (unchanged)
  const activityType = searchParams.get("sport") || "Workout";
  const sport = getSportConfig(activityType);

  const { logActivity } = useActivity();
  const { recordWorkout } = useStreaksAndBadges();

  // ─── Scheduled row (Mode A only) ─────────────────────────────────────────
  const [scheduledRow, setScheduledRow] = useState<ScheduledWorkoutRow | null>(null);
  const [showExercises, setShowExercises] = useState(false);

  // ─── Timer state ─────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [counter, setCounter] = useState(0);
  const [settings, setSettings] = useState({ autoVibrate: true, showCalories: true });
  const [pointsEarned, setPointsEarned] = useState(0);

  const [ready, setReady] = useState(false);

  const startTimeRef = useRef(Date.now());
  const pausedAtRef = useRef(0);
  const holdTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Resolved AI workout content (from either Mode A scheduled row or Mode B adhoc)
  const aiContent: AIWorkoutPayload | null = scheduledRow
    ? {
        title: scheduledRow.workout_title ?? "Workout",
        description: scheduledRow.workout_description ?? undefined,
        exercises_snapshot: scheduledRow.exercises_snapshot ?? [],
        estimated_duration_minutes: scheduledRow.estimated_duration_minutes ?? 30,
        estimated_calories: scheduledRow.estimated_calories ?? 0,
      }
    : adhocWorkout ?? null;

  const calories = isAIMode
    ? Math.round(((aiContent?.estimated_calories ?? 200) / ((aiContent?.estimated_duration_minutes ?? 30) * 60)) * elapsed)
    : Math.round((sport.met * DEFAULT_WEIGHT_KG * elapsed) / 3600);

  const IconComp = sport.icon;
  const counterLabel = sport.counterLabel;

  // ─── Load scheduled row (Mode A) ─────────────────────────────────────────
  useEffect(() => {
    if (!scheduledId) return;
    supabase
      .from("scheduled_workouts")
      .select("id, workout_source, workout_title, workout_description, exercises_snapshot, estimated_duration_minutes, estimated_calories")
      .eq("id", scheduledId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { toast.error("Couldn't load workout"); return; }
        setScheduledRow(data as ScheduledWorkoutRow);
      });
  }, [scheduledId]);

  // Timer
  useEffect(() => {
    if (!ready || showCompleted) return;
    const id = setInterval(() => {
      if (!isPaused) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) - pausedAtRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [ready, isPaused, showCompleted]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      startTimeRef.current += Date.now() - (startTimeRef.current + (pausedAtRef.current + elapsed) * 1000);
    }
    setIsPaused((p) => {
      if (!p) pausedAtRef.current += 0;
      return !p;
    });
    if (settings.autoVibrate) navigator.vibrate?.(50);
  }, [isPaused, elapsed, settings.autoVibrate]);

  const finishActivity = useCallback(async () => {
    setShowCompleted(true);
    if (settings.autoVibrate) navigator.vibrate?.([100, 50, 100, 50, 200]);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });

    try {
      if (isAIMode && aiContent && user) {
        // ─── Mode A or B: write workout_progress ───────────────────────────
        await supabase.from("workout_progress").insert({
          user_id: user.id,
          workout_id: null,
          workout_source: "ai_generated",
          workout_title: aiContent.title,
          workout_description: aiContent.description ?? null,
          exercises_snapshot: aiContent.exercises_snapshot,
          estimated_duration_minutes: aiContent.estimated_duration_minutes,
          estimated_calories: aiContent.estimated_calories,
          duration_seconds: elapsed,
          calories_burned: calories,
        });

        // ─── Mode A only: mark scheduled row complete ──────────────────────
        if (scheduledId) {
          await supabase
            .from("scheduled_workouts")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              duration_minutes: Math.round(elapsed / 60),
              calories_burned: calories,
            })
            .eq("id", scheduledId);
        }
      } else {
        // ─── Mode C: existing activity_logs path (unchanged) ──────────────
        await logActivity.mutateAsync({
          activity_type: activityType,
          duration_seconds: elapsed,
          calories_burned: calories,
          notes: counter > 0 ? `${counter} ${counterLabel.toLowerCase()} completed` : undefined,
        });
      }

      const pts = await recordWorkout();
      setPointsEarned(pts);
    } catch {
      toast.error("Failed to save activity");
    }
  }, [isAIMode, aiContent, user, elapsed, calories, scheduledId, activityType, counter, counterLabel, logActivity, settings.autoVibrate, recordWorkout]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hold to finish
  const handleHoldStart = useCallback(() => {
    setIsHolding(true);
    setHoldProgress(0);
    let progress = 0;
    holdTimerRef.current = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdTimerRef.current!);
        finishActivity();
      }
    }, 30);
  }, [finishActivity]);

  const handleHoldEnd = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
  }, []);

  // Heart rate zone visual (decorative)
  const hrZone = elapsed < 300 ? "Warm Up" : elapsed < 1200 ? "Fat Burn" : elapsed < 2400 ? "Cardio" : "Peak";
  const hrColor = elapsed < 300 ? "text-blue-400" : elapsed < 1200 ? "text-green-400" : elapsed < 2400 ? "text-orange-400" : "text-red-400";

  const displayTitle = isAIMode ? (aiContent?.title ?? "Workout") : activityType;
  const SportIconComp = sport?.icon;

  if (!ready) {
    return (
      <div style={{ height: '100dvh', background: RC.bg, display: 'flex', flexDirection: 'column', color: RC.fg, paddingTop: 'calc(var(--safe-area-inset-top, 44px) + 8px)' }}>
        <div style={{ padding: '0 16px 12px' }}>
          <button onClick={() => navigate(-1)} style={{ width: 38, height: 38, borderRadius: 99, border: `1px solid ${RC.line}`, background: RC.card, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent' }}>
            <ArrowLeft size={18} color={RC.fg} strokeWidth={2.2} />
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '0 32px' }}>
          <div style={{ width: 96, height: 96, borderRadius: 28, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {SportIconComp ? <SportIconComp size={44} color={RC.primary} strokeWidth={1.8} /> : <Flame size={44} color={RC.primary} strokeWidth={1.8} />}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: RC.fg, letterSpacing: -0.5, margin: 0 }}>{displayTitle}</h1>
            {isAIMode && aiContent?.estimated_duration_minutes && (
              <p style={{ fontSize: 13, color: RC.dim, marginTop: 8 }}>~{aiContent.estimated_duration_minutes} min · {aiContent.estimated_calories} kcal</p>
            )}
          </div>
        </div>
        <div style={{ padding: '0 16px 32px' }}>
          <button
            onClick={() => { startTimeRef.current = Date.now(); setReady(true); }}
            style={{ width: '100%', height: 60, borderRadius: 18, background: RC.primary, border: 'none', color: '#0a0a0a', fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(249,115,22,0.32)', WebkitTapHighlightColor: 'transparent' }}
          >
            Ready?
          </button>
        </div>
      </div>
    );
  }

  if (showCompleted) {
    const completionStats = [
      { label: "Duration", value: formatTime(elapsed) },
      { label: "Calories", value: calories, unit: "kcal" },
      ...(counter > 0 && !isAIMode ? [{ label: counterLabel, value: counter }] : []),
    ];
    return (
      <CompletionSummary
        activityTitle={displayTitle}
        activityType={isAIMode ? "workout" : activityType.toLowerCase()}
        stats={completionStats}
        pointsEarned={pointsEarned}
        onDone={() => navigate("/workout-schedule")}
      />
    );
  }

  const exercises = aiContent?.exercises_snapshot ?? [];

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="flex items-center justify-between p-4 z-10">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          {!isAIMode && <IconComp className={cn("w-4 h-4", sport.color)} />}
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground truncate max-w-[180px]">
            {displayTitle}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowSettings(true)}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* AI exercise list (Modes A and B only) */}
      {isAIMode && exercises.length > 0 && (
        <div className="px-4 z-10">
          <button
            className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5"
            onClick={() => setShowExercises(v => !v)}
          >
            <span>{exercises.length} exercises · tap to {showExercises ? "hide" : "view"}</span>
            {showExercises ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showExercises && (
            <div className="bg-card/80 border border-border/30 rounded-2xl px-3 py-2 space-y-1.5 mb-2">
              {exercises.map(ex => (
                <div key={ex.order_index} className="flex items-start gap-2">
                  <span className="text-[10px] text-muted-foreground mt-0.5 w-4 shrink-0">{ex.order_index}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{ex.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {ex.sets && ex.reps
                        ? `${ex.sets}×${ex.reps}`
                        : ex.duration_seconds
                        ? `${ex.duration_seconds}s`
                        : ""}
                      {ex.body_area ? ` · ${ex.body_area.replace("_", " ")}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Heart rate zone indicator */}
      <div className="flex justify-center z-10">
        <div className="flex items-center gap-2 bg-muted/60 backdrop-blur-sm rounded-full px-4 py-1.5 border border-border/30">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", hrColor.replace("text-", "bg-"))} />
          <span className={cn("text-xs font-medium", hrColor)}>{hrZone} Zone</span>
        </div>
      </div>

      {/* Main timer area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 z-10">
        <div className="flex flex-col items-center">
          <span className={cn(
            "font-mono font-bold tracking-tight text-foreground",
            elapsed >= 3600 ? "text-6xl" : "text-7xl",
            isPaused && "text-muted-foreground"
          )}>
            {formatTime(elapsed)}
          </span>
          {isPaused && (
            <span className="text-sm text-muted-foreground mt-1 animate-pulse">Paused</span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8">
          {!isAIMode && (
            <>
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <IconComp className={cn("w-3.5 h-3.5", sport.color)} />
                  <span className="text-[10px] uppercase text-muted-foreground tracking-wider">{counterLabel}</span>
                </div>
                <span className="text-2xl font-bold text-foreground font-mono">{counter}</span>
              </div>
              <div className="h-10 w-px bg-border/30" />
            </>
          )}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] uppercase text-muted-foreground tracking-wider">Calories</span>
            </div>
            <span className="text-2xl font-bold text-foreground font-mono">{calories}</span>
          </div>
        </div>

        {/* Counter buttons (Mode C only) */}
        {!isAIMode && (
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full"
              onClick={() => { setCounter((s) => Math.max(0, s - 1)); if (settings.autoVibrate) navigator.vibrate?.(20); }}
            >
              <Minus className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground w-20 text-center">Log {counterLabel.slice(0, -1)}</span>
            <Button
              variant="outline"
              size="icon"
              className="w-12 h-12 rounded-full border-primary/50 text-primary"
              onClick={() => { setCounter((s) => s + 1); if (settings.autoVibrate) navigator.vibrate?.(50); toast.success(`${counterLabel.slice(0, -1)} ${counter + 1} logged!`); }}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className={cn(
        "pb-10 pt-6 px-6 transition-colors duration-500 rounded-t-[28px] border-t border-border/20 z-10",
        isHolding ? "bg-destructive/95" : "bg-card/95",
        "backdrop-blur-xl"
      )}>
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="outline"
            size="icon"
            className="w-16 h-16 rounded-full transition-transform active:scale-90 border-2"
            onClick={togglePause}
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>

          <div className="relative">
            <button
              className={cn(
                "w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all touch-manipulation select-none",
                isHolding ? "bg-destructive scale-110" : "bg-destructive/80"
              )}
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              onTouchCancel={handleHoldEnd}
            >
              <span className="text-destructive-foreground text-[10px] font-semibold leading-tight text-center">
                Hold to<br />Finish
              </span>
            </button>
            {!isHolding && (
              <div className="absolute inset-[-5px] rounded-full border-2 border-destructive/30 animate-ping pointer-events-none" style={{ animationDuration: "2.5s" }} />
            )}
            {isHolding && (
              <svg className="absolute inset-[-3px] w-[70px] h-[70px] -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="hsl(var(--destructive-foreground))" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${holdProgress * 2.89} 289`} className="transition-all" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sheet */}
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="bottom">
          <SheetHeader><SheetTitle>Timer Settings</SheetTitle></SheetHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <span>Vibration Feedback</span>
              <Switch checked={settings.autoVibrate} onCheckedChange={(c) => setSettings((p) => ({ ...p, autoVibrate: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <span>Show Calories</span>
              <Switch checked={settings.showCalories} onCheckedChange={(c) => setSettings((p) => ({ ...p, showCalories: c }))} />
            </div>
          </div>
          <Button className="w-full" onClick={() => setShowSettings(false)}>Done</Button>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default GymTimer;
