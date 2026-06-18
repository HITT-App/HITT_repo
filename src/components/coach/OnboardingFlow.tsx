import { useState } from 'react';
import { HEmoji } from "@/components/HEmoji";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, X, Loader2, CheckCircle2, Dumbbell, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { useOnboardingPlan, type OnboardingAnswers } from '@/hooks/useOnboardingPlan';
import { useNavigate } from 'react-router-dom';

interface OnboardingFlowProps {
  onClose: () => void;
  activityLevel?: string;
}

const GOALS = [
  { id: 'Tone up',          emoji: '✨' },
  { id: 'Build strength',   emoji: '💪' },
  { id: 'Build endurance',  emoji: '🏃' },
  { id: 'Lose weight',      emoji: '🔥' },
  { id: 'General fitness',  emoji: '⚡' },
];

const EXPERIENCE = [
  { id: 'Just starting',    desc: 'New to exercise' },
  { id: 'Some experience',  desc: 'A few months in' },
  { id: 'Intermediate',     desc: '1–2 years training' },
  { id: 'Advanced',         desc: '3+ years training' },
];

const DAYS_PER_WEEK = [2, 3, 4, 5];

const WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

const SESSION_LENGTHS = [
  { id: 20,  label: '20 min',  desc: 'Quick & focused' },
  { id: 30,  label: '30 min',  desc: 'Efficient' },
  { id: 45,  label: '45 min',  desc: 'Full session' },
  { id: 60,  label: '60+ min', desc: 'Go deep' },
];

const TOTAL_STEPS = 5;

export function OnboardingFlow({ onClose, activityLevel }: OnboardingFlowProps) {
  const navigate = useNavigate();
  const { isGenerating, scheduledItems, error, generatePlan, checkConflicts, confirmSchedule } = useOnboardingPlan();

  const [step, setStep] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [conflictCount, setConflictCount] = useState(0);

  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [sessionMinutes, setSessionMinutes] = useState(30);

  const toggleDay = (d: number) => {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const canNext = () => {
    if (step === 0) return !!goal;
    if (step === 1) return !!experience;
    if (step === 2) return daysPerWeek > 0;
    if (step === 3) return selectedDays.length === daysPerWeek;
    if (step === 4) return sessionMinutes > 0;
    return false;
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      // Last step — generate plan
      await generatePlan({ goal, experience, daysPerWeek, selectedDays, sessionMinutes });
      setStep(TOTAL_STEPS); // move to review step
    }
  };

  const handleAddToSchedule = async () => {
    setConfirming(true);
    const conflicts = await checkConflicts();
    setConfirming(false);
    if (conflicts > 0) {
      setConflictCount(conflicts);
      setShowConflict(true);
    } else {
      doSave('add');
    }
  };

  const doSave = async (strategy: 'replace' | 'add') => {
    setShowConflict(false);
    setConfirming(true);
    const ok = await confirmSchedule(strategy);
    setConfirming(false);
    if (ok) setDone(true);
  };

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <Overlay onClose={onClose}>
        <div className="flex flex-col items-center justify-center flex-1 gap-5 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2"><><HEmoji name="announcement" size={20} style={{verticalAlign:'middle', marginRight:6}}/>Your plan is ready</></h2>
            <p className="text-sm text-muted-foreground">
              {scheduledItems.length} workouts added to your schedule. Push notifications will fire on each session day.
            </p>
          </div>
          <Button className="w-full rounded-2xl h-12" onClick={() => { onClose(); navigate('/workout-schedule'); }}>
            View my schedule
          </Button>
          <button className="text-sm text-muted-foreground" onClick={onClose}>Close</button>
        </div>
      </Overlay>
    );
  }

  // ── Review / generating screen ───────────────────────────────────────────
  if (step === TOTAL_STEPS) {
    return (
      <>
      <Overlay onClose={onClose}>
        <div className="flex flex-col flex-1 px-5 pb-6">
          <h2 className="text-lg font-bold mb-1">Your plan</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {isGenerating ? 'Building your programme…' : `${scheduledItems.length} sessions across the next 4 weeks`}
          </p>

          {isGenerating && (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
          )}

          {!isGenerating && error && (
            <p className="text-destructive text-sm mt-4">{error}</p>
          )}

          {!isGenerating && scheduledItems.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {scheduledItems.slice(0, 12).map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.workout_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.scheduled_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
              {scheduledItems.length > 12 && (
                <p className="text-xs text-muted-foreground text-center py-2">+{scheduledItems.length - 12} more sessions</p>
              )}
            </div>
          )}

          {!isGenerating && scheduledItems.length > 0 && (
            <Button className="w-full h-12 rounded-2xl" onClick={handleAddToSchedule} disabled={confirming}>
              {confirming ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking…</> : 'Add to my schedule'}
            </Button>
          )}
          {!isGenerating && (
            <button className="mt-3 text-sm text-muted-foreground text-center w-full" onClick={() => setStep(TOTAL_STEPS - 1)}>
              ← Go back and adjust
            </button>
          )}
        </div>
      </Overlay>

      {/* Conflict modal */}
      {showConflict && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConflict(false)} />
          <div className="relative w-full bg-background rounded-t-[24px] px-5 pt-5"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.3)] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-foreground">You already have a plan</p>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  There are {conflictCount} session{conflictCount !== 1 ? 's' : ''} already scheduled in this period. What would you like to do?
                </p>
              </div>
            </div>
            <div className="space-y-2.5">
              <button onClick={() => doSave('replace')}
                className="w-full flex items-center gap-3 p-4 rounded-[16px] bg-destructive/8 border border-destructive/25 active:bg-destructive/15 transition-colors touch-manipulation">
                <RefreshCw className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-foreground">Replace existing plan</p>
                  <p className="text-[12px] text-muted-foreground">Remove the {conflictCount} existing sessions and use this new plan</p>
                </div>
              </button>
              <button onClick={() => doSave('add')}
                className="w-full flex items-center gap-3 p-4 rounded-[16px] bg-card border border-border active:bg-secondary transition-colors touch-manipulation">
                <Plus className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-foreground">Add alongside</p>
                  <p className="text-[12px] text-muted-foreground">Keep existing sessions and add this plan on top</p>
                </div>
              </button>
              <button onClick={() => setShowConflict(false)}
                className="w-full py-3.5 rounded-[16px] border border-border text-[13px] font-semibold text-muted-foreground touch-manipulation">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  // ── Question steps ───────────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose}>
      {/* Progress dots */}
      <div className="flex gap-1.5 px-5 pt-1 pb-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-border')} />
        ))}
      </div>

      <div className="flex-1 px-5 pb-6 flex flex-col">
        {step === 0 && (
          <Step title="What's your main goal?" subtitle="We'll build your plan around this.">
            <div className="grid grid-cols-1 gap-3">
              {GOALS.map(g => (
                <Chip key={g.id} selected={goal === g.id} onClick={() => setGoal(g.id)}>
                  {g.emoji === '💪' ? <HEmoji name="workouts" size={28}/> : g.emoji === '🔥' ? <HEmoji name="streak" size={28}/> : <span className="text-2xl">{g.emoji}</span>}
                  <span className="font-medium">{g.id}</span>
                </Chip>
              ))}
            </div>
          </Step>
        )}

        {step === 1 && (
          <Step title="How experienced are you?" subtitle="Be honest — we'll calibrate the difficulty.">
            <div className="grid grid-cols-1 gap-3">
              {EXPERIENCE.map(e => (
                <Chip key={e.id} selected={experience === e.id} onClick={() => setExperience(e.id)}>
                  <div>
                    <p className="font-medium">{e.id}</p>
                    <p className="text-xs text-muted-foreground">{e.desc}</p>
                  </div>
                </Chip>
              ))}
            </div>
          </Step>
        )}

        {step === 2 && (
          <Step title="How many days per week?" subtitle="Pick what's realistic, not ideal.">
            <div className="grid grid-cols-2 gap-3">
              {DAYS_PER_WEEK.map(d => (
                <Chip key={d} selected={daysPerWeek === d} onClick={() => { setDaysPerWeek(d); setSelectedDays([]); }}>
                  <span className="text-2xl font-black">{d}</span>
                  <span className="text-xs text-muted-foreground">days / week</span>
                </Chip>
              ))}
            </div>
          </Step>
        )}

        {step === 3 && (
          <Step
            title={`Pick your ${daysPerWeek} training days`}
            subtitle={`${selectedDays.length} of ${daysPerWeek} selected`}
          >
            <div className="grid grid-cols-4 gap-2">
              {WEEKDAYS.map(d => (
                <button
                  key={d.value}
                  onClick={() => {
                    if (selectedDays.includes(d.value)) toggleDay(d.value);
                    else if (selectedDays.length < daysPerWeek) toggleDay(d.value);
                  }}
                  className={cn(
                    'aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all',
                    selectedDays.includes(d.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary/30 text-foreground',
                    selectedDays.length >= daysPerWeek && !selectedDays.includes(d.value) && 'opacity-40'
                  )}
                >
                  <span className="text-sm font-bold">{d.label}</span>
                </button>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step title="How long per session?" subtitle="We'll pick workouts that fit.">
            <div className="grid grid-cols-2 gap-3">
              {SESSION_LENGTHS.map(s => (
                <Chip key={s.id} selected={sessionMinutes === s.id} onClick={() => setSessionMinutes(s.id)}>
                  <span className="text-lg font-black">{s.label}</span>
                  <span className="text-xs text-muted-foreground">{s.desc}</span>
                </Chip>
              ))}
            </div>
          </Step>
        )}

        <div className="mt-auto pt-6 flex gap-3">
          {step > 0 && (
            <Button variant="outline" size="icon" className="shrink-0 rounded-2xl h-12 w-12" onClick={() => setStep(s => s - 1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Button
            className="flex-1 h-12 rounded-2xl"
            disabled={!canNext() || isGenerating}
            onClick={handleNext}
          >
            {isGenerating && step === TOTAL_STEPS - 1
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Building…</>
              : step === TOTAL_STEPS - 1 ? 'Build my plan' : 'Next'}
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end">
      <div className="w-full bg-background rounded-t-3xl border-t border-border shadow-2xl flex flex-col max-h-[90dvh]">
        {/* Handle + close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="w-10 h-1 rounded-full bg-border mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <div className="w-8" />
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center ml-auto">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-secondary/30'
      )}
    >
      {children}
    </button>
  );
}
