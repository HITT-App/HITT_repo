import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { HIITLogo } from '@/components/HIITLogo';
import { ArrowRight, Check, X, Dumbbell, Target, Zap, Heart, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  'welcome',
  'goals',
  'fitness-level',
  'frequency',
  'duration',
  'body-areas',
  'equipment',
  'processing',
];

const GOALS = [
  { id: 'lose-weight', label: 'Lose Weight', description: 'I wanna lose weight', icon: Target },
  { id: 'build-muscle', label: 'Build Muscle', description: 'Get the muscle gain', icon: Dumbbell },
  { id: 'improve-endurance', label: 'Improve Endurance', description: 'I wanna improve stamina', icon: Zap },
  { id: 'maintain-health', label: 'Maintain Health', description: 'I wanna maintain health', icon: Heart },
];

const FITNESS_LEVELS = [
  { value: 1, label: 'Beginner', description: 'New to working out' },
  { value: 2, label: 'Intermediate', description: 'Some experience' },
  { value: 3, label: 'Athletic', description: 'I can handle any intense workouts' },
  { value: 4, label: 'Advanced', description: 'Professional level training' },
];

const BODY_AREAS = [
  { id: 'legs', label: 'Lower Leg', icon: '🦵' },
  { id: 'upper-leg', label: 'Upper Leg', icon: '🦿' },
  { id: 'chest', label: 'Chest', icon: '💪' },
  { id: 'bicep', label: 'Bicep', icon: '💪' },
  { id: 'abs', label: 'Abs', icon: '🔥' },
  { id: 'glutes', label: 'Glutes', icon: '🍑' },
  { id: 'neck', label: 'Neck', icon: '🦴' },
  { id: 'calf', label: 'Calf', icon: '🦶' },
];

const EQUIPMENT = [
  { id: 'none', label: 'No Equipment' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'resistance-bands', label: 'Resistance Bands' },
  { id: 'pull-up-bar', label: 'Pull-up Bar' },
  { id: 'bench', label: 'Fitness Bench' },
  { id: 'treadmill', label: 'Treadmill' },
];

export default function WorkoutOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [fitnessLevel, setFitnessLevel] = useState(2);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [sessionDuration, setSessionDuration] = useState(27);
  const [selectedBodyAreas, setSelectedBodyAreas] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const stepName = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const toggleBodyArea = (id: string) => {
    setSelectedBodyAreas(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipment(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (currentStep < STEPS.length - 2) {
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === STEPS.length - 2) {
      // Move to processing step
      setCurrentStep(prev => prev + 1);
      await savePreferences();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.from('workout_preferences').upsert({
        user_id: user.id,
        workout_goal: selectedGoal,
        fitness_level: FITNESS_LEVELS[fitnessLevel - 1].label.toLowerCase(),
        days_per_week: daysPerWeek,
        session_duration: sessionDuration,
        target_body_areas: selectedBodyAreas,
        available_equipment: selectedEquipment,
        onboarding_completed: true,
      });

      if (error) throw error;

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({ title: 'Workout plan created!', description: 'Your personalized workouts are ready.' });
      navigate('/workout-library');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save preferences' });
      setCurrentStep(STEPS.length - 2);
    } finally {
      setIsSaving(false);
    }
  };

  const canContinue = () => {
    switch (stepName) {
      case 'goals': return !!selectedGoal;
      case 'body-areas': return selectedBodyAreas.length > 0;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      {stepName !== 'welcome' && stepName !== 'processing' && (
        <div className="px-4 pt-4">
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6">
        {/* Welcome Step */}
        {stepName === 'welcome' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <HIITLogo size="lg" showGlow className="mb-8" />
              <h1 className="text-2xl font-bold mb-3">
                Hello! I'm coach sandow AI, and today we'll setup personalized workout for you. Are you ready?
              </h1>
            </div>
            <div className="space-y-3">
              <Button onClick={handleContinue} className="w-full h-12 rounded-2xl gap-2">
                Yes, Start <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-2xl text-primary border-primary" onClick={() => navigate('/workout-library')}>
                No, I'll set up manually
              </Button>
            </div>
          </div>
        )}

        {/* Goals Step */}
        {stepName === 'goals' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo size="md" className="mb-6" />
            <h2 className="text-xl font-bold mb-6">What is your workout goal?</h2>
            <div className="space-y-3 flex-1">
              {GOALS.map(goal => {
                const Icon = goal.icon;
                const isSelected = selectedGoal === goal.id;
                return (
                  <button
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={cn(
                      "w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all text-left",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-secondary"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{goal.label}</p>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                      isSelected ? "border-primary bg-primary" : "border-border"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3 pt-6">
              <Button onClick={handleContinue} disabled={!canContinue()} className="w-full h-12 rounded-2xl gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" className="w-full text-destructive" onClick={() => navigate(-1)}>
                <X className="w-4 h-4 mr-2" /> No, go back
              </Button>
            </div>
          </div>
        )}

        {/* Fitness Level Step */}
        {stepName === 'fitness-level' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo size="md" className="mb-6" />
            <h2 className="text-xl font-bold mb-2">How would you describe your fitness level?</h2>
            <p className="text-muted-foreground mb-8">Drag the slider to adjust</p>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full mb-8">
                <Slider
                  value={[fitnessLevel]}
                  onValueChange={([val]) => setFitnessLevel(val)}
                  min={1}
                  max={4}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>LEVEL 1</span>
                  <span>LEVEL 4</span>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-4xl font-bold mb-2">{FITNESS_LEVELS[fitnessLevel - 1].label}</p>
                <p className="text-muted-foreground">{FITNESS_LEVELS[fitnessLevel - 1].description}</p>
              </div>
            </div>

            <Button onClick={handleContinue} className="w-full h-12 rounded-2xl gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Frequency Step */}
        {stepName === 'frequency' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo size="md" className="mb-6" />
            <h2 className="text-xl font-bold mb-8">How many days weekly do you plan to workout?</h2>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-8xl font-bold text-primary mb-4">{daysPerWeek}</p>
              <p className="text-xl text-muted-foreground mb-8">Times Weekly</p>
              
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setDaysPerWeek(num)}
                    className={cn(
                      "w-10 h-10 rounded-full font-semibold transition-all",
                      daysPerWeek === num 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary hover:bg-secondary/80"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                <Check className="w-4 h-4 inline mr-1" />
                I plan to exercise {daysPerWeek}x weekly
              </p>
            </div>

            <Button onClick={handleContinue} className="w-full h-12 rounded-2xl gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Duration Step */}
        {stepName === 'duration' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo size="md" className="mb-6" />
            <h2 className="text-xl font-bold mb-8">How much do you want to spend on a workout session?</h2>
            
            <div className="flex-1 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full border-4 border-primary flex flex-col items-center justify-center">
                <input
                  type="number"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Math.max(10, Math.min(90, parseInt(e.target.value) || 10)))}
                  className="text-5xl font-bold w-20 text-center bg-transparent border-none outline-none"
                />
                <p className="text-muted-foreground mt-2">minutes</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground text-center mb-6">
              <Check className="w-4 h-4 inline mr-1" />
              I usually do {sessionDuration}m workout per session
            </p>

            <Button onClick={handleContinue} className="w-full h-12 rounded-2xl gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Body Areas Step */}
        {stepName === 'body-areas' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo size="md" className="mb-6" />
            <h2 className="text-xl font-bold mb-2">Is there a specific body area you want to target?</h2>
            <p className="text-muted-foreground mb-6">Select one or multiple</p>

            {/* flex-1 grows to fill space; place-content-center vertically
                centres the body-area grid so buttons sit mid-screen rather
                than hugging the top under the heading */}
            <div className="flex-1 grid grid-cols-4 gap-3 place-content-center">
              {BODY_AREAS.map(area => {
                const isSelected = selectedBodyAreas.includes(area.id);
                return (
                  <button
                    key={area.id}
                    onClick={() => toggleBodyArea(area.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-h-[80px]",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl mb-1">{area.icon}</span>
                    <span className="text-xs text-center">{area.label}</span>
                  </button>
                );
              })}
            </div>

            <Button onClick={handleContinue} disabled={!canContinue()} className="w-full h-12 rounded-2xl gap-2 mt-6">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Equipment Step */}
        {stepName === 'equipment' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo size="md" className="mb-6" />
            <h2 className="text-xl font-bold mb-2">Do you have access to a workout equipment? If so, please scan those.</h2>
            
            <div className="flex-1">
              <div className="grid grid-cols-2 gap-3 mb-6">
                {EQUIPMENT.map(eq => {
                  const isSelected = selectedEquipment.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      onClick={() => toggleEquipment(eq.id)}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        isSelected 
                          ? "border-primary bg-primary/5" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-sm font-medium">{eq.label}</span>
                    </button>
                  );
                })}
              </div>
              
              <Button variant="outline" className="w-full h-12 rounded-2xl gap-2 border-primary text-primary">
                <Camera className="w-4 h-4" /> Scan Fitness Equipment
              </Button>
            </div>

            <div className="space-y-3">
              <Button onClick={handleContinue} className="w-full h-12 rounded-2xl gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="ghost" className="w-full text-destructive" onClick={handleContinue}>
                <X className="w-4 h-4 mr-2" /> No, I don't have any
              </Button>
            </div>
          </div>
        )}

        {/* Processing Step */}
        {stepName === 'processing' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-4 bg-card rounded-full flex items-center justify-center">
                <HIITLogo size="md" />
              </div>
            </div>
            <p className="text-xl font-semibold">Please wait...</p>
            <p className="text-muted-foreground mt-2">Creating your personalized workout plan</p>
          </div>
        )}
      </div>
    </div>
  );
}
