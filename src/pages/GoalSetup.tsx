import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Check, Flame, Dumbbell, Wind, Zap, Trophy, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const GOAL_OPTIONS = [
  { id: 'fat loss',    label: 'Fat loss',    desc: 'Burn fat and get leaner',           icon: Flame   },
  { id: 'muscle gain', label: 'Muscle gain', desc: 'Build strength and size',           icon: Dumbbell },
  { id: 'endurance',   label: 'Endurance',   desc: 'Improve stamina and fitness',       icon: Wind    },
  { id: 'strength',    label: 'Strength',    desc: 'Get stronger and more powerful',    icon: Zap     },
  { id: 'event prep',  label: 'Event prep',  desc: 'Train for a specific event or race', icon: Trophy  },
];

const TIMELINE_OPTIONS = [
  { id: '4 weeks',  label: '4 weeks'  },
  { id: '8 weeks',  label: '8 weeks'  },
  { id: '3 months', label: '3 months' },
  { id: '6 months', label: '6 months' },
  { id: 'ongoing',  label: 'Ongoing — no fixed deadline' },
];

const FITNESS_LEVELS = [
  { id: 'beginner',     label: 'Just starting',     desc: 'New to regular exercise'            },
  { id: 'intermediate', label: 'Some experience',   desc: 'Working out occasionally'           },
  { id: 'advanced',     label: 'Regularly active',  desc: 'Training 3–4× per week'             },
  { id: 'athlete',      label: 'Athlete',           desc: 'Competitive or high-volume training' },
];

const EXERCISE_TYPES = [
  'Running', 'HIIT', 'Weights / lifting', 'Cycling',
  'Yoga / pilates', 'Swimming', 'Team sports', 'Not much yet',
];

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'Just bodyweight'       },
  { id: 'dumbbells',  label: 'Dumbbells / kettlebells' },
  { id: 'barbell',    label: 'Barbell + rack'        },
  { id: 'bands',      label: 'Resistance bands'      },
  { id: 'gym',        label: 'Full gym access'       },
];

const TOTAL_STEPS = 5;

export default function GoalSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo ?? '/';

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [goalType, setGoalType]       = useState('');
  const [eventName, setEventName]     = useState('');
  const [eventDate, setEventDate]     = useState('');
  const [timeline, setTimeline]       = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [exerciseTypes, setExerciseTypes] = useState<string[]>([]);
  const [equipment, setEquipment]     = useState<string[]>([]);

  const isEventPrep = goalType === 'event prep';

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return !!goalType;
      case 1: return isEventPrep ? (!!eventName.trim() && !!eventDate) : !!timeline;
      case 2: return !!fitnessLevel;
      case 3: return exerciseTypes.length > 0;
      case 4: return equipment.length > 0;
      default: return false;
    }
  };

  const toggleChip = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const advance = () => setStep(s => s + 1);

  const selectGoalType = (id: string) => {
    setGoalType(id);
    setTimeout(advance, 150);
  };

  const selectTimeline = (id: string) => {
    setTimeline(id);
    setTimeout(advance, 150);
  };

  const selectFitnessLevel = (id: string) => {
    setFitnessLevel(id);
    setTimeout(advance, 150);
  };

  const buildTargetText = (): string => {
    if (isEventPrep) {
      const name = eventName.trim() || 'my event';
      return eventDate ? `${name} on ${eventDate}` : name;
    }
    const label = GOAL_OPTIONS.find(g => g.id === goalType)?.label ?? goalType;
    return timeline === 'ongoing' ? `${label} (ongoing)` : `${label} over ${timeline}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      // Deactivate any existing active goals
      await (supabase as any).from('user_goals')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Insert the new goal
      const { error: goalInsertError } = await (supabase as any).from('user_goals').insert({
        user_id:     userId,
        goal_type:   goalType,
        target_text: buildTargetText(),
        target_date: isEventPrep && eventDate ? eventDate : null,
        is_active:   true,
      });
      if (goalInsertError) throw goalInsertError;

      // Upsert workout preferences
      await supabase.from('workout_preferences').upsert({
        user_id:             userId,
        workout_goal:        goalType,
        fitness_level:       fitnessLevel,
        available_equipment: equipment,
      }, { onConflict: 'user_id' });

      // goal_prompt_preference is not in generated types — cast as any
      await (supabase as any).from('profiles')
        .update({ goal_prompt_preference: 'never' })
        .eq('user_id', userId);

      // Write goal into user_memory — jsonb_set merges only the 'goal' key, leaves other keys intact
      const fitnessLabelForMemory = FITNESS_LEVELS.find(f => f.id === fitnessLevel)?.label ?? fitnessLevel;
      const goalMemoryValue = `${buildTargetText()}. Fitness level: ${fitnessLabelForMemory}. Equipment: ${equipment.join(', ') || 'not specified'}.`;
      await (supabase as any).rpc('upsert_user_memory_key', {
        p_user_id: userId,
        p_key: 'goal',
        p_value: goalMemoryValue,
      });

      if (returnTo === '/ai') {
        const fitnessLabel = FITNESS_LEVELS.find(f => f.id === fitnessLevel)?.label ?? fitnessLevel;
        const greetPrompt = `[POST_GOAL_WIZARD] The user just finished the goal setup wizard. Their goal: ${buildTargetText()}. Fitness level: ${fitnessLabel}. Equipment: ${equipment.join(', ')}. In one warm sentence, acknowledge their specific goal by name. Then ask what they want to work on first. Be encouraging and personal — no lists, no options.`;
        navigate('/ai', {
          replace: true,
          state: { tab: 'chat', prefillMessage: greetPrompt },
        });
      } else {
        navigate(returnTo, { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigate(returnTo);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header + progress */}
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

        {/* Step 0 — goal type */}
        {step === 0 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">What's your main goal?</h1>
              <p className="text-sm text-muted-foreground mt-1">We'll build your plan around this.</p>
            </div>
            <div className="space-y-2.5">
              {GOAL_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => selectGoalType(id)}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left touch-manipulation',
                    goalType === id ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card active:bg-secondary/60'
                  )}
                >
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    goalType === id ? 'bg-primary/20' : 'bg-secondary'
                  )}>
                    <Icon className={cn('w-5 h-5', goalType === id ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {goalType === id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 1a — timeline (non-event) */}
        {step === 1 && !isEventPrep && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">How long are you giving yourself?</h1>
              <p className="text-sm text-muted-foreground mt-1">Pick a realistic window.</p>
            </div>
            <div className="space-y-2.5">
              {TIMELINE_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => selectTimeline(id)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-2xl border text-left font-medium text-sm transition-all touch-manipulation',
                    timeline === id ? 'border-primary bg-primary/[0.08] text-primary' : 'border-border bg-card text-foreground active:bg-secondary/60'
                  )}
                >
                  {label}
                  {timeline === id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 1b — event details */}
        {step === 1 && isEventPrep && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tell me about the event.</h1>
              <p className="text-sm text-muted-foreground mt-1">We'll work backward from your date.</p>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Event name</label>
                <Input
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  placeholder="e.g. London 10K, local triathlon…"
                  className="bg-card border-border h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Event date
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full h-12 px-3 rounded-xl border border-border bg-card text-foreground text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2 — fitness level */}
        {step === 2 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Current fitness level?</h1>
              <p className="text-sm text-muted-foreground mt-1">Be honest — this helps calibrate your workouts.</p>
            </div>
            <div className="space-y-2.5">
              {FITNESS_LEVELS.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => selectFitnessLevel(id)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left touch-manipulation',
                    fitnessLevel === id ? 'border-primary bg-primary/[0.08]' : 'border-border bg-card active:bg-secondary/60'
                  )}
                >
                  <div>
                    <p className={cn('font-semibold text-sm', fitnessLevel === id ? 'text-primary' : 'text-foreground')}>{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  {fitnessLevel === id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 3 — exercise types */}
        {step === 3 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">What do you currently do?</h1>
              <p className="text-sm text-muted-foreground mt-1">Select everything that applies.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {EXERCISE_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleChip(type, exerciseTypes, setExerciseTypes)}
                  className={cn(
                    'px-4 py-2.5 rounded-full border text-sm font-medium transition-all touch-manipulation',
                    exerciseTypes.includes(type)
                      ? 'border-primary bg-primary/[0.08] text-primary'
                      : 'border-border bg-card text-foreground active:bg-secondary/60'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 4 — equipment */}
        {step === 4 && (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">What equipment do you have?</h1>
              <p className="text-sm text-muted-foreground mt-1">Select everything available to you.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {EQUIPMENT_OPTIONS.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => toggleChip(id, equipment, setEquipment)}
                  className={cn(
                    'px-4 py-2.5 rounded-full border text-sm font-medium transition-all touch-manipulation',
                    equipment.includes(id)
                      ? 'border-primary bg-primary/[0.08] text-primary'
                      : 'border-border bg-card text-foreground active:bg-secondary/60'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer — only shown when manual advance is needed */}
      {(step === 4 || (step === 1 && isEventPrep) || step === 3) && (
        <div
          className="px-5 py-4 border-t border-border/40 bg-background/90 backdrop-blur-sm"
          style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 16px)' }}
        >
          {step === 4 ? (
            <Button
              className="w-full h-12 rounded-xl font-semibold"
              disabled={!canProceed() || saving}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Set my goal'}
            </Button>
          ) : (
            <div className="flex justify-end">
              <Button
                size="icon"
                className="w-12 h-12 rounded-full"
                disabled={!canProceed()}
                onClick={advance}
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
