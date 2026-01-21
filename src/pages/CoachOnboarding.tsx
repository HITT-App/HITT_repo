import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HIITLogo } from '@/components/HIITLogo';
import { useCoachingPreferences } from '@/hooks/useCoaches';
import { useToast } from '@/hooks/use-toast';
import { 
  Dumbbell, Heart, Zap, Wind, User, Users, Sparkles,
  Sun, Moon, Coffee, Sunset, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKOUT_TYPES = [
  { id: 'cardio', label: 'Cardio', icon: Heart },
  { id: 'hiit', label: 'HIIT', icon: Zap },
  { id: 'strength', label: 'Strength', icon: Dumbbell },
  { id: 'mobility', label: 'Mobility', icon: Wind },
  { id: 'speed', label: 'Speed', icon: Zap },
];

const GENDERS = [
  { id: 'male', label: 'Male', description: 'Supporting Text', icon: User },
  { id: 'female', label: 'Female', description: 'Supporting Text', icon: User },
  { id: 'other', label: 'Other', description: 'Transgender, AI agents, Ultrons', icon: Sparkles },
];

const BODY_AREAS = ['Head', 'Shoulder', 'Arm', 'Leg', 'Gluteal', 'Torso'];

const COACHING_TYPES = [
  { id: 'in-person-gym', label: 'In-person at Gym', description: 'You come to gym with coach', icon: '🏋️' },
  { id: 'in-person-home', label: 'In-person at Home', description: 'Let coach come at your home', icon: '🏠' },
  { id: 'remote-live', label: 'Remote (Live Session)', description: 'I am a very introvert person', icon: '📹' },
  { id: 'remote-prerecorded', label: 'Remote (Pre-recorded)', description: 'I am a very introvert person', icon: '🎥' },
];

const TIME_PREFERENCES = [
  { id: 'morning', label: 'Morning', time: '7 - 10 AM', icon: Sun },
  { id: 'afternoon', label: 'Afternoon', time: '1 - 5 PM', icon: Coffee },
  { id: 'evening', label: 'Evening', time: '5 - 11 PM', icon: Sunset },
  { id: 'late-night', label: 'Late Night', time: '1 - 4 AM', icon: Moon },
];

export default function CoachOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { savePreferences } = useCoachingPreferences();

  const [step, setStep] = useState(0);
  const [workoutTypes, setWorkoutTypes] = useState<string[]>([]);
  const [coachGender, setCoachGender] = useState<string>('');
  const [bodyAreas, setBodyAreas] = useState<string[]>([]);
  const [budgetRange, setBudgetRange] = useState<[number, number]>([50, 250]);
  const [sessionDuration, setSessionDuration] = useState(32);
  const [coachingType, setCoachingType] = useState('');
  const [exerciseFrequency, setExerciseFrequency] = useState('');
  const [timePreference, setTimePreference] = useState('');

  const steps = [
    { title: 'Welcome', component: WelcomeStep },
    { title: 'Workout Type', component: WorkoutTypeStep },
    { title: 'Coach Gender', component: GenderStep },
    { title: 'Body Areas', component: BodyAreasStep },
    { title: 'Budget', component: BudgetStep },
    { title: 'Session Duration', component: DurationStep },
    { title: 'Coaching Type', component: CoachingTypeStep },
    { title: 'Time Preference', component: TimePreferenceStep },
  ];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Save preferences and navigate
      const success = await savePreferences({
        preferred_workout_types: workoutTypes,
        preferred_coach_gender: coachGender,
        target_body_areas: bodyAreas,
        budget_min: budgetRange[0],
        budget_max: budgetRange[1],
        session_duration_minutes: sessionDuration,
        coaching_type: coachingType,
        exercise_frequency: exerciseFrequency,
        workout_time_preference: timePreference,
        onboarding_completed: true,
      });

      if (success) {
        toast({ title: 'Preferences saved!', description: 'Finding your perfect coach...' });
        navigate('/browse-coaches');
      }
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      navigate(-1);
    }
  };

  function WelcomeStep() {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="relative w-full max-w-sm h-64 mb-8 rounded-3xl overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400"
            alt="Fitness Coach"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Find Your Ideal Fitness Coach Today</h1>
        <p className="text-muted-foreground mb-8">Track your sleep patterns and optimize your rest with this app.</p>
        <Button onClick={handleNext} className="w-full h-12 rounded-2xl">
          Get Started →
        </Button>
      </div>
    );
  }

  function WorkoutTypeStep() {
    return (
      <div className="flex-1 px-6">
        <p className="text-lg mb-6">What is your preferred workout type?</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {WORKOUT_TYPES.map(type => {
            const Icon = type.icon;
            const selected = workoutTypes.includes(type.id);
            return (
              <button
                key={type.id}
                onClick={() => {
                  if (selected) {
                    setWorkoutTypes(workoutTypes.filter(t => t !== type.id));
                  } else {
                    setWorkoutTypes([...workoutTypes, type.id]);
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
                  selected ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                )}
              >
                <Icon className="w-4 h-4" />
                {type.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">* You can select multiple options.</p>
      </div>
    );
  }

  function GenderStep() {
    return (
      <div className="flex-1 px-6">
        <p className="text-lg mb-6">What is your preferred coach gender?</p>
        <div className="space-y-3">
          {GENDERS.map(g => {
            const Icon = g.icon;
            const selected = coachGender === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setCoachGender(g.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  selected ? "bg-primary text-primary-foreground" : "bg-secondary"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                </div>
                {selected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" className="w-full mt-4 text-muted-foreground">
          I don't know ?
        </Button>
      </div>
    );
  }

  function BodyAreasStep() {
    return (
      <div className="flex-1 px-6">
        <p className="text-lg mb-6">Do you have a specific body area to target?</p>
        <div className="flex justify-center mb-6">
          <div className="relative w-40">
            <img
              src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200"
              alt="Body diagram"
              className="w-full opacity-30"
            />
          </div>
          <div className="flex flex-col gap-2 ml-4">
            {BODY_AREAS.map(area => {
              const selected = bodyAreas.includes(area);
              return (
                <button
                  key={area}
                  onClick={() => {
                    if (selected) {
                      setBodyAreas(bodyAreas.filter(a => a !== area));
                    } else {
                      setBodyAreas([...bodyAreas, area]);
                    }
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm border transition-all",
                    selected ? "bg-primary text-primary-foreground border-primary" : "border-border"
                  )}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function BudgetStep() {
    return (
      <div className="flex-1 px-6">
        <p className="text-lg mb-6">What is your coaching budget range per session?</p>
        <div className="text-center mb-8">
          <p className="text-4xl font-bold text-primary">
            ${budgetRange[0]} - ${budgetRange[1]}
          </p>
        </div>
        <input
          type="range"
          min={50}
          max={500}
          value={budgetRange[1]}
          onChange={(e) => setBudgetRange([budgetRange[0], parseInt(e.target.value)])}
          className="w-full accent-primary"
        />
        <div className="flex justify-between mt-4">
          {[50, 100, 150].map(val => (
            <button
              key={val}
              onClick={() => setBudgetRange([budgetRange[0], val])}
              className={cn(
                "px-4 py-2 rounded-full border text-sm",
                budgetRange[1] === val ? "border-primary bg-primary/10" : "border-border"
              )}
            >
              $ {val}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-6">
          You prefer higher-end coaching with professionals & lots of experience.
        </p>
      </div>
    );
  }

  function DurationStep() {
    return (
      <div className="flex-1 px-6">
        <p className="text-lg mb-6">How much time do you want to dedicate for each session</p>
        <div className="flex justify-center">
          <div className="relative">
            <div className="text-6xl font-bold text-primary mb-4">{sessionDuration}</div>
            <div className="flex flex-col gap-1">
              {[30, 31, 32, 33, 34].map(dur => (
                <button
                  key={dur}
                  onClick={() => setSessionDuration(dur)}
                  className={cn(
                    "w-full py-2 rounded-xl transition-all text-center",
                    sessionDuration === dur ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                  )}
                >
                  {dur}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center mt-6">
          I want to do {sessionDuration}m coaching session
        </p>
      </div>
    );
  }

  function CoachingTypeStep() {
    return (
      <div className="flex-1 px-6">
        <p className="text-lg mb-6">What type of coaching do you prefer?</p>
        <div className="space-y-3">
          {COACHING_TYPES.map(type => {
            const selected = coachingType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setCoachingType(type.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <span className="text-2xl">{type.icon}</span>
                <div className="flex-1">
                  <p className="font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
                {selected && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground text-xs">✓</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function TimePreferenceStep() {
    return (
      <div className="flex-1 px-6">
        <p className="text-lg mb-6">When do you usually work out?</p>
        <div className="grid grid-cols-2 gap-3">
          {TIME_PREFERENCES.map(pref => {
            const Icon = pref.icon;
            const selected = timePreference === pref.id;
            return (
              <button
                key={pref.id}
                onClick={() => setTimePreference(pref.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-6 rounded-2xl border transition-all",
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <Icon className={cn("w-8 h-8", selected ? "text-primary" : "text-muted-foreground")} />
                <p className="font-medium">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.time}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const CurrentStep = steps[step].component;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      {step > 0 && (
        <header className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <HIITLogo size="sm" />
          <div className="w-10" />
        </header>
      )}

      {/* Progress */}
      {step > 0 && (
        <div className="px-6 py-2">
          <div className="flex gap-1">
            {steps.slice(1).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  idx < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <CurrentStep />

      {/* Footer */}
      {step > 0 && (
        <div className="p-6 space-y-3">
          <Button onClick={handleNext} className="w-full h-12 rounded-2xl">
            Continue →
          </Button>
          {step === 1 && (
            <Button variant="outline" onClick={() => navigate('/browse-coaches')} className="w-full h-12 rounded-2xl">
              ← No, go back
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
