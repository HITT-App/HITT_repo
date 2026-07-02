import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Analytics } from '@/lib/analytics'
import { useAuth } from '@/hooks/useAuth'
import { recordActiveDay } from '@/lib/activeDay'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Search, X, Sparkles, Camera, ScanBarcode, Mic,
  UtensilsCrossed, ArrowRight, Check, Loader2, History, Star,
  Plus, Minus,
} from 'lucide-react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight'
import { startOfDay, endOfDay } from 'date-fns'

type FoodItem = {
  id: string
  name: string
  sub: string
  calories: number
  protein: number
  carbs: number
  fat: number
  tag: 'recent' | 'frequent' | 'custom'
  count?: number
  when?: string
}

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

function relativeTime(iso: string) {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000
  if (h < 24) return 'Today'
  if (h < 48) return 'Yest.'
  return `${Math.floor(h / 24)}d ago`
}

export default function LogMeal() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const keyboardHeight = useKeyboardHeight()

  const prefill = location.state?.recipe as {
    name: string
    calories: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
  } | undefined

  const [meal, setMeal] = useState(
    () => new URLSearchParams(location.search).get('category') || 'breakfast'
  )
  const [query, setQuery] = useState('')
  const [sel, setSel] = useState<Record<string, number>>(() =>
    prefill ? { 'prefill-0': 1 } : {}
  )
  const [foods, setFoods] = useState<FoodItem[]>(() =>
    prefill
      ? [{
          id: 'prefill-0',
          name: prefill.name,
          sub: 'From recipe',
          calories: prefill.calories ?? 0,
          protein: prefill.protein_g ?? 0,
          carbs: prefill.carbs_g ?? 0,
          fat: prefill.fat_g ?? 0,
          tag: 'custom',
        }]
      : []
  )
  const [todayConsumed, setTodayConsumed] = useState(0)
  const [dailyTarget, setDailyTarget] = useState(2000)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [describeOpen, setDescribeOpen] = useState(false)
  const [describeText, setDescribeText] = useState('')
  const [describeEstimating, setDescribeEstimating] = useState(false)
  const [describeResult, setDescribeResult] = useState<{
    name: string; calories: number; protein: number; carbs: number; fat: number
  } | null>(null)

  useEffect(() => {
    if (!user) return
    fetchTodayStats()
    fetchFoodHistory()
  }, [user])

  const fetchTodayStats = async () => {
    const [goalsRes, prefsRes, logsRes] = await Promise.all([
      supabase.from('nutrition_goals').select('daily_calories').eq('user_id', user!.id).single(),
      supabase.from('nutrition_profiles').select('daily_calorie_target').eq('user_id', user!.id).maybeSingle(),
      supabase
        .from('meal_logs')
        .select('calories')
        .eq('user_id', user!.id)
        .is('deleted_at', null)
        .gte('logged_at', startOfDay(new Date()).toISOString())
        .lte('logged_at', endOfDay(new Date()).toISOString()),
    ])

    if (prefsRes.data?.daily_calorie_target) {
      setDailyTarget(prefsRes.data.daily_calorie_target)
    } else if (goalsRes.data?.daily_calories) {
      setDailyTarget(goalsRes.data.daily_calories)
    }

    setTodayConsumed(
      (logsRes.data || []).reduce((sum, l) => sum + (l.calories || 0), 0)
    )
  }

  const fetchFoodHistory = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('meal_logs')
      .select('custom_name, calories, protein_grams, carbs_grams, fat_grams, category, logged_at')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
      .not('custom_name', 'is', null)
      .order('logged_at', { ascending: false })
      .limit(100)

    if (!data) { setLoading(false); return }

    const seenRecent = new Set<string>()
    const recentItems: FoodItem[] = []

    for (const row of data) {
      const name = row.custom_name!
      if (seenRecent.has(name)) continue
      seenRecent.add(name)
      if (recentItems.length >= 4) break
      recentItems.push({
        id: `recent:${name}`,
        name,
        sub: MEAL_LABELS[row.category] || row.category,
        calories: row.calories || 0,
        protein: row.protein_grams || 0,
        carbs: row.carbs_grams || 0,
        fat: row.fat_grams || 0,
        tag: 'recent',
        when: relativeTime(row.logged_at),
      })
    }

    const freq: Record<string, {
      count: number; calories: number; protein: number; carbs: number; fat: number; category: string
    }> = {}
    for (const row of data) {
      const name = row.custom_name!
      if (!freq[name]) freq[name] = {
        count: 0,
        calories: row.calories || 0,
        protein: row.protein_grams || 0,
        carbs: row.carbs_grams || 0,
        fat: row.fat_grams || 0,
        category: row.category,
      }
      freq[name].count++
    }

    const freqItems: FoodItem[] = Object.entries(freq)
      .filter(([name]) => !seenRecent.has(name))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([name, d]) => ({
        id: `freq:${name}`,
        name,
        sub: MEAL_LABELS[d.category] || d.category,
        calories: d.calories,
        protein: d.protein,
        carbs: d.carbs,
        fat: d.fat,
        tag: 'frequent' as const,
        count: d.count,
      }))

    setFoods(prev => {
      const customs = prev.filter(f => f.tag === 'custom')
      return [...customs, ...recentItems, ...freqItems]
    })
    setLoading(false)
  }

  const add = (f: FoodItem) => setSel(s => ({ ...s, [f.id]: (s[f.id] || 0) + 1 }))
  const remove = (f: FoodItem) => setSel(s => {
    const n = (s[f.id] || 0) - 1
    const next = { ...s }
    if (n <= 0) delete next[f.id]; else next[f.id] = n
    return next
  })

  const q = query.trim().toLowerCase()
  const visibleFoods = foods.filter(f => f.tag !== 'custom' || sel[f.id])
  const filtered = q ? visibleFoods.filter(f => f.name.toLowerCase().includes(q)) : visibleFoods
  const recents = filtered.filter(f => f.tag === 'recent' || f.tag === 'custom')
  const frequents = filtered.filter(f => f.tag === 'frequent')

  const totalItems = Object.values(sel).reduce((a, c) => a + c, 0)
  const selEntries = Object.entries(sel)
    .map(([id, count]) => ({ food: foods.find(f => f.id === id), count }))
    .filter((x): x is { food: FoodItem; count: number } => !!x.food)
  const addedKcal = selEntries.reduce((a, { food, count }) => a + food.calories * count, 0)
  const addedProtein = selEntries.reduce((a, { food, count }) => a + food.protein * count, 0)

  const consumedPct = Math.min(100, (todayConsumed / dailyTarget) * 100)
  const projectedPct = Math.min(100, ((todayConsumed + addedKcal) / dailyTarget) * 100)
  const remaining = Math.max(0, dailyTarget - todayConsumed - addedKcal)
  const isOver = todayConsumed + addedKcal > dailyTarget

  const handleAddToDiary = async () => {
    if (!user || selEntries.length === 0) return
    setSubmitting(true)
    try {
      const rows = selEntries.map(({ food, count }) => ({
        user_id: user.id,
        custom_name: food.name,
        category: meal,
        calories: Math.round(food.calories * count),
        protein_grams: Math.round(food.protein * count),
        carbs_grams: Math.round(food.carbs * count),
        fat_grams: Math.round(food.fat * count),
        servings: count,
        logged_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('meal_logs').insert(rows)
      if (error) throw error
      recordActiveDay(supabase, user.id).catch(() => {})
      Analytics.mealLogged('manual')
      setShowSuccess(true)
      setTimeout(() => navigate('/nutrition-dashboard'), 1700)
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log meals' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDescribeEstimate = async () => {
    if (!describeText.trim()) return
    setDescribeEstimating(true)
    try {
      const { data, error } = await supabase.functions.invoke('smart-insights', {
        body: { type: 'nutrition-estimate', mealName: describeText, mealDescription: '' },
      })
      if (error || !data?.nutrition) throw new Error()
      const n = data.nutrition
      setDescribeResult({
        name: describeText,
        calories: Math.round(n.calories) || 0,
        protein: Math.round(n.protein_g) || 0,
        carbs: Math.round(n.carbs_g) || 0,
        fat: Math.round(n.fat_g) || 0,
      })
    } catch {
      toast({ variant: 'destructive', title: 'Estimate failed', description: 'Try being more specific.' })
    } finally {
      setDescribeEstimating(false)
    }
  }

  const handleDescribeConfirm = () => {
    if (!describeResult) return
    const id = `custom:${Date.now()}`
    const newFood: FoodItem = {
      id,
      name: describeResult.name,
      sub: MEAL_LABELS[meal] || meal,
      calories: describeResult.calories,
      protein: describeResult.protein,
      carbs: describeResult.carbs,
      fat: describeResult.fat,
      tag: 'custom',
    }
    setFoods(prev => [newFood, ...prev])
    setSel(prev => ({ ...prev, [id]: 1 }))
    setDescribeOpen(false)
    setDescribeText('')
    setDescribeResult(null)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header
        className="shrink-0 bg-background border-b border-border/60"
      >
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground text-[15px] font-medium"
          >
            Cancel
          </button>
          <span className="text-[16.5px] font-bold tracking-tight">Add Food</span>
          <div className="flex items-center gap-1.5 bg-muted/40 border border-border/60 rounded-full px-3 py-1">
            <span className="text-[12.5px] font-semibold">Today</span>
          </div>
        </div>

        {/* Meal-type segmented control */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
            {MEALS.map(m => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={cn(
                  'flex-1 h-[34px] rounded-lg text-[12.5px] font-semibold tracking-tight transition-all touch-manipulation',
                  m === meal
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                {MEAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: totalItems ? 200 : 48 }}
      >
        {/* Budget strip */}
        <div className="mx-4 mt-4 bg-card border border-border/50 rounded-2xl p-3.5">
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-[12.5px]">
              <span className="text-foreground font-bold">
                {(todayConsumed + addedKcal).toLocaleString()}
              </span>
              <span className="text-muted-foreground/60"> / {dailyTarget.toLocaleString()} kcal</span>
            </span>
            <span className={cn('text-[12.5px] font-semibold', isOver ? 'text-sky-400' : 'text-primary')}>
              {isOver
                ? `${(todayConsumed + addedKcal - dailyTarget).toLocaleString()} over`
                : `${remaining.toLocaleString()} left`}
            </span>
          </div>
          <div className="relative h-[7px] rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'absolute inset-y-0 left-0 rounded-full transition-all duration-300',
                isOver ? 'bg-sky-400/40' : 'bg-primary/30'
              )}
              style={{ width: `${projectedPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              style={{ width: `${consumedPct}%` }}
            />
          </div>
          {addedKcal > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground/60">
              <span className="w-[7px] h-[7px] rounded-full bg-primary/30 shrink-0" />
              adding <span className="text-primary font-semibold ml-1">+{addedKcal.toLocaleString()} kcal</span>
              <span className="ml-0.5">this meal</span>
            </div>
          )}
        </div>

        {/* Quick add chips */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground/40 mb-2.5 px-0.5">
            Quick add
          </p>
          <div className="flex gap-2">
            {[
              { icon: Sparkles, label: 'Describe', accent: true,  onClick: () => setDescribeOpen(true) },
              { icon: Camera,    label: 'Snap',     accent: false, onClick: () => navigate('/meal-scanner') },
              { icon: ScanBarcode, label: 'Barcode', accent: false, onClick: () => navigate('/barcode-scanner') },
              { icon: Mic,       label: 'Voice',    accent: false, onClick: () => {
                  // Voice-log flow reuses the Jarvis pipeline: the assistant's
                  // `log_food` tool + LOG_FOOD marker already exist and write via
                  // useAI.logFoodSilent. We just open Jarvis with a prompt that
                  // primes it to listen for the food description.
                  window.dispatchEvent(new CustomEvent('hitt:open-jarvis', {
                    detail: { prefillMessage: "What did you just eat? Tell me the item and roughly how much — I'll estimate the calories and macros and log it for you." },
                  }));
                } },
            ].map(({ icon: Icon, label, accent, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className={cn(
                  'flex-1 min-w-0 border rounded-[15px] py-3 flex flex-col items-center gap-1.5 touch-manipulation active:scale-[0.97] transition-transform',
                  accent
                    ? 'bg-primary/10 border-primary/25'
                    : 'bg-card border-border/50'
                )}
              >
                <Icon
                  className={cn('w-[21px] h-[21px]', accent ? 'text-primary' : 'text-foreground')}
                  strokeWidth={2.05}
                />
                <span className={cn('text-[11px] font-semibold', accent ? 'text-primary' : 'text-muted-foreground')}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-3.5 pb-1.5">
          <div className="flex items-center gap-2.5 bg-card border border-border/50 rounded-[13px] px-3.5 h-[46px]">
            <Search className="w-[18px] h-[18px] text-muted-foreground/50 shrink-0" strokeWidth={2.1} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your food history…"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-foreground text-[14.5px] placeholder:text-muted-foreground/35"
            />
            {query && (
              <button onClick={() => setQuery('')} className="shrink-0">
                <X className="w-4 h-4 text-muted-foreground/50" strokeWidth={2.2} />
              </button>
            )}
          </div>
        </div>

        {/* Food lists */}
        <div className="px-1.5 pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 && !query ? (
            <div className="text-center py-12 px-6">
              <UtensilsCrossed className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" strokeWidth={1.8} />
              <p className="text-sm font-medium text-muted-foreground">No food history yet</p>
              <p className="text-xs mt-1 text-muted-foreground/50">
                Tap <span className="text-primary font-semibold">Describe</span> to add your first meal
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Search className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" strokeWidth={1.8} />
              <p className="text-sm font-medium text-muted-foreground">No matches for "{query}"</p>
              <p className="text-xs mt-2 text-muted-foreground/50">
                Try{' '}
                <button onClick={() => setDescribeOpen(true)} className="text-primary font-semibold">
                  Describe
                </button>{' '}
                — tell HIIT what you ate
              </p>
            </div>
          ) : (
            <>
              {recents.length > 0 && (
                <FoodSection title="Recent" icon="recent" items={recents} sel={sel} add={add} remove={remove} />
              )}
              {frequents.length > 0 && (
                <FoodSection title="Frequent" icon="frequent" items={frequents} sel={sel} add={add} remove={remove} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Selection tray */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-0 z-30 px-4 transition-transform duration-300 ease-out',
          totalItems ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, 0px) + 24px)' }}
      >
        <div className="bg-card border border-border/60 rounded-[18px] p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[13px] bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0 relative">
              <UtensilsCrossed className="w-[19px] h-[19px] text-primary" strokeWidth={2.1} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-primary text-[11px] font-black text-primary-foreground flex items-center justify-center border-2 border-card">
                  {totalItems}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14.5px] font-bold tracking-tight">
                {addedKcal.toLocaleString()} kcal · {MEAL_LABELS[meal]}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalItems} item{totalItems !== 1 ? 's' : ''} · {Math.round(addedProtein)}g protein
              </p>
            </div>
            <button
              onClick={handleAddToDiary}
              disabled={submitting}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground font-bold text-[14px] rounded-[13px] h-[46px] px-4 shrink-0 shadow-[0_6px_20px_rgba(249,115,22,0.32)] active:scale-[0.97] transition-transform touch-manipulation disabled:opacity-70"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><span>Add to diary</span> <ArrowRight className="w-[17px] h-[17px]" strokeWidth={2.5} /></>}
            </button>
          </div>
        </div>
      </div>

      {/* Success overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background/70 backdrop-blur-md transition-opacity duration-300',
          showSuccess ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className={cn(
            'w-[76px] h-[76px] rounded-full bg-primary flex items-center justify-center shadow-[0_10px_36px_rgba(249,115,22,0.45)] transition-transform duration-300',
            showSuccess ? 'scale-100' : 'scale-75'
          )}
        >
          <Check className="w-9 h-9 text-primary-foreground" strokeWidth={3} />
        </div>
        <div className="text-center">
          <p className="text-[17px] font-bold">Logged to {MEAL_LABELS[meal]}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {addedKcal.toLocaleString()} kcal added to today
          </p>
        </div>
      </div>

      {/* Describe drawer */}
      <Drawer
        open={describeOpen}
        onOpenChange={open => {
          if (!open) {
            setDescribeOpen(false)
            setDescribeResult(null)
          }
        }}
      >
        <DrawerContent>
          {/* Push the whole sheet up by the keyboard height so the textarea
              + AI Estimate button stay visible above the on-screen keyboard.
              Native only — on web the keyboard is separate from the layout. */}
          <div
            className="px-5 pt-5 pb-8 space-y-4"
            style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : undefined }}
          >
            <div>
              <p className="text-base font-bold mb-1">Describe what you ate</p>
              <p className="text-sm text-muted-foreground">
                Coach HIIT will estimate the nutrition for you.
              </p>
            </div>

            <textarea
              value={describeText}
              onChange={e => setDescribeText(e.target.value)}
              onFocus={e => {
                // On iOS Capacitor, the keyboardWillShow event fires just
                // after focus. Scroll the textarea into view so the top of
                // the drawer content sits above the keyboard immediately.
                setTimeout(() => e.currentTarget?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 100)
              }}
              placeholder="e.g. Large bowl of chicken fried rice with vegetables"
              rows={3}
              className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none outline-none focus:border-primary/50"
            />

            {!describeResult ? (
              <button
                onClick={handleDescribeEstimate}
                disabled={describeEstimating || !describeText.trim()}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform touch-manipulation"
              >
                {describeEstimating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Estimating…</>
                  : <><Sparkles className="w-4 h-4" /> Estimate with AI</>}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold truncate">{describeResult.name}</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Cal',    value: String(describeResult.calories), color: 'text-primary' },
                      { label: 'Protein', value: `${describeResult.protein}g`, color: 'text-orange-400' },
                      { label: 'Carbs',  value: `${describeResult.carbs}g`,   color: 'text-yellow-400' },
                      { label: 'Fat',    value: `${describeResult.fat}g`,     color: 'text-sky-400' },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <p className={cn('text-base font-bold', color)}>{value}</p>
                        <p className="text-[11px] text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDescribeResult(null)}
                    className="flex-1 h-11 rounded-xl border border-border text-sm font-medium active:bg-muted transition-colors"
                  >
                    Re-estimate
                  </button>
                  <button
                    onClick={handleDescribeConfirm}
                    className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-[0.98] transition-transform"
                  >
                    Add to selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

type FoodSectionProps = {
  icon: 'recent' | 'frequent'
  title: string
  items: FoodItem[]
  sel: Record<string, number>
  add: (f: FoodItem) => void
  remove: (f: FoodItem) => void
}

function FoodSection({ icon, title, items, sel, add, remove }: FoodSectionProps) {
  return (
    <div className="mb-1.5">
      <div className="flex items-center gap-1.5 px-3.5 py-3">
        {icon === 'recent'
          ? <History className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={2.2} />
          : <Star className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={2.2} />}
        <span className="text-xs font-bold tracking-[0.04em] uppercase text-muted-foreground/50">
          {title}
        </span>
      </div>
      {items.map(food => (
        <FoodRow key={food.id} food={food} count={sel[food.id] || 0} add={add} remove={remove} />
      ))}
    </div>
  )
}

type FoodRowProps = {
  food: FoodItem
  count: number
  add: (f: FoodItem) => void
  remove: (f: FoodItem) => void
}

function FoodRow({ food, count, add, remove }: FoodRowProps) {
  const selected = count > 0
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-colors',
        selected ? 'bg-primary/5' : ''
      )}
    >
      {/* Thumb */}
      <div
        className={cn(
          'w-[46px] h-[46px] rounded-[13px] shrink-0 flex items-center justify-center border',
          selected ? 'bg-primary/10 border-primary/25' : 'bg-muted/40 border-border/40'
        )}
      >
        <UtensilsCrossed
          className={cn('w-5 h-5', selected ? 'text-primary' : 'text-muted-foreground/50')}
          strokeWidth={2}
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-tight truncate">{food.name}</span>
        </div>
        <div className="text-xs text-muted-foreground/60 mt-0.5 truncate">
          {food.sub}{food.when ? ` · ${food.when}` : food.count ? ` · ×${food.count}` : ''}{' '}
          · <span className="text-muted-foreground font-semibold">{food.calories} kcal</span>
        </div>
        <div className="flex gap-3 mt-1.5">
          <MacroPip value={food.protein} color="text-orange-400" label="P" />
          <MacroPip value={food.carbs} color="text-yellow-400" label="C" />
          <MacroPip value={food.fat} color="text-sky-400" label="F" />
        </div>
      </div>

      {/* Add control */}
      {!selected ? (
        <button
          onClick={() => add(food)}
          className="w-[38px] h-[38px] rounded-xl shrink-0 flex items-center justify-center bg-muted/40 border border-border/50 active:scale-90 transition-transform touch-manipulation"
        >
          <Plus className="w-[19px] h-[19px] text-foreground" strokeWidth={2.4} />
        </button>
      ) : (
        <div className="flex items-center gap-0.5 shrink-0 bg-muted/40 border border-border/50 rounded-xl h-[38px] px-1">
          <button
            onClick={() => remove(food)}
            className="w-[28px] h-[28px] rounded-lg flex items-center justify-center active:bg-muted transition-colors touch-manipulation"
          >
            <Minus className="w-4 h-4 text-muted-foreground/60" strokeWidth={2.4} />
          </button>
          <span className="min-w-[18px] text-center text-sm font-bold text-primary">{count}</span>
          <button
            onClick={() => add(food)}
            className="w-[28px] h-[28px] rounded-lg flex items-center justify-center active:bg-muted transition-colors touch-manipulation"
          >
            <Plus className="w-4 h-4 text-primary" strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  )
}

function MacroPip({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', color.replace('text-', 'bg-'))} />
      <span className="text-[11.5px] text-muted-foreground/60 font-medium">
        <span className={cn('font-bold', color)}>{value}g</span> {label}
      </span>
    </span>
  )
}
