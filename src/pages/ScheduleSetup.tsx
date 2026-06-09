import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const TOTAL_STEPS = 3;

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

  const handleBuild = async () => {
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

      await supabase.from('scheduled_workouts').insert(
        rows.map(r => ({ user_id: userId, workout_id: r.workout_id, scheduled_date: r.scheduled_date }))
      );

      const daysLabel = `${daysPerWeek} day${daysPerWeek > 1 ? 's' : ''} a week`;
      const greetPrompt = `[POST_SCHEDULE_WIZARD] The user just finished setting up their workout schedule. Their goal: ${goalText || goal}. Schedule: ${daysLabel}, ${sessionMinutes} minutes per session. In one warm sentence, acknowledge their new plan by name — mention both their goal and their schedule. Then ask what they want to work on first. No lists, no options, be encouraging and personal.`;

      navigate(returnTo, {
        replace: true,
        state: { tab: 'chat', prefillMessage: greetPrompt },
      });
    } catch (err) {
      console.error('[ScheduleSetup] Build failed:', err);
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
      </div>

      {/* Footer — only step 2 needs manual advance */}
      {step === 2 && (
        <div
          className="px-5 py-4 border-t border-border/40 bg-background/90 backdrop-blur-sm"
          style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 16px)' }}
        >
          <Button
            className="w-full h-12 rounded-xl font-semibold"
            disabled={!canBuild || saving}
            onClick={handleBuild}
          >
            {saving ? 'Building your plan…' : 'Build my plan'}
          </Button>
        </div>
      )}
    </div>
  );
}
