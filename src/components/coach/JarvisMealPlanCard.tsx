import { useState } from 'react'
import { Plus, Check, Loader2, X, ChevronDown, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import type { MealInPlan, RecommendMealPlanPayload } from '@/hooks/useAI.types'

interface JarvisMealPlanCardProps {
  plan: RecommendMealPlanPayload
  onDismiss: () => void
  onLogged: (mealName: string) => void
  onReroll?: () => void
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

export function JarvisMealPlanCard({ plan, onDismiss, onLogged, onReroll }: JarvisMealPlanCardProps) {
  const [confirmingMeal, setConfirmingMeal] = useState<MealInPlan | null>(null)
  const [loggingName, setLoggingName] = useState<string | null>(null)
  const [loggedNames, setLoggedNames] = useState<Set<string>>(new Set())
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)

  const sorted = [...plan.meals].sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a.meal_type)
    const bi = MEAL_ORDER.indexOf(b.meal_type)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const totalCals = plan.meals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = plan.meals.reduce((s, m) => s + m.protein_g, 0)
  const totalCarbs = plan.meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0)
  const totalFat = plan.meals.reduce((s, m) => s + (m.fat_g ?? 0), 0)

  const logMeal = async (meal: MealInPlan) => {
    setConfirmingMeal(null)
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

  const hasRecipeDetail = (meal: MealInPlan) =>
    (meal.ingredients && meal.ingredients.length > 0) ||
    (meal.instructions && meal.instructions.length > 0)

  return (
    <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Today's Meal Plan</p>
          <p className="text-xs text-muted-foreground">
            {totalCals} kcal · {Math.round(totalProtein)}P · {Math.round(totalCarbs)}C · {Math.round(totalFat)}F
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onReroll && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7 text-muted-foreground px-2 gap-1"
              onClick={onReroll}
            >
              <RefreshCw className="w-3 h-3" />
              New plan
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 text-muted-foreground px-2"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((meal) => {
          const logged = loggedNames.has(meal.name)
          const logging = loggingName === meal.name
          const confirming = confirmingMeal?.name === meal.name
          const expanded = expandedMeal === meal.name
          const showDetail = hasRecipeDetail(meal)

          return (
            <div key={meal.name} className="flex flex-col rounded-xl border border-border/60 bg-background overflow-hidden">
              {/* Header row — tap to expand */}
              <button
                type="button"
                className="flex items-center gap-3 px-3 py-2.5 text-left w-full"
                onClick={() => showDetail && setExpandedMeal(expanded ? null : meal.name)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug truncate">{meal.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {meal.meal_type} · {meal.calories} kcal · {meal.protein_g}P · {meal.carbs_g ?? 0}C · {meal.fat_g ?? 0}F
                  </p>
                </div>
                {showDetail && (
                  <ChevronDown
                    className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', expanded && 'rotate-180')}
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (logged || logging) return
                    setConfirmingMeal(confirming ? null : meal)
                  }}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    background: logged
                      ? 'hsl(var(--primary)/0.15)'
                      : confirming
                        ? 'hsl(var(--destructive)/0.15)'
                        : 'hsl(var(--primary))',
                  }}
                >
                  {logging ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : logged ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : confirming ? (
                    <X className="w-4 h-4 text-destructive" />
                  ) : (
                    <Plus className="w-4 h-4 text-primary-foreground" />
                  )}
                </button>
              </button>

              {/* Expandable recipe detail */}
              {expanded && showDetail && (
                <div className="px-3 pb-3 space-y-3 border-t border-border/30">
                  {meal.ingredients && meal.ingredients.length > 0 && (
                    <div className="pt-2.5">
                      <p className="text-xs font-semibold text-foreground mb-1.5">Ingredients</p>
                      <ul className="space-y-0.5">
                        {meal.ingredients.map((ing, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                            <span className="shrink-0 text-foreground/70">{ing.amount} {ing.unit}</span>
                            <span>{ing.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {meal.instructions && meal.instructions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1.5">Method</p>
                      <ol className="space-y-1">
                        {meal.instructions.map((step, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2">
                            <span className="shrink-0 font-medium text-foreground/60">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}

              {/* Log confirm strip */}
              {confirming && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">Log to your {meal.meal_type} diary?</p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmingMeal(null)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-border/60 text-muted-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => logMeal(meal)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-medium"
                    >
                      Log now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
