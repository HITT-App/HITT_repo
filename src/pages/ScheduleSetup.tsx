import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Loader2, RefreshCw, X } from 'lucide-react';
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

type WorkoutDetails = {
  id: string;
  title: string;
  duration_minutes: number | null;
  category: string | null;
  difficulty: string | null;
  equipment: string[] | null;
};

type PlanPreviewItem = {
  workout_id: string;
  scheduled_date: string;
  workout: WorkoutDetails;
};

export default function ScheduleSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo ?? '/ai';
  const goalText = (location.state as any)?.goalText ?? '';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [daysPerWeek, setDaysPerWeek] = useState(0);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [planPreview, setPlanPreview] = useState<PlanPreviewItem[] | null>(null);
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutDetails[]>([]);
  const [planGoal, setPlanGoal] = useState('');
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);
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

  const mapToScheduleDates = (
    planItems: { workout_id: string }[],
  ): { workout_id: string; scheduled_date: string }[] => {
    const sorted = [...preferredDays].sort((a, b) => a - b);
    const today = new Date();
    const todayDow = today.getDay();
    const upcomingDates: Date[] = [];
    for (let week = 0; week < 4; week++) {
      for (const dow of sorted) {
        const diff = ((dow - todayDow + 7) % 7) + week * 7;
        if (diff === 0 && week === 0) continue;
        const d = new Date(today);
        d.setDate(today.getDate() + (diff || 7));
        upcomingDates.push(d);
      }
    }
    upcomingDates.sort((a, b) => a.getTime() - b.getTime());
    return planItems.slice(0, upcomingDates.length).map((item, i) => ({
      workout_id: item.workout_id,
      scheduled_date: upcomingDates[i].toISOString().split('T')[0],
    }));
  };

  const handleGenerate = async () => {
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const userId = sessionData?.session?.user?.id;
      if (!accessToken || !userId) return;

      const { data: prefs } = await supabase
        .from('workout_preferences')
        .select('workout_goal')
        .eq('user_id', userId)
        .maybeSingle();
      const goal = prefs?.workout_goal ?? 'general fitness';
      setPlanGoal(goal);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-workout-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            goal,
            days: daysPerWeek * 4,
            sessions_per_week: daysPerWeek,
            duration_minutes: sessionMinutes,
            title: `${goal} Plan`,
          }),
        }
      );
      if (!res.ok) throw new Error(`Plan generator returned ${res.status}`);

      const data = await res.json();
      const planItems: { day_index: number; workout_id: string }[] = data.items ?? [];
      const rows = mapToScheduleDates(planItems);
      if (!rows.length) throw new Error('No workouts returned');

      // Fetch ALL workouts (for the swap picker too)
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id, title, duration_minutes, category, difficulty, equipment')
        .order('category');

      const allWorkouts = (workouts ?? []) as WorkoutDetails[];
      setAvailableWorkouts(allWorkouts);
      const workoutMap = new Map(allWorkouts.map(w => [w.id, w]));

      const preview: PlanPreviewItem[] = rows.map(r => ({
        workout_id: r.workout_id,
        scheduled_date: r.scheduled_date,
        workout: workoutMap.get(r.workout_id) ?? {
          id: r.workout_id,
          title: 'Workout',
          duration_minutes: sessionMinutes,
          category: null,
          difficulty: null,
          equipment: null,
        },
      }));

      setPlanPreview(preview);
      advance();
    } catch (err) {
      console.error('[ScheduleSetup] Generate failed:', err);
      toast.error('Could not build your plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSwap = (index: number, workout: WorkoutDetails) => {
    setPlanPreview(prev => prev
      ? prev.map((item, i) => i === index ? { ...item, workout_id: workout.id, workout } : item)
      : prev
    );
    setSwappingIndex(null);
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

      await supabase.from('scheduled_workouts').insert(
        planPreview.map(r => ({ user_id: userId, workout_id: r.workout_id, scheduled_date: r.scheduled_date }))
      );

      const daysLabel = `${daysPerWeek} day${daysPerWeek > 1 ? 's' : ''} a week`;
      const greetPrompt = `[POST_PLAN_SAVED] The user's workout plan is confirmed and already saved to their schedule — no scheduling action needed. Goal: ${goalText || planGoal}. Schedule: ${daysLabel}, ${sessionMinutes} min/session. Give one warm celebratory sentence acknowledging their plan is live. Then ask what they want to focus on first. No action markers, no lists.`;

      navigate(returnTo, {
        replace: true,
        state: { tab: 'chat', prefillMessage: greetPrompt },
      });
    } catch (err) {
      console.error('[ScheduleSetup] Confirm failed:', err);
      toast.error('Could not save your plan. Please try again.');
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigate(-1);
  };

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
              <h1 className="text-2xl font-bold tracking-tight">Your plan</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {daysPerWeek} session{daysPerWeek > 1 ? 's' : ''} a week · {sessionMinutes} min each · tap <RefreshCw className="inline w-3 h-3" /> to swap
              </p>
            </div>
            <div className="space-y-2.5">
              {planPreview.map((item, i) => {
                const date = new Date(item.scheduled_date + 'T00:00:00');
                const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
                const dayNum = date.getDate();
                const monthName = date.toLocaleDateString('en-GB', { month: 'short' });
                const equipment = (item.workout.equipment ?? []).filter(Boolean);
                return (
                  <div key={i} className="flex gap-3 items-start p-4 rounded-2xl border border-border bg-card">
                    <div className="text-center shrink-0 w-10">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{dayName}</p>
                      <p className="text-xl font-bold leading-tight text-foreground">{dayNum}</p>
                      <p className="text-[10px] text-muted-foreground">{monthName}</p>
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="font-semibold text-sm text-foreground">{item.workout.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {item.workout.category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{item.workout.category}</span>
                        )}
                        {item.workout.duration_minutes && (
                          <span className="text-[11px] text-muted-foreground">{item.workout.duration_minutes} min</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {equipment.length > 0 ? equipment.join(', ') : 'Bodyweight'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => setSwappingIndex(i)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors touch-manipulation"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
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
              {saving ? 'Starting…' : 'Start training'}
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

      {/* Swap sheet */}
      {swappingIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setSwappingIndex(null)}
          />
          <div className="bg-background rounded-t-3xl flex flex-col max-h-[70vh]" style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 8px)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <p className="font-semibold text-sm">Swap workout</p>
              <button onClick={() => setSwappingIndex(null)} className="p-1 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-3 space-y-2">
              {availableWorkouts.map(w => {
                const isCurrent = w.id === planPreview?.[swappingIndex]?.workout_id;
                const equip = (w.equipment ?? []).filter(Boolean);
                return (
                  <button
                    key={w.id}
                    onClick={() => handleSwap(swappingIndex, w)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all touch-manipulation',
                      isCurrent ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card active:bg-secondary/60'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold text-sm', isCurrent ? 'text-primary' : 'text-foreground')}>{w.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {w.category && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{w.category}</span>
                        )}
                        {w.duration_minutes && (
                          <span className="text-[11px] text-muted-foreground">{w.duration_minutes} min</span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {equip.length > 0 ? equip.join(', ') : 'Bodyweight'}
                        </span>
                      </div>
                    </div>
                    {isCurrent && <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
