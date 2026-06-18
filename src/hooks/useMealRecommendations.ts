import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useNutritionPreferences } from './useNutritionPreferences'

type MealRow = {
  id: string
  name: string
  description: string | null
  category: string
  meal_type: string | null
  calories: number | null
  protein_grams: number | null
  fat_grams: number | null
  carbs_grams: number | null
  image_url: string | null
  tags: string[] | null
  allergens: string[] | null
  dietary_tags: string[] | null
  ingredients: unknown
  instructions: unknown
}

export function useMealRecommendations() {
  const { data: prefs } = useNutritionPreferences()

  return useQuery({
    queryKey: ['meal-recommendations', prefs?.allergies, prefs?.food_preferences],
    queryFn: async () => {
      // meals table now has allergens + dietary_tags columns (added by migration)
      const { data } = await supabase
        .from('meals')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
        .select('id, name, description, category, meal_type, calories, protein_grams, fat_grams, carbs_grams, image_url, tags, allergens, dietary_tags, ingredients, instructions' as any)
        .order('rating', { ascending: false })
        .limit(20)

      let meals = (data ?? []) as MealRow[]

      // Client-side filter for allergen exclusion (safe at 8–20 row scale)
      // TODO: replace with a DB-side RPC if this table grows beyond 200 rows
      const userAllergens = (prefs?.allergies ?? []).map(a => a.toLowerCase()).filter(Boolean)
      if (userAllergens.length > 0) {
        meals = meals.filter(m => {
          const mealAllergens = (m.allergens ?? []).map(a => a.toLowerCase())
          return !userAllergens.some(a => mealAllergens.includes(a))
        })
      }

      // dietary_tags filter — 'unrestricted' means no filter; only apply when
      // the user has a meaningful dietary preference set
      const meaningfulDiet = (prefs?.food_preferences ?? [])
        .map(d => d.toLowerCase())
        .filter(d => d && d !== 'unrestricted')
      if (meaningfulDiet.length > 0) {
        meals = meals.filter(m => {
          const mealTags = (m.dietary_tags ?? []).map(t => t.toLowerCase())
          // Meals with no dietary_tags are always included (no restriction data = safe for all)
          if (mealTags.length === 0) return true
          return meaningfulDiet.some(d => mealTags.includes(d))
        })
      }

      return meals
    },
  })
}
