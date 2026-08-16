import hiitLogo from '@/assets/hiit-logo.jpg'
import { storageImage, IMG } from '@/lib/storage-image'

type MealCardMeal = {
  id: string
  name: string
  meal_type?: string | null
  calories: number | null
  image_url: string | null
  tags: string[] | null
  dietary_tags?: string[] | null
}

interface MealCardProps {
  meal: MealCardMeal
  onClick: () => void
}

export function MealCard({ meal, onClick }: MealCardProps) {
  return (
    <div
      className="w-[200px] flex-shrink-0 snap-start rounded-2xl overflow-hidden border border-border/40 bg-card cursor-pointer active:opacity-80 transition-opacity"
      onClick={onClick}
    >
      {/* Full-bleed image with overlaid name + calories */}
      <div className="relative h-28 w-full">
        {meal.image_url ? (
          <img
            src={storageImage(meal.image_url, IMG.card)}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex flex-col items-center justify-center gap-1">
            <img src={hiitLogo} alt="HIIT" className="w-8 h-8 rounded-lg object-cover opacity-70" />
            {meal.meal_type && (
              <p className="text-[10px] font-medium text-muted-foreground capitalize">{meal.meal_type}</p>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
          <p className="font-semibold text-sm text-white truncate leading-tight">{meal.name}</p>
          {meal.calories != null && (
            <p className="text-xs text-white/70 mt-0.5">{meal.calories} kcal</p>
          )}
        </div>
      </div>
    </div>
  )
}
