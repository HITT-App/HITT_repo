import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useMealRecommendations } from '@/hooks/useMealRecommendations'
import { useNutritionPreferences } from '@/hooks/useNutritionPreferences'
import { MealCard } from './MealCard'
import { MealDetailSheet } from './MealDetailSheet'
import { NutritionOnboardingCard } from './NutritionOnboardingCard'

type MealRow = {
  id: string
  name: string
  description: string | null
  category: string
  calories: number | null
  protein_grams: number | null
  fat_grams: number | null
  carbs_grams: number | null
  image_url: string | null
  tags: string[] | null
  allergens?: string[] | null
  dietary_tags?: string[] | null
  ingredients: unknown
}

export function MealsCarousel() {
  const navigate = useNavigate()
  const { data: prefs } = useNutritionPreferences()
  const { data: meals = [] } = useMealRecommendations()
  const [selectedMeal, setSelectedMeal] = useState<MealRow | null>(null)

  const showOnboardingCard =
    prefs === null || prefs === undefined ||
    (prefs.onboarding_completed === false && prefs.onboarding_skipped === false)

  return (
    <div className="pt-6 pb-2">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-sm font-semibold text-foreground">Recommended meals</h2>
        <Button
          variant="link"
          size="sm"
          className="text-primary p-0 h-auto text-sm"
          onClick={() => navigate('/browse-meals')}
        >
          See All
        </Button>
      </div>

      <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {showOnboardingCard && (
          <NutritionOnboardingCard />
        )}

        {meals.map(meal => (
          <MealCard
            key={meal.id}
            meal={meal}
            onClick={() => setSelectedMeal(meal as MealRow)}
          />
        ))}

        {meals.length === 0 && !showOnboardingCard && (
          <p className="text-sm text-muted-foreground py-4 px-1">No recommendations yet.</p>
        )}
      </div>

      {selectedMeal && (
        <MealDetailSheet
          meal={selectedMeal}
          open
          onClose={() => setSelectedMeal(null)}
        />
      )}
    </div>
  )
}
