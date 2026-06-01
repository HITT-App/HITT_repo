import hiitLogo from '@/assets/hiit-logo.jpg'

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
  const displayTags = [...(meal.dietary_tags ?? []), ...(meal.tags ?? [])].slice(0, 2)

  return (
    <div
      className="w-40 h-52 flex-shrink-0 snap-start rounded-2xl overflow-hidden border border-border/40 bg-card cursor-pointer active:opacity-80 transition-opacity"
      onClick={onClick}
    >
      {/* Image / placeholder */}
      <div className="relative h-24 w-full">
        {meal.image_url ? (
          <img
            src={meal.image_url}
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
      </div>

      {/* Info */}
      <div className="p-2.5 flex flex-col gap-1.5 h-[calc(100%-6rem)]">
        <p className="font-semibold text-sm text-foreground truncate leading-tight">{meal.name}</p>
        {meal.calories != null && (
          <p className="text-xs text-muted-foreground">{meal.calories} kcal</p>
        )}
        {displayTags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-auto">
            {displayTags.map(tag => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
