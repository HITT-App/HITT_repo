import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const DIETARY_STYLES = [
  { value: 'unrestricted', label: 'No restrictions' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'gluten-free', label: 'Gluten-free' },
  { value: 'dairy-free', label: 'Dairy-free' },
]

const ALLERGENS = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'nuts', label: 'Nuts' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'soy', label: 'Soy' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'fish', label: 'Fish' },
]

interface JarvisDietaryPrefsCardProps {
  onSaved: () => void
  onSkip: () => void
}

export function JarvisDietaryPrefsCard({ onSaved, onSkip }: JarvisDietaryPrefsCardProps) {
  const [selectedStyle, setSelectedStyle] = useState('unrestricted')
  const [selectedAllergens, setSelectedAllergens] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const toggleAllergen = (value: string) => {
    setSelectedAllergens(prev => {
      const next = new Set(prev)
      next.has(value) ? next.delete(value) : next.add(value)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('nutrition_profiles').upsert(
        {
          user_id: user.id,
          food_preferences: [selectedStyle],
          allergies: Array.from(selectedAllergens),
          onboarding_completed: true,
        } as any,
        { onConflict: 'user_id' },
      )
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-accent/10 border border-accent/30 rounded-2xl px-4 py-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Dietary requirements</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          I need this before I can build a meal plan for you
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Dietary style
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_STYLES.map(style => (
            <button
              key={style.value}
              type="button"
              onClick={() => setSelectedStyle(style.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                selectedStyle === style.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary',
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Allergies &amp; intolerances
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALLERGENS.map(allergen => (
            <button
              key={allergen.value}
              type="button"
              onClick={() => toggleAllergen(allergen.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                selectedAllergens.has(allergen.value)
                  ? 'bg-destructive/20 text-destructive ring-1 ring-destructive/40'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary',
              )}
            >
              {allergen.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Tap to select — leave blank if none</p>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" className="flex-1 h-9 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 h-9 text-xs text-muted-foreground"
          onClick={onSkip}
          disabled={saving}
        >
          Skip for now
        </Button>
      </div>
    </div>
  )
}
