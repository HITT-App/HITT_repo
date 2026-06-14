import { useState } from 'react'
import { Plus, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import type { MealInPlan, RecommendMealPlanPayload } from '@/hooks/useAI.types'

interface JarvisMealPlanCardProps {
  plan: RecommendMealPlanPayload
  onDismiss: () => void
  onLogged: (mealName: string) => void
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

export function JarvisMealPlanCard({ plan, onDismiss, onLogged }: JarvisMealPlanCardProps) {
  const [pendingMeal, setPendingMeal] = useState<MealInPlan | null>(null)
  const [loggingName, setLoggingName] = useState<string | null>(null)
  const [loggedNames, setLoggedNames] = useState<Set<string>>(new Set())

  const sorted = [...plan.meals].sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a.meal_type)
    const bi = MEAL_ORDER.indexOf(b.meal_type)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const totalCals = plan.meals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = plan.meals.reduce((s, m) => s + m.protein_g, 0)

  const confirmLog = async () => {
    if (!pendingMeal) return
    const meal = pendingMeal
    setPendingMeal(null)
    setLoggingName(meal.name)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('meal_logs').insert({
        user_id: user.id,
        custom_name: meal.name,
        category: meal.meal_type,
        calories: meal.calories,
        protein_grams: meal.protein_g,
        carbs_grams: meal.carbs_g,
        fat_grams: meal.fat_g,
        fiber_grams: 0,
        logged_at: new Date().toISOString(),
      })
      if (error) throw error
      setLoggedNames(prev => new Set([...prev, meal.name]))
      onLogged(meal.name)
    } catch {
      toast.error("Couldn't log meal — try again")
    } finally {
      setLoggingName(null)
    }
  }

  return (
    <>
      <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Today's Meal Plan</p>
            <p className="text-xs text-muted-foreground">
              {totalCals} kcal · {Math.round(totalProtein)}g protein
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 text-muted-foreground px-2"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {sorted.map((meal) => {
            const logged = loggedNames.has(meal.name)
            const logging = loggingName === meal.name
            return (
              <div
                key={meal.name}
                className="flex items-center gap-3 bg-background rounded-xl px-3 py-2.5 border border-border/60"
              >
                <span className="text-2xl shrink-0">{meal.emoji ?? '🍽️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug truncate">{meal.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {meal.meal_type} · {meal.calories} kcal · {meal.protein_g}g protein
                  </p>
                </div>
                <button
                  onClick={() => !logged && !logging && setPendingMeal(meal)}
                  disabled={logged || logging}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
                  style={{ background: logged ? 'hsl(var(--primary)/0.15)' : 'hsl(var(--primary))' }}
                >
                  {logging ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                  ) : logged ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Plus className="w-4 h-4 text-primary-foreground" />
                  )}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <AlertDialog open={!!pendingMeal} onOpenChange={open => { if (!open) setPendingMeal(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log this meal?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMeal && (
                <>
                  <span className="font-medium text-foreground">{pendingMeal.name}</span>
                  {' '}will be added to your {pendingMeal.meal_type} diary —{' '}
                  {pendingMeal.calories} kcal, {pendingMeal.protein_g}g protein.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLog}>Log now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
