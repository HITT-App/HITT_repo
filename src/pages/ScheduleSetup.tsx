import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, RefreshCw, X, Zap, Flame, Feather, CalendarCheck, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DAYS_PER_WEEK = [
  { id: 2, label: '2 days', desc: 'Light — good for beginners' },
  { id: 3, label: '3 days', desc: 'Balanced — the most popular choice' },
  { id: 4, label: '4 days', desc: 'Committed — strong results' },
  { id: 5, label: '5 days', desc: 'Dedicated — high volume' },
  { id: 6, label: '6 days', desc: 'Athlete-level — intense schedule' },
];

const SESSION_DURATIONS = [
  { id: 15,  label: '15 min', desc: 'Quick blast' },
  { id: 30,  label: '30 min', desc: 'Short and effective' },
  { id: 45,  label: '45 min', desc: 'Standard session' },
  { id: 60,  label: '60 min', desc: 'Full workout' },
];

const WEEK_DAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};

const LOADING_MESSAGES = [
  'Coach is reviewing your goals…',
  'Browsing the workout catalogue…',
  'Balancing your training load…',
  'Scheduling rest and recovery days…',
  'Ordering sessions for best results…',
  'Almost ready — putting finishing touches on…',
];

const TOTAL_STEPS = 4;

type ExerciseSnapshot = {
  title: string;
  description: string | null;
  duration_seconds: number | null;
  sets: number | null;
  reps: number | null;
  order_index: number;
  body_area: string | null;
  thumbnail_url: null;
  video_url: null;
};

type PlanPreviewItem = {
  scheduled_date: string;
  title: string;
  description: string;
  why: string;
  intensity: 'low' | 'moderate' | 'high';
  estimated_duration_minutes: number;
  estimated_calories: number;
  exercises: ExerciseSnapshot[];
};

const INTENSITY_CONFIG = {
  low:      { label: 'Low',      icon: Feather, colour: 'text-sky-400    bg-sky-400/10'    },
  moderate: { label: 'Moderate', icon: Flame,   colour: 'text-orange-400 bg-orange-400/10' },
  high:     { label: 'High',     icon: Zap,     colour: 'text-red-400    bg-red-400/10'    },
};

export default function ScheduleSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo ?? '/ai';
  const goalText = (location.state as any)?.goalText ?? '';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  const [daysPerWeek, setDaysPerWeek] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [planPreview, setPlanPreview] = useState<PlanPreviewItem[] | null>(null);
  const [planGoal, setPlanGoal] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  // Cycle loading messages while generating
  useEffect(() => {
    if (!saving) { setLoadingMsgIndex(0); return; }
    const id = setInterval(() => setLoadingMsgIndex(i => (i + 1) % LOADING_MESSAGES.length), 2800);
    return () => clearInterval(id);
  }, [saving]);

  const advance = () => setStep(s => s + 1);

  const selectDays = (n: number) => {
    setDaysPerWeek(n);
    setPreferredDays(DEFAULT_DAYS[n] ?? [1, 3, 5]);
    setTimeout(advance, 150);
  };

  const selectDuration = (mins: number) => {
    setSessionMinutes(mins);
    setTimeout(advance, 150);
  };

  const toggleDay = (id: number) => {
    setPreferredDays(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const canBuild = preferredDays.length === daysPerWeek;

  const buildPlanRequest = async (accessToken: string, userId: string, overrides?: Partial<{
    daysPerWeek: number; sessionMinutes: number; preferredDays: number[];
  }>) => {
    const days = overrides?.daysPerWeek ?? daysPerWeek;
    const mins = overrides?.sessionMinutes ?? sessionMinutes;
    const prefDays = overrides?.preferredDays ?? preferredDays;

    const [{ data: prefs }, { data: activeGoal }, { data: profile }] = await Promise.all([
      supabase.from('workout_preferences')
        .select('workout_goal, fitness_level, available_equipment, target_body_areas')
        .eq('user_id', userId).maybeSingle(),
      (supabase as any).from('user_goals')
        .select('goal_type, target_text, target_date')
        .eq('user_id', userId).eq('is_active', true).maybeSingle(),
      (supabase as any).from('profiles')
        .select('user_memory').eq('user_id', userId).maybeSingle(),
    ]);

    const goal = prefs?.workout_goal ?? 'general fitness';
    const fitnessLevel = prefs?.fitness_level ?? '';
    const equipment: string[] = prefs?.available_equipment ?? [];
    const bodyAreas: string[] = prefs?.target_body_areas ?? [];
    const timeline: string = activeGoal?.target_text?.includes('ongoing')
      ? 'ongoing'
      : activeGoal?.target_text?.match(/(\d+ (?:weeks?|months?))/i)?.[1] ?? '4 weeks';
    const eventDate: string | null = activeGoal?.target_date ?? null;
    const userMemory = profile?.user_memory ?? {};
    const bodyScanSummary: string = userMemory?.physique ?? '';

    return {
      accessToken, goal, fitnessLevel, days, mins, prefDays,
      equipment, bodyAreas, timeline, eventDate, bodyScanSummary,
    };
  };

  const callGeneratePlan = async (params: Awaited<ReturnType<typeof buildPlanRequest>>) => {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-workout-plan`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${params.accessToken}` },
        body: JSON.stringify({
          goal: params.goal,
          fitnessLevel: params.fitnessLevel,
          daysPerWeek: params.days,
          sessionMinutes: params.mins,
          preferredDays: params.prefDays,
          equipment: params.equipment,
          bodyAreas: params.bodyAreas,
          timeline: params.timeline,
          eventDate: params.eventDate,
          bodyScanSummary: params.bodyScanSummary,
          startDate: new Date().toISOString().split('T')[0],
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? `Plan generator returned ${res.status}`);
    }
    return res.json();
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;
      if (!accessToken || !userId) return;

      const params = await buildPlanRequest(accessToken, userId);
      setPlanGoal(params.goal);

      const data = await callGeneratePlan(params);
      const workouts: PlanPreviewItem[] = data.plan?.workouts ?? [];
      if (!workouts.length) throw new Error('No workouts returned');

      setPlanTitle(data.plan?.title ?? '');
      setPlanPreview(workouts);
      advance();
    } catch (err: any) {
      console.error('[ScheduleSetup] Generate failed:', err);
      toast.error(err?.message ?? 'Could not build your plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateDay = async (index: number) => {
    setRegeneratingIndex(index);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;
      if (!accessToken || !userId) return;

      const params = await buildPlanRequest(accessToken, userId, { daysPerWeek: 1 });
      const data = await callGeneratePlan(params);
      const newWorkout: PlanPreviewItem | undefined = data.plan?.workouts?.[0];
      if (!newWorkout) throw new Error('No workout returned');

      // Keep the original scheduled_date, just replace content
      setPlanPreview(prev => prev
        ? prev.map((item, i) => i === index
            ? { ...newWorkout, scheduled_date: item.scheduled_date }
            : item)
        : prev
      );
    } catch (err) {
      console.error('[ScheduleSetup] Regenerate day failed:', err);
      toast.error('Could not regenerate this session. Try again.');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleRemove = (index: number) => {
    setPlanPreview(prev => prev ? prev.filter((_, i) => i !== index) : prev);
  };

  const handleConfirm = async () => {
    if (!planPreview) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      const today = new Date().toISOString().split('T')[0];
      const lastDate = planPreview[planPreview.length - 1]?.scheduled_date ?? today;

      // 1. Insert plan header
      const { data: planRow, error: planErr } = await supabase
        .from('user_workout_plans')
        .insert({
          user_id: userId,
          title: planTitle || `${planGoal} Plan`,
          goal: planGoal,
          start_date: today,
          end_date: lastDate,
          sessions_per_week: daysPerWeek,
          target_duration_minutes: sessionMinutes,
        } as any)
        .select('id')
        .maybeSingle();
      if (planErr || !planRow) throw planErr ?? new Error('Could not create plan');

      // 2. Insert plan items (with exercise snapshots)
      const itemInserts = planPreview.map((item, idx) => ({
        plan_id: planRow.id,
        user_id: userId,
        workout_id: null,
        workout_source: 'ai_generated',
        workout_title: item.title,
        workout_description: item.description,
        exercises_snapshot: item.exercises,
        why_text: item.why,
        intensity: item.intensity,
        estimated_duration_minutes: item.estimated_duration_minutes,
        estimated_calories: item.estimated_calories,
        scheduled_date: item.scheduled_date,
        day_index: idx,
        sequence_in_day: 0,
      }));
      const { data: itemRows, error: itemsErr } = await supabase
        .from('user_workout_plan_items')
        .insert(itemInserts as any)
        .select('id, scheduled_date');
      if (itemsErr) throw itemsErr;

      // 3. Insert into scheduled_workouts with plan_item_id back-link
      const scheduleInserts = (itemRows ?? []).map((row: any, idx: number) => ({
        user_id: userId,
        workout_id: null,
        workout_source: 'ai_generated',
        workout_title: planPreview[idx].title,
        workout_description: planPreview[idx].description,
        exercises_snapshot: planPreview[idx].exercises,
        why_text: planPreview[idx].why,
        intensity: planPreview[idx].intensity,
        estimated_duration_minutes: planPreview[idx].estimated_duration_minutes,
        estimated_calories: planPreview[idx].estimated_calories,
        scheduled_date: row.scheduled_date,
        plan_item_id: row.id,
      }));
      const { error: schedErr } = await supabase
        .from('scheduled_workouts')
        .insert(scheduleInserts as any);
      if (schedErr) throw schedErr;

      setConfirmed(true);
    } catch (err: any) {
      console.error('[ScheduleSetup] Confirm failed:', err);
      toast.error(err?.message ?? 'Could not save your plan. Please try again.');
      setSaving(false);
    }
  };

  const handleGoToSchedule = () => navigate('/workout-schedule', { replace: true });

  const handleGoToCoach = () => {
    const daysLabel = `${daysPerWeek} day${daysPerWeek > 1 ? 's' : ''} a week`;
    const greetPrompt = `[POST_PLAN_SAVED] The user's workout plan is confirmed and saved to their schedule. Goal: ${goalText || planGoal}. Schedule: ${daysLabel}, ${sessionMinutes} min/session. Give one warm celebratory sentence acknowledging their plan is live. Then ask what they want to focus on first. No action markers, no lists.`;
    navigate(returnTo, { replace: true, state: { tab: 'chat', prefillMessage: greetPrompt } });
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigate(-1);
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center px-6 text-center space-y-8"
        style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 24px)', paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 24px)' }}
      >
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center">
          <CalendarCheck className="w-12 h-12 text-primary" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight">Your plan is in your schedule</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {planPreview?.length} sessions added to your calendar. Open the Schedule tab to see them, or chat with your coach to get started.
          </p>
        </div>
        <div className="w-full space-y-3">
          <Button className="w-full h-12 rounded-xl font-semibold" onClick={handleGoToSchedule}>
            View my schedule
          </Button>
          <button
            className="w-full h-11 text-sm text-muted-foreground font-medium active:opacity-70 transition-opacity touch-manipulation"
            onClick={handleGoToCoach}
          >
            Chat with my coach
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center gap-3 px-4 py-3"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)' }}
      >
        <button onClick={handleBack} className="text-muted-foreground p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="text-[11px] text-muted-foreground font-medium">Step {step + 1} of {TOTAL_STEPS}</p>
          <div className="flex gap-1 mt-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn('h-1 flex-1 rounded-full transition-colors duration-300', i <= step ? 'bg-primary' : 'bg-border')}
              />
            ))}
          </div>
        </div>
        <button onClick={() => navigate(returnTo)} className="text-muted-foreground p-1 -mr-1">
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">

        {/* Step 0 — days per week */}
        {step === 0 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">How many days a week can you train?</h1>
              <p className="text-sm text-muted-foreground mt-1">Be realistic — consistency beats intensity.</p>
            </div>
            <div className="space-y-2.5">
              {DAYS_PER_WEEK.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => selectDays(id)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left touch-manipulation',
                    daysPerWeek === id ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card active:bg-secondary/60'
                  )}
                >
                  <div>
                    <p className={cn('font-semibold text-sm', daysPerWeek === id ? 'text-primary' : 'text-foreground')}>{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {daysPerWeek === id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 1 — session duration */}
        {step === 1 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">How long per session?</h1>
              <p className="text-sm text-muted-foreground mt-1">We'll build workouts that fit this window.</p>
            </div>
            <div className="space-y-2.5">
              {SESSION_DURATIONS.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => selectDuration(id)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left touch-manipulation',
                    sessionMinutes === id ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card active:bg-secondary/60'
                  )}
                >
                  <div>
                    <p className={cn('font-semibold text-sm', sessionMinutes === id ? 'text-primary' : 'text-foreground')}>{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {sessionMinutes === id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2 — preferred days */}
        {step === 2 && (
          <>
            {saving ? (
              /* Loading state with cycling messages */
              <div className="flex flex-col items-center justify-center py-16 space-y-5">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-border" />
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
                <div className="text-center space-y-1.5 px-4">
                  <p className="font-semibold text-sm text-foreground transition-all duration-500">
                    {LOADING_MESSAGES[loadingMsgIndex]}
                  </p>
                  <p className="text-xs text-muted-foreground">This takes about 15–20 seconds</p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Which days work best?</h1>
                  <p className="text-sm text-muted-foreground mt-1">Pick exactly {daysPerWeek} day{daysPerWeek > 1 ? 's' : ''}.</p>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {WEEK_DAYS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => toggleDay(id)}
                      disabled={!preferredDays.includes(id) && preferredDays.length >= daysPerWeek}
                      className={cn(
                        'py-3 rounded-2xl border text-sm font-semibold transition-all touch-manipulation',
                        preferredDays.includes(id)
                          ? 'border-primary bg-primary/[0.08] text-primary'
                          : 'border-border bg-card text-foreground active:bg-secondary/60 disabled:opacity-40'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Step 3 — plan preview + editing */}
        {step === 3 && planPreview && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{planTitle || 'Your plan'}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {planPreview.length} session{planPreview.length !== 1 ? 's' : ''} · tap <RefreshCw className="inline w-3 h-3" /> to regenerate a day
              </p>
            </div>
            <div className="space-y-2.5">
              {planPreview.map((item, i) => {
                const date = new Date(item.scheduled_date + 'T00:00:00');
                const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
                const dayNum = date.getDate();
                const monthName = date.toLocaleDateString('en-GB', { month: 'short' });
                const ic = INTENSITY_CONFIG[item.intensity] ?? INTENSITY_CONFIG.moderate;
                const IntIcon = ic.icon;
                const isRegenerating = regeneratingIndex === i;
                return (
                  <div key={i} className="flex gap-3 items-start p-4 rounded-2xl border border-border bg-card">
                    {/* Date column */}
                    <div className="text-center shrink-0 w-10">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{dayName}</p>
                      <p className="text-xl font-bold leading-tight text-foreground">{dayNum}</p>
                      <p className="text-[10px] text-muted-foreground">{monthName}</p>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-semibold text-sm text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.why}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium', ic.colour)}>
                          <IntIcon className="w-3 h-3" />
                          {ic.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{item.estimated_duration_minutes} min</span>
                        {item.estimated_calories > 0 && (
                          <span className="text-[11px] text-muted-foreground">~{item.estimated_calories} kcal</span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => !isRegenerating && handleRegenerateDay(i)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation"
                        disabled={isRegenerating}
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', isRegenerating && 'animate-spin text-primary')} />
                      </button>
                      <button
                        onClick={() => handleRemove(i)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors touch-manipulation"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {(step === 2 || step === 3) && (
        <div
          className="px-5 py-4 border-t border-border/40 bg-background/90 backdrop-blur-sm"
          style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 16px)' }}
        >
          {step === 3 ? (
            <Button
              className="w-full h-12 rounded-xl font-semibold"
              disabled={saving || !planPreview?.length}
              onClick={handleConfirm}
            >
              {saving ? 'Saving…' : 'Add to schedule'}
            </Button>
          ) : (
            <Button
              className="w-full h-12 rounded-xl font-semibold"
              disabled={!canBuild || saving}
              onClick={handleGenerate}
            >
              {saving ? 'Working on it…' : 'Preview my plan'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
