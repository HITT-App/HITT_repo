import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { HIITLogo } from '@/components/HIITLogo';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';

const FOOD_PREFERENCES = [
  { id: 'no_preference', label: "I don't have any preferences", icon: '×' },
  { id: 'pescatarian', label: "I'm a pescatarian", icon: '🐟' },
  { id: 'vegetarian', label: "I'm vegetarian", icon: '🥬' },
  { id: 'vegan', label: 'I am vegan', icon: '🌱' },
  { id: 'meat', label: 'I like eating meat', icon: '🍖' },
  { id: 'wheat', label: 'I eat wheat', icon: '🌾' },
];

const ALLERGIES = [
  { id: 'gluten', label: 'Gluten' },
  { id: 'wheat', label: 'Wheat' },
  { id: 'lactose', label: 'Lactose' },
  { id: 'milk', label: 'Milk' },
  { id: 'egg', label: 'Egg' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'other', label: 'Other' },
  { id: 'none', label: 'None' },
];

const SNACK_FREQUENCIES = [
  { id: 'one', label: 'One Time' },
  { id: 'two', label: 'Two Times' },
  { id: 'three', label: 'Three Times' },
  { id: 'four', label: 'Four Times' },
  { id: 'five', label: 'Five Times' },
];

const PROTEIN_INTAKES = [
  { id: 'low', label: 'Low', description: '25 - 50g of protein daily' },
  { id: 'moderate', label: 'Moderate', description: '50 - 100g of protein daily' },
  { id: 'high', label: 'High', description: '100 - 200g of protein daily' },
];

type Step = 'welcome' | 'preferences' | 'allergies' | 'snacks' | 'protein' | 'calories' | 'notes';

const STEPS: Step[] = ['welcome', 'preferences', 'allergies', 'snacks', 'protein', 'calories', 'notes'];

export default function NutritionOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [preferences, setPreferences] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [snackFrequency, setSnackFrequency] = useState('');
  const [proteinIntake, setProteinIntake] = useState('');
  const [dailyCalories, setDailyCalories] = useState(2000);
  const [notes, setNotes] = useState('');

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Save nutrition profile
      const { error: profileError } = await supabase.from('nutrition_profiles').upsert({
        user_id: user.id,
        food_preferences: preferences,
        allergies: allergies,
        snack_frequency: snackFrequency,
        protein_intake: proteinIntake,
        daily_calorie_target: dailyCalories,
        notes: notes,
        onboarding_completed: true,
      });

      if (profileError) throw profileError;

      // Save nutrition goals
      const { error: goalsError } = await supabase.from('nutrition_goals').upsert({
        user_id: user.id,
        daily_calories: dailyCalories,
        daily_protein_grams: proteinIntake === 'low' ? 40 : proteinIntake === 'moderate' ? 75 : 150,
        daily_fat_grams: 65,
        daily_carbs_grams: Math.round(dailyCalories * 0.5 / 4),
      });

      if (goalsError) throw goalsError;

      toast({ title: 'Nutrition profile saved!', description: "You're all set to start tracking." });
      navigate('/nutrition');
    } catch (error) {
      console.error('Error saving nutrition profile:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save nutrition profile.' });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (id: string) => {
    setPreferences(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAllergy = (id: string) => {
    setAllergies(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Progress */}
      {currentStep !== 'welcome' && (
        <header className="p-4">
          <Progress value={progress} className="h-1" />
        </header>
      )}

      <div className="flex-1 flex flex-col p-6">
        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden relative mb-6">
              <div className="absolute inset-0 flex items-end justify-center">
                <div className="text-center p-6 pb-12">
                  <h1 className="text-xl font-bold text-foreground mb-2">
                    Log your Nutrition Daily To Get Better Result
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Let's manage your nutrition with ease
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleNext} className="w-full h-12 rounded-2xl gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Preferences Step */}
        {currentStep === 'preferences' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo className="w-12 h-12 mb-6" />
            <h1 className="text-xl font-bold mb-2">What are your food preferences?</h1>
            <div className="flex-1 space-y-3 py-4">
              {FOOD_PREFERENCES.map((pref) => (
                <button
                  key={pref.id}
                  onClick={() => togglePreference(pref.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                    preferences.includes(pref.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-xl">{pref.icon}</span>
                  <span className="flex-1">{pref.label}</span>
                  {preferences.includes(pref.id) && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-sm">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Button onClick={handleNext} className="w-full h-12 rounded-2xl gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
              <Button onClick={handleBack} variant="outline" className="w-full h-12 rounded-2xl gap-2 text-destructive border-destructive">
                <ArrowLeft className="w-4 h-4" /> No, go back
              </Button>
            </div>
          </div>
        )}

        {/* Allergies Step */}
        {currentStep === 'allergies' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo className="w-12 h-12 mb-6" />
            <h1 className="text-xl font-bold mb-2">Do you have any allergies or intolerances?</h1>
            <p className="text-sm text-muted-foreground mb-4">You can select multiple options</p>
            <div className="flex-1 py-4">
              <div className="flex flex-wrap gap-2">
                {ALLERGIES.map((allergy) => (
                  <button
                    key={allergy.id}
                    onClick={() => toggleAllergy(allergy.id)}
                    className={cn(
                      "px-4 py-2 rounded-full border-2 text-sm transition-all",
                      allergies.includes(allergy.id)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {allergy.label}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={handleNext} className="w-full h-12 rounded-2xl gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Snacks Step */}
        {currentStep === 'snacks' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo className="w-12 h-12 mb-6" />
            <h1 className="text-xl font-bold mb-6">How often do you snack daily?</h1>
            <div className="flex-1 space-y-3 py-4">
              {SNACK_FREQUENCIES.map((freq) => (
                <button
                  key={freq.id}
                  onClick={() => setSnackFrequency(freq.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-center transition-all",
                    snackFrequency === freq.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {freq.label}
                </button>
              ))}
            </div>
            <Button onClick={handleNext} className="w-full h-12 rounded-2xl gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Protein Step */}
        {currentStep === 'protein' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo className="w-12 h-12 mb-6" />
            <h1 className="text-xl font-bold mb-6">What's your preferred protein intake?</h1>
            <div className="flex-1 space-y-3 py-4">
              {PROTEIN_INTAKES.map((intake) => (
                <button
                  key={intake.id}
                  onClick={() => setProteinIntake(intake.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border-2 text-left transition-all",
                    proteinIntake === intake.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-8 rounded-full",
                      intake.id === 'low' ? 'bg-green-400' : intake.id === 'moderate' ? 'bg-primary' : 'bg-orange-500'
                    )} />
                    <div>
                      <p className="font-medium">{intake.label}</p>
                      <p className="text-sm text-muted-foreground">{intake.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Button onClick={handleNext} className="w-full h-12 rounded-2xl gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="link" className="w-full text-destructive">
                <X className="w-4 h-4 mr-1" /> I don't know
              </Button>
            </div>
          </div>
        )}

        {/* Calories Step */}
        {currentStep === 'calories' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo className="w-12 h-12 mb-6" />
            <h1 className="text-xl font-bold mb-2">What's your daily calorie intake?</h1>
            <p className="text-sm text-muted-foreground mb-6">Daily Intake (kcal)</p>
            <div className="flex-1 flex flex-col items-center justify-center py-8">
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={() => setDailyCalories(prev => Math.max(1000, prev - 100))}
                >
                  −
                </Button>
                <div className="text-center">
                  <Input
                    type="number"
                    value={dailyCalories}
                    onChange={(e) => setDailyCalories(parseInt(e.target.value) || 2000)}
                    className="text-4xl font-bold text-center w-32 border-0 border-b-2 rounded-none"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12"
                  onClick={() => setDailyCalories(prev => Math.min(5000, prev + 100))}
                >
                  +
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                I consume around <span className="font-semibold text-foreground">{dailyCalories.toLocaleString()}</span> kcal
              </p>
            </div>
            <Button onClick={handleNext} className="w-full h-12 rounded-2xl gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Notes Step */}
        {currentStep === 'notes' && (
          <div className="flex-1 flex flex-col">
            <HIITLogo className="w-12 h-12 mb-6" />
            <h1 className="text-xl font-bold mb-2">Do you have any food allergies or other notes?</h1>
            <div className="flex-1 py-6">
              <Input
                placeholder="Please describe here..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-12"
              />
              {notes && (
                <p className="mt-4 text-sm p-3 bg-secondary rounded-xl">
                  {notes.split(' ').map((word, i) => 
                    word.toLowerCase().includes('allergy') ? 
                      <span key={i} className="text-primary font-medium">{word} </span> : 
                      word + ' '
                  )}
                </p>
              )}
            </div>
            <Button 
              onClick={handleComplete} 
              disabled={isLoading}
              className="w-full h-12 rounded-2xl gap-2"
            >
              {isLoading ? 'Saving...' : 'Continue'} <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
