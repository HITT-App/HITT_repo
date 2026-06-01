import { useNavigate } from 'react-router-dom'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'

type MealDetail = {
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
  instructions: unknown
}

interface MealDetailSheetProps {
  meal: MealDetail
  open: boolean
  onClose: () => void
}

export function MealDetailSheet({ meal, open, onClose }: MealDetailSheetProps) {
  const navigate = useNavigate()

  const handleLogMeal = () => {
    onClose()
    navigate('/log-meal', {
      state: {
        recipe: {
          name: meal.name,
          calories: meal.calories ?? 0,
          protein_g: meal.protein_grams ?? 0,
          carbs_g: meal.carbs_grams ?? 0,
          fat_g: meal.fat_grams ?? 0,
        },
      },
    })
  }

  type Ingredient = { amount: string; unit: string; name: string }
  const ingredients: Ingredient[] = Array.isArray(meal.ingredients) ? meal.ingredients as Ingredient[] : []
  const instructions: string[] = Array.isArray(meal.instructions) ? meal.instructions as string[] : []

  return (
    <Drawer open={open} onOpenChange={open => { if (!open) onClose() }}>
      <DrawerContent className="max-h-[90vh]">
        {/* Hero image */}
        {meal.image_url && (
          <div className="h-48 w-full overflow-hidden">
            <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
          </div>
        )}
        {!meal.image_url && (
          <div className="h-32 w-full bg-gradient-to-br from-primary/30 to-secondary" />
        )}

        <div className="overflow-y-auto">
          <DrawerHeader className="pb-1">
            <DrawerTitle>{meal.name}</DrawerTitle>
            {meal.description && (
              <p className="text-sm text-muted-foreground mt-1">{meal.description}</p>
            )}
          </DrawerHeader>

          <div className="px-4 pb-4 flex flex-col gap-4">
            {/* Macros row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calories', value: meal.calories != null ? `${meal.calories}` : '—', unit: 'kcal' },
                { label: 'Protein', value: meal.protein_grams != null ? `${meal.protein_grams}` : '—', unit: 'g' },
                { label: 'Carbs', value: meal.carbs_grams != null ? `${meal.carbs_grams}` : '—', unit: 'g' },
                { label: 'Fat', value: meal.fat_grams != null ? `${meal.fat_grams}` : '—', unit: 'g' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="rounded-xl bg-secondary p-2.5 text-center">
                  <p className="text-sm font-semibold">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Tags */}
            {(meal.dietary_tags?.length ?? 0) + (meal.tags?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Tags</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[...(meal.dietary_tags ?? []), ...(meal.tags ?? [])].map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-3 py-1 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergens */}
            {(meal.allergens?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Contains</p>
                <div className="flex gap-1.5 flex-wrap">
                  {meal.allergens!.map(a => (
                    <span
                      key={a}
                      className="rounded-full bg-destructive/10 border border-destructive/30 px-3 py-1 text-xs font-medium text-destructive"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            {ingredients.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Ingredients</p>
                <ul className="flex flex-col gap-1">
                  {ingredients.map((item, idx) => (
                    <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{[item.amount, item.unit, item.name].filter(Boolean).join(' ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Instructions */}
            {instructions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Instructions</p>
                <ol className="flex flex-col gap-2">
                  {instructions.map((step, idx) => (
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
          <Button onClick={handleLogMeal} className="w-full">
            Log this meal
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
