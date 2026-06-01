import { useState } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ALLERGEN_OPTIONS, DIETARY_OPTIONS } from '@/lib/constants'
import { useNutritionPreferences } from '@/hooks/useNutritionPreferences'
import { cn } from '@/lib/utils'

type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active'
type WeightGoal = 'lose' | 'maintain' | 'gain'
type Sex = 'male' | 'female' | 'prefer_not_to_say'

type Step =
  | 'allergens'
  | 'dietary'
  | 'calorie_choice'
  | 'calorie_questions'
  | 'calorie_manual'
  | 'done'

interface NutritionPreferencesFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ChipButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2 text-sm font-medium transition-colors border',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-secondary text-foreground border-border/40',
      )}
    >
      {label}
    </button>
  )
}

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]
}

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'lightly_active', label: 'Lightly active', desc: '1–3 days/week' },
  { value: 'moderately_active', label: 'Moderately active', desc: '3–5 days/week' },
  { value: 'very_active', label: 'Very active', desc: '6–7 days/week' },
]

const GOAL_OPTIONS: { value: WeightGoal; label: string }[] = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'gain', label: 'Gain weight' },
]

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

function calculateCalorieTarget(
  sex: Sex,
  ageStr: string,
  weightKgStr: string,
  heightCmStr: string,
  activityLevel: ActivityLevel,
  weightGoal: WeightGoal,
): number {
  const age = parseFloat(ageStr)
  const weightKg = parseFloat(weightKgStr)
  const heightCm = parseFloat(heightCmStr)

  const bmr =
    sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161 // female or prefer-not-to-say

  const activityMultiplier: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  }

  const goalAdjustment: Record<WeightGoal, number> = {
    lose: -500,
    maintain: 0,
    gain: 300,
  }

  return Math.round((bmr * activityMultiplier[activityLevel] + goalAdjustment[weightGoal]) / 50) * 50
}

export function NutritionPreferencesFlow({ open, onOpenChange }: NutritionPreferencesFlowProps) {
  const { save } = useNutritionPreferences()

  const [step, setStep] = useState<Step>('allergens')
  const [allergies, setAllergies] = useState<string[]>([])
  const [dietPrefs, setDietPrefs] = useState<string[]>([])

  // Calorie questions state
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null)
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null)
  const [sex, setSex] = useState<Sex | null>(null)
  const [age, setAge] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')

  // Manual calorie state
  const [manualCalories, setManualCalories] = useState('')

  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    onOpenChange(false)
    // Reset for next open
    setTimeout(() => {
      setStep('allergens')
      setAllergies([])
      setDietPrefs([])
      setWeightGoal(null)
      setActivityLevel(null)
      setSex(null)
      setAge('')
      setWeightKg('')
      setHeightCm('')
      setManualCalories('')
    }, 300)
  }

  const handleSkip = async () => {
    setSaving(true)
    await save({ onboarding_skipped: true })
    setSaving(false)
    handleClose()
  }

  const handleComplete = async (calorieTarget: number | null, method: 'manual' | 'calculated' | null) => {
    setSaving(true)
    await save({
      allergies,
      food_preferences: dietPrefs,
      daily_calorie_target: calorieTarget,
      calorie_method: method,
      weight_goal: weightGoal ?? undefined,
      activity_level: activityLevel ?? undefined,
      onboarding_completed: true,
    })
    setSaving(false)
    handleClose()
  }

  const questionsValid =
    weightGoal !== null &&
    activityLevel !== null &&
    sex !== null &&
    age.trim() !== '' &&
    weightKg.trim() !== '' &&
    heightCm.trim() !== ''

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] overflow-y-auto">
        <DrawerHeader className="pb-2">
          <DrawerTitle>
            {step === 'allergens' && 'Any allergens?'}
            {step === 'dietary' && 'Dietary preferences'}
            {step === 'calorie_choice' && 'Calorie goal'}
            {step === 'calorie_questions' && 'A few quick stats'}
            {step === 'calorie_manual' && 'Set your target'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Step: Allergens */}
          {step === 'allergens' && (
            <>
              <p className="text-sm text-muted-foreground">
                Select any allergens and we'll filter out unsafe meals.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map(opt => (
                  <ChipButton
                    key={opt}
                    label={opt}
                    selected={allergies.includes(opt)}
                    onClick={() => setAllergies(toggle(allergies, opt))}
                  />
                ))}
              </div>
            </>
          )}

          {/* Step: Dietary */}
          {step === 'dietary' && (
            <>
              <p className="text-sm text-muted-foreground">
                Pick any that apply — we'll prioritise matching meals.
              </p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(opt => (
                  <ChipButton
                    key={opt}
                    label={opt}
                    selected={dietPrefs.includes(opt)}
                    onClick={() => setDietPrefs(toggle(dietPrefs, opt))}
                  />
                ))}
              </div>
            </>
          )}

          {/* Step: Calorie choice */}
          {step === 'calorie_choice' && (
            <>
              <p className="text-sm text-muted-foreground">
                How would you like to set your daily calorie target?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setStep('calorie_questions')}
                  className="w-full rounded-2xl bg-secondary border border-border/40 p-4 text-left active:bg-secondary/70 transition-colors"
                >
                  <p className="font-semibold text-sm">Help me work it out</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Answer a few quick questions</p>
                </button>
                <button
                  type="button"
                  onClick={() => setStep('calorie_manual')}
                  className="w-full rounded-2xl bg-secondary border border-border/40 p-4 text-left active:bg-secondary/70 transition-colors"
                >
                  <p className="font-semibold text-sm">I know my target</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Enter a number directly</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleComplete(null, null)}
                  className="w-full rounded-2xl border border-border/40 p-4 text-left active:bg-secondary/30 transition-colors"
                >
                  <p className="font-semibold text-sm text-muted-foreground">Skip for now</p>
                </button>
              </div>
            </>
          )}

          {/* Step: Calorie questions */}
          {step === 'calorie_questions' && (
            <>
              <p className="text-sm text-muted-foreground">
                We'll use Mifflin-St Jeor to estimate your TDEE.
              </p>

              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Your goal</p>
                  <div className="flex gap-2 flex-wrap">
                    {GOAL_OPTIONS.map(o => (
                      <ChipButton
                        key={o.value}
                        label={o.label}
                        selected={weightGoal === o.value}
                        onClick={() => setWeightGoal(o.value)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Activity level</p>
                  <div className="flex flex-col gap-1.5">
                    {ACTIVITY_OPTIONS.map(o => (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setActivityLevel(o.value)}
                        className={cn(
                          'w-full rounded-xl p-3 text-left transition-colors border',
                          activityLevel === o.value
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-secondary border-border/40',
                        )}
                      >
                        <p className="text-sm font-medium">{o.label}</p>
                        <p className="text-xs text-muted-foreground">{o.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Sex</p>
                  <div className="flex gap-2 flex-wrap">
                    {SEX_OPTIONS.map(o => (
                      <ChipButton
                        key={o.value}
                        label={o.label}
                        selected={sex === o.value}
                        onClick={() => setSex(o.value)}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Age</p>
                    <Input
                      type="number"
                      placeholder="30"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Weight (kg)</p>
                    <Input
                      type="number"
                      placeholder="70"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Height (cm)</p>
                    <Input
                      type="number"
                      placeholder="170"
                      value={heightCm}
                      onChange={e => setHeightCm(e.target.value)}
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step: Manual calorie entry */}
          {step === 'calorie_manual' && (
            <>
              <p className="text-sm text-muted-foreground">
                Enter your daily calorie target in kcal.
              </p>
              <Input
                type="number"
                placeholder="e.g. 2000"
                value={manualCalories}
                onChange={e => setManualCalories(e.target.value)}
                inputMode="numeric"
                className="text-lg h-14"
              />
            </>
          )}
        </div>

        <DrawerFooter className="pt-0">
          {step === 'allergens' && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleSkip} disabled={saving}>
                Skip all
              </Button>
              <Button className="flex-1" onClick={() => setStep('dietary')}>
                Next
              </Button>
            </div>
          )}

          {step === 'dietary' && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('allergens')}>
                Back
              </Button>
              <Button className="flex-1" onClick={() => setStep('calorie_choice')}>
                Next
              </Button>
            </div>
          )}

          {step === 'calorie_choice' && (
            <Button variant="outline" onClick={() => setStep('dietary')}>
              Back
            </Button>
          )}

          {step === 'calorie_questions' && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('calorie_choice')}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!questionsValid || saving}
                onClick={() => {
                  const target = calculateCalorieTarget(
                    sex!,
                    age,
                    weightKg,
                    heightCm,
                    activityLevel!,
                    weightGoal!,
                  )
                  handleComplete(target, 'calculated')
                }}
              >
                {saving ? 'Saving…' : 'Finish'}
              </Button>
            </div>
          )}

          {step === 'calorie_manual' && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('calorie_choice')}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!manualCalories.trim() || saving}
                onClick={() => handleComplete(parseInt(manualCalories, 10), 'manual')}
              >
                {saving ? 'Saving…' : 'Finish'}
              </Button>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
