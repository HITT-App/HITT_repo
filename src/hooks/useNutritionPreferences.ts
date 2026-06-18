import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export type NutritionPreferences = {
  user_id: string
  allergies: string[]
  food_preferences: string[]
  daily_calorie_target: number | null
  calorie_method: 'manual' | 'calculated' | null
  weight_goal: 'lose' | 'maintain' | 'gain' | null
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | null
  onboarding_completed: boolean
  onboarding_skipped: boolean
}

export function useNutritionPreferences() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['nutrition-preferences', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from('nutrition_profiles')
        .select('user_id, allergies, food_preferences, daily_calorie_target, calorie_method, weight_goal, activity_level, onboarding_completed, onboarding_skipped')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (!data) return null
      // Any wizard that stores meaningful food_preferences counts as complete —
      // avoids re-prompting users who set prefs via Jarvis or another path.
      const meaningfulPrefs = (data.food_preferences ?? []).filter(
        (p: string) => p && p !== 'unrestricted',
      )
      if (!data.onboarding_completed && meaningfulPrefs.length > 0) {
        data.onboarding_completed = true
      }
      return data as NutritionPreferences
    },
  })

  const mutation = useMutation({
    mutationFn: async (patch: Partial<NutritionPreferences>) => {
      await supabase
        .from('nutrition_profiles')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new columns not yet in generated types
        .upsert({ user_id: user!.id, ...patch } as any, { onConflict: 'user_id' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-preferences', user?.id] }),
  })

  return { ...query, save: mutation.mutateAsync }
}
