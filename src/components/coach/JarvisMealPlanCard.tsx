import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
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
  const [selectedMeal, setSelectedMeal] = useState<MealInPlan | null>(null)
  const [loggedNames, setLoggedNames] = useState<Set<string>>(new Set())
  const [isLogging, setIsLogging] = useState(false)

  const sorted = [...plan.meals].sort((a, b) => {
    const ai = MEAL_ORDER.indexOf(a.meal_type)
    const bi = MEAL_ORDER.indexOf(b.meal_type)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  const totalCals = plan.meals.reduce((s, m) => s + m.calories, 0)
  const totalProtein = plan.meals.reduce((s, m) => s + m.protein_g, 0)

  const logMeal = async (meal: MealInPlan) => {
    if (isLogging) return
    setIsLogging(true)
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
      setSelectedMeal(null)
      onLogged(meal.name)
    } catch {
      toast.error("Couldn't log meal — try again")
    } finally {
      setIsLogging(false)
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

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
          {sorted.map((meal) => {
            const logged = loggedNames.has(meal.name)
            return (
              <button
                key={meal.name}
                onClick={() => setSelectedMeal(meal)}
                className={cn(
                  'flex-shrink-0 w-28 rounded-xl p-2.5 text-left snap-start transition-colors border',
                  logged
                    ? 'bg-primary/10 border-primary/30 opacity-60'
                    : 'bg-background border-border/60 active:bg-secondary',
                )}
              >
                <span className="text-2xl">{meal.emoji ?? '🍽️'}</span>
                <p className="text-xs font-semibold text-foreground mt-1.5 leading-snug line-clamp-2">
                  {meal.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{meal.meal_type}</p>
                <p className="text-[10px] text-muted-foreground">{meal.calories} kcal</p>
                {logged && (
                  <p className="text-[10px] text-primary font-medium mt-1">✓ Logged</p>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-[10px] text-muted-foreground">Tap a meal to see ingredients and log it</p>
      </div>

      {selectedMeal && (
        <MealDetailDrawer
          meal={selectedMeal}
          logged={loggedNames.has(selectedMeal.name)}
          isLogging={isLogging}
          onLog={() => logMeal(selectedMeal)}
          onClose={() => setSelectedMeal(null)}
        />
      )}
    </>
  )
}

function MealDetailDrawer({
  meal,
  logged,
  isLogging,
  onLog,
  onClose,
}: {
  meal: MealInPlan
  logged: boolean
  isLogging: boolean
  onLog: () => void
  onClose: () => void
}) {
  return (
    <Drawer open onOpenChange={open => { if (!open) onClose() }}>
      <DrawerContent className="max-h-[85vh]">
        <div className="h-24 w-full bg-gradient-to-br from-accent/20 to-secondary flex items-center justify-center shrink-0">
          <span className="text-5xl">{meal.emoji ?? '🍽️'}</span>
        </div>

        <div className="overflow-y-auto">
          <DrawerHeader className="pb-1">
            <DrawerTitle>{meal.name}</DrawerTitle>
            {meal.description && (
              <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
            )}
          </DrawerHeader>

          <div className="px-4 pb-4 flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', value: meal.calories, unit: 'kcal' },
                { label: 'Protein', value: meal.protein_g, unit: 'g' },
                { label: 'Carbs', value: meal.carbs_g, unit: 'g' },
                { label: 'Fat', value: meal.fat_g, unit: 'g' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="rounded-xl bg-secondary p-2.5 text-center">
                  <p className="text-sm font-semibold">
                    {value}
                    <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {meal.ingredients.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ingredients</p>
                <ul className="flex flex-col gap-1">
                  {meal.ingredients.map((item, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5 shrink-0">•</span>
                      <span>{[item.amount, item.unit, item.name].filter(Boolean).join(' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meal.instructions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Instructions</p>
                <ol className="flex flex-col gap-2">
                  {meal.instructions.map((step, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter>
          {logged ? (
            <Button disabled className="w-full opacity-60">✓ Already logged</Button>
          ) : (
            <Button onClick={onLog} disabled={isLogging} className="w-full">
              {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log to diary'}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
