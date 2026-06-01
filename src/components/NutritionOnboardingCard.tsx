import { useState } from 'react'
import { NutritionPreferencesFlow } from './NutritionPreferencesFlow'
import { useNutritionPreferences } from '@/hooks/useNutritionPreferences'

interface NutritionOnboardingCardProps {
  onComplete?: () => void
  onSkip?: () => void
}

export function NutritionOnboardingCard({ onComplete, onSkip }: NutritionOnboardingCardProps) {
  const [flowOpen, setFlowOpen] = useState(false)
  const { save } = useNutritionPreferences()

  const handleSkip = async () => {
    await save({ onboarding_skipped: true })
    onSkip?.()
  }

  return (
    <>
      <div className="w-40 flex-shrink-0 snap-start rounded-2xl bg-primary/10 border border-primary/30 p-3 flex flex-col gap-2 cursor-pointer active:bg-primary/20 transition-colors">
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground leading-tight">Personalise your meals</p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            Tell us your allergens and diet so we can recommend better meals
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFlowOpen(true)
            onComplete?.()
          }}
          className="w-full rounded-xl bg-primary text-primary-foreground text-xs font-semibold py-2 active:opacity-80 transition-opacity"
        >
          Get started
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-xs text-muted-foreground py-1 active:opacity-60 transition-opacity"
        >
          Skip
        </button>
      </div>

      <NutritionPreferencesFlow open={flowOpen} onOpenChange={setFlowOpen} />
    </>
  )
}
