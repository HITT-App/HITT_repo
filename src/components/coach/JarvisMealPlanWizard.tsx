import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { Flame, Beef, Wheat, Droplets, ChefHat, ArrowLeft, X, Sparkles, Utensils } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'scope' | 'calories' | 'macros' | 'amounts' | 'source' | 'review'
type Scope = 'meal' | 'day'

interface SavedDefaults {
  scope: Scope
  calories: number
  macros: { protein: boolean; carbs: boolean; fat: boolean }
  proteinG: number | null
  carbsG: number | null
  fatG: number | null
  proteinSources: string[]
  proteinFreeText: string
  mealsCount: number
}

interface JarvisMealPlanWizardProps {
  onSubmit: (prompt: string) => void
  onCancel: () => void
}

// Normalise diet prefs to lowercase — the Nutrition Dashboard saves "Vegetarian"
// (capitalised) while older flows use "vegetarian". Match case-insensitively.
const normDiet = (d: string[]) => new Set(d.map(x => String(x ?? '').toLowerCase().trim()))
const isVegan       = (d: string[]) => normDiet(d).has('vegan')
const isVegetarian  = (d: string[]) => { const n = normDiet(d); return n.has('vegetarian') || n.has('vegan') }
const isPescatarian = (d: string[]) => { const n = normDiet(d); return n.has('pescatarian') || n.has('pescetarian') }

const SOURCE_OPTIONS: Array<{ value: string; label: string; allowed: (diet: string[]) => boolean }> = [
  { value: 'lean',  label: 'Lean meat (chicken, turkey)',     allowed: (d) => !isVegetarian(d) && !isPescatarian(d) },
  { value: 'red',   label: 'Red meat (beef, lamb)',           allowed: (d) => !isVegetarian(d) && !isPescatarian(d) },
  { value: 'fish',  label: 'Fish & seafood',                  allowed: (d) => !isVegan(d) && (!isVegetarian(d) || isPescatarian(d)) },
  { value: 'plant', label: 'Plant-based (tofu, legumes, …)',  allowed: () => true },
]

export function JarvisMealPlanWizard({ onSubmit, onCancel }: JarvisMealPlanWizardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Wizard state
  const [step, setStep] = useState<Step>('scope')
  const [scope, setScope] = useState<Scope | null>(null)
  const [calories, setCalories] = useState<number | null>(null)
  const [macros, setMacros] = useState({ protein: true, carbs: false, fat: false })
  const [proteinG, setProteinG] = useState<number | null>(null)
  const [carbsG, setCarbsG] = useState<number | null>(null)
  const [fatG, setFatG] = useState<number | null>(null)
  const [proteinSources, setProteinSources] = useState<string[]>([])
  const [proteinFreeText, setProteinFreeText] = useState('')
  const [saveAsDefaults, setSaveAsDefaults] = useState(false)

  // Profile data
  const [userId, setUserId] = useState<string | null>(null)
  const [remainingToday, setRemainingToday] = useState<number | null>(null)
  const [dailyTarget, setDailyTarget] = useState<number | null>(null)
  const [weightKg, setWeightKg] = useState<number | null>(null)
  const [dietPrefs, setDietPrefs] = useState<string[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [defaults, setDefaults] = useState<SavedDefaults | null>(null)
  const [proteinTypeError, setProteinTypeError] = useState<string | null>(null)

  // Load profile + saved defaults on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: profile }, { data: nutrition }, { data: logs }] = await Promise.all([
        (supabase as any).from('profiles').select('weight_kg').eq('user_id', user.id).maybeSingle(),
        (supabase as any).from('nutrition_profiles')
          .select('food_preferences, allergies, daily_calorie_target, meal_plan_defaults')
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any).from('meal_logs')
          .select('calories')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .gte('logged_at', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()),
      ])

      if (profile?.weight_kg) setWeightKg(profile.weight_kg)
      if (nutrition?.food_preferences) setDietPrefs(nutrition.food_preferences as string[])
      if (nutrition?.allergies) setAllergies(nutrition.allergies as string[])
      if (nutrition?.daily_calorie_target) setDailyTarget(nutrition.daily_calorie_target)
      if (nutrition?.meal_plan_defaults) setDefaults(nutrition.meal_plan_defaults as SavedDefaults)

      const consumed = (logs ?? []).reduce((s: number, r: any) => s + (r.calories ?? 0), 0)
      const dailyCal = nutrition?.daily_calorie_target ?? 2000
      setRemainingToday(Math.max(0, dailyCal - consumed))
    })()
  }, [])

  // Scroll the wizard into view whenever the step changes — it renders inline
  // in the conversation and frequently lands below the fold otherwise.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [step])

  // Apply saved defaults — jumps to review
  const useDefaults = () => {
    if (!defaults) return
    setScope(defaults.scope)
    setCalories(defaults.calories)
    setMacros(defaults.macros)
    setProteinG(defaults.proteinG)
    setCarbsG(defaults.carbsG)
    setFatG(defaults.fatG)
    setProteinSources(defaults.proteinSources)
    setProteinFreeText(defaults.proteinFreeText ?? '')
    setStep('review')
  }

  // Validation: does the free-text protein conflict with diet prefs?
  const validateFreeText = (text: string) => {
    if (!text.trim()) return null
    const lower = text.toLowerCase()
    const animalWords = ['chicken','beef','pork','lamb','fish','salmon','tuna','steak','bacon','duck','turkey']
    if (isVegetarian(dietPrefs)) {
      const hit = animalWords.find(w => lower.includes(w))
      if (hit) return `"${hit}" isn't compatible with your ${isVegan(dietPrefs) ? 'vegan' : 'vegetarian'} preferences.`
    }
    return null
  }

  const handleSubmit = async () => {
    // Save defaults if requested
    if (saveAsDefaults && userId) {
      const payload: SavedDefaults = {
        scope: scope!, calories: calories!, macros,
        proteinG, carbsG, fatG, proteinSources, proteinFreeText,
        mealsCount: 3,
      }
      try {
        await (supabase as any).from('nutrition_profiles').upsert(
          { user_id: userId, meal_plan_defaults: payload },
          { onConflict: 'user_id' },
        )
      } catch { /* non-fatal */ }
    }

    // Compose an explicit-macro prompt that the ai-coach regex fast-path will catch.
    // The wizard collects PER-MEAL macros. For day-mode we multiply by 3 so the
    // extractor sees day totals (it divides by 3 again on the server). For
    // single-meal mode we send per-meal values as-is.
    const multiplier = scope === 'day' ? 3 : 1
    const parts: string[] = []
    parts.push(scope === 'meal' ? 'Suggest one meal' : 'Give me a meal plan for the day')
    if (calories) parts.push(`with ${calories} calories`)
    if (macros.protein && proteinG) parts.push(`${proteinG * multiplier}g of protein`)
    if (macros.carbs && carbsG) parts.push(`${carbsG * multiplier}g of carbs`)
    if (macros.fat && fatG) parts.push(`${fatG * multiplier}g of fat`)
    if (proteinFreeText.trim()) parts.push(`featuring ${proteinFreeText.trim()}`)
    else if (proteinSources.length) {
      const labels = proteinSources.map(s => SOURCE_OPTIONS.find(o => o.value === s)?.label ?? s).join(', ')
      parts.push(`using ${labels}`)
    }
    onSubmit(parts.join(' '))
  }

  // ─── Shared UI helpers ───
  const Header = ({ icon: Icon, eyebrow, title, subtext, canBack = step !== 'scope' }: {
    icon: any; eyebrow: string; title: string; subtext?: string; canBack?: boolean
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {canBack ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        ) : <div className="w-8" />}
        <Icon className="w-5 h-5 text-primary" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase text-center">{eyebrow}</p>
      <h3 className="text-base font-bold text-foreground text-center">{title}</h3>
      {subtext && <p className="text-xs text-muted-foreground text-center">{subtext}</p>}
    </div>
  )

  const Chip = ({ label, selected, onClick }: { label: string; selected?: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        'h-10 rounded-xl border text-sm font-medium transition-colors',
        selected
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-secondary text-foreground border-border/40 active:opacity-70',
      )}
    >{label}</button>
  )

  const goBack = () => {
    if (step === 'calories') setStep('scope')
    else if (step === 'macros') setStep('calories')
    else if (step === 'amounts') setStep('macros')
    else if (step === 'source') setStep('amounts')
    else if (step === 'review') setStep(scope === 'day' && !macros.protein && proteinSources.length === 0 ? 'amounts' : 'source')
  }

  // ─── Step renders ───
  if (step === 'scope') {
    return (
      <div ref={containerRef} className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-4">
        <Header icon={Utensils} eyebrow="Plan your food" title="What are you looking for?" />
        {defaults && (
          <Button variant="outline" className="w-full h-11 rounded-xl gap-2" onClick={useDefaults}>
            <Sparkles className="w-4 h-4 text-primary" />
            Use my saved defaults
          </Button>
        )}
        <div className="space-y-2">
          <Button
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground justify-between"
            onClick={() => { setScope('meal'); setStep('calories') }}
          >
            <span>One meal suggestion</span><span>→</span>
          </Button>
          <Button
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground justify-between"
            onClick={() => { setScope('day'); setStep('calories') }}
          >
            <span>Full day meal plan</span><span>→</span>
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'calories') {
    const isMeal = scope === 'meal'
    const chips = isMeal
      ? [300, 500, 700, remainingToday ?? 600].filter((v, i, a) => a.indexOf(v) === i)
      : [1800, 2000, dailyTarget ?? 2500, 3000].filter((v, i, a) => a.indexOf(v) === i)
    const helper = isMeal
      ? remainingToday != null
        ? `You have ${remainingToday} kcal remaining today.`
        : 'How big do you want this one to be?'
      : dailyTarget
        ? `Your usual target is ${dailyTarget} kcal.`
        : 'A balanced day is typically 1800–2500 kcal.'

    return (
      <div ref={containerRef} className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-4">
        <Header icon={Flame} eyebrow={isMeal ? 'Calorie budget' : 'Daily calorie target'}
          title={isMeal ? 'How many calories for this meal?' : 'How many calories for the day?'}
          subtext={helper} />
        <div className="grid grid-cols-4 gap-2">
          {chips.map(v => (
            <Chip key={v} label={`${v}`} selected={calories === v} onClick={() => setCalories(v)} />
          ))}
        </div>
        <input
          type="number" placeholder="Or enter custom kcal"
          value={calories ?? ''} onChange={e => setCalories(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full h-11 px-3 rounded-xl border border-border/40 bg-secondary text-foreground"
        />
        <Button
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground"
          disabled={!calories}
          onClick={() => setStep('macros')}
        >Continue →</Button>
      </div>
    )
  }

  if (step === 'macros') {
    const toggle = (k: 'protein' | 'carbs' | 'fat') =>
      setMacros(m => ({ ...m, [k]: !m[k] }))
    const anyChecked = macros.protein || macros.carbs || macros.fat
    return (
      <div ref={containerRef} className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-4">
        <Header icon={Beef} eyebrow="Macro targets" title="Want to target macros?" subtext="Pick any that matter for this plan." />
        <div className="space-y-2">
          {([
            { key: 'protein', label: 'Protein', icon: Beef },
            { key: 'carbs',   label: 'Carbs',   icon: Wheat },
            { key: 'fat',     label: 'Fat',     icon: Droplets },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={cn(
                'w-full h-11 rounded-xl border flex items-center gap-3 px-4 transition-colors',
                macros[key] ? 'bg-primary/20 border-primary' : 'bg-secondary border-border/40',
              )}
            >
              <Icon className="w-4 h-4 text-primary" />
              <span className="flex-1 text-left text-sm font-medium">{label}</span>
              <span className={cn('w-5 h-5 rounded-md border flex items-center justify-center text-[10px]',
                macros[key] ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                {macros[key] && '✓'}
              </span>
            </button>
          ))}
        </div>
        <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground"
          onClick={() => setStep(anyChecked ? 'amounts' : 'review')}>
          {anyChecked ? 'Continue →' : 'Skip macros — balance the day'}
        </Button>
      </div>
    )
  }

  if (step === 'amounts') {
    // Per-meal values. For day-mode, helper text shows the implied daily total.
    const proteinChips = [30, 40, 50, 60]
    const carbChips   = [30, 60, 90, 120]
    const fatChips    = [10, 15, 20, 30]
    const proteinGuide = weightKg
      ? `Guideline: 1.6–2.2 g/kg bodyweight. At ${weightKg} kg → ${Math.round(weightKg * 1.6)}–${Math.round(weightKg * 2.2)}g/day (≈ ${Math.round(weightKg * 1.6 / 3)}–${Math.round(weightKg * 2.2 / 3)}g per meal).`
      : 'Active adults typically target 1.6–2.2 g/kg bodyweight per day.'
    const ready =
      (!macros.protein || proteinG !== null) &&
      (!macros.carbs   || carbsG !== null) &&
      (!macros.fat     || fatG !== null)
    return (
      <div ref={containerRef} className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-4">
        <Header icon={Beef} eyebrow="Macro targets" title="How much of each per meal?"
          subtext={scope === 'day' ? "We'll multiply across 3 meals to hit the day total." : undefined} />
        {macros.protein && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">🥩 Protein</p>
            <p className="text-[11px] text-muted-foreground">{proteinGuide}</p>
            <div className="grid grid-cols-4 gap-2">
              {proteinChips.map(v => <Chip key={v} label={`${v}g`} selected={proteinG === v} onClick={() => setProteinG(v)} />)}
            </div>
            <input type="number" placeholder="Custom g" value={proteinG ?? ''}
              onChange={e => setProteinG(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full h-10 px-3 rounded-xl border border-border/40 bg-secondary text-foreground text-sm" />
          </div>
        )}
        {macros.carbs && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">🌾 Carbs</p>
            <div className="grid grid-cols-4 gap-2">
              {carbChips.map(v => <Chip key={v} label={`${v}g`} selected={carbsG === v} onClick={() => setCarbsG(v)} />)}
            </div>
            <input type="number" placeholder="Custom g" value={carbsG ?? ''}
              onChange={e => setCarbsG(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full h-10 px-3 rounded-xl border border-border/40 bg-secondary text-foreground text-sm" />
          </div>
        )}
        {macros.fat && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">🥑 Fat</p>
            <div className="grid grid-cols-4 gap-2">
              {fatChips.map(v => <Chip key={v} label={`${v}g`} selected={fatG === v} onClick={() => setFatG(v)} />)}
            </div>
            <input type="number" placeholder="Custom g" value={fatG ?? ''}
              onChange={e => setFatG(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="w-full h-10 px-3 rounded-xl border border-border/40 bg-secondary text-foreground text-sm" />
          </div>
        )}
        <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground" disabled={!ready}
          onClick={() => setStep(macros.protein ? 'source' : 'review')}>
          Continue →
        </Button>
      </div>
    )
  }

  if (step === 'source') {
    const allowed = SOURCE_OPTIONS.filter(o => o.allowed(dietPrefs))
    const toggle = (v: string) => {
      setProteinSources(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
    }
    const freeTextError = validateFreeText(proteinFreeText)
    return (
      <div ref={containerRef} className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-4">
        <Header icon={ChefHat} eyebrow="Protein source" title="Any preference for the meals?"
          subtext={dietPrefs.length ? `Filtered by your dietary prefs (${dietPrefs.join(', ')}).` : undefined} />
        <Button
          variant="outline"
          className="w-full h-11 rounded-xl"
          onClick={() => { setProteinSources([]); setProteinFreeText(''); setStep('review') }}
        >Chef's choice (no preference)</Button>
        <div className="space-y-2">
          {allowed.map(opt => (
            <button key={opt.value} onClick={() => toggle(opt.value)}
              className={cn(
                'w-full h-11 rounded-xl border flex items-center gap-3 px-4 text-sm font-medium',
                proteinSources.includes(opt.value)
                  ? 'bg-primary/20 border-primary text-foreground'
                  : 'bg-secondary border-border/40 text-foreground',
              )}>
              <span className="flex-1 text-left">{opt.label}</span>
              {proteinSources.includes(opt.value) && <span className="text-primary">✓</span>}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Or be specific:</p>
          <input
            type="text"
            placeholder="e.g. salmon, paneer, elk"
            value={proteinFreeText}
            onChange={e => { setProteinFreeText(e.target.value); setProteinTypeError(validateFreeText(e.target.value)) }}
            className="w-full h-10 px-3 rounded-xl border border-border/40 bg-secondary text-foreground text-sm"
          />
          {freeTextError && <p className="text-[11px] text-destructive">{freeTextError}</p>}
        </div>
        <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground"
          disabled={!!freeTextError}
          onClick={() => setStep('review')}>
          Continue →
        </Button>
      </div>
    )
  }

  // ─── Review ───
  return (
    <div ref={containerRef} className="bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3 space-y-4">
      <Header icon={Sparkles} eyebrow="Review" title="Here's what I'm finding for you" />
      <ul className="space-y-1 text-sm text-foreground">
        <li>• {scope === 'day' ? 'Full day' : 'One meal'} · {calories} kcal{scope === 'meal' ? '' : ''}</li>
        {macros.protein && proteinG !== null && <li>• Protein target: {proteinG}g per meal</li>}
        {macros.carbs && carbsG !== null && <li>• Carbs target: {carbsG}g per meal</li>}
        {macros.fat && fatG !== null && <li>• Fat target: {fatG}g per meal</li>}
        {proteinFreeText.trim() && <li>• Source: {proteinFreeText}</li>}
        {!proteinFreeText.trim() && proteinSources.length > 0 && (
          <li>• Source: {proteinSources.map(s => SOURCE_OPTIONS.find(o => o.value === s)?.label).filter(Boolean).join(', ')}</li>
        )}
        {dietPrefs.length > 0 && <li>• Dietary prefs respected: {dietPrefs.join(', ')}</li>}
        {allergies.length > 0 && <li>• Excluding allergens: {allergies.join(', ')}</li>}
      </ul>
      <label className="flex items-start gap-2 text-xs cursor-pointer">
        <input type="checkbox" className="mt-0.5"
          checked={saveAsDefaults} onChange={e => setSaveAsDefaults(e.target.checked)} />
        <span className="text-muted-foreground">Save these as my defaults — skip the wizard next time.</span>
      </label>
      <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground" onClick={handleSubmit}>
        Find my meals →
      </Button>
    </div>
  )
}
