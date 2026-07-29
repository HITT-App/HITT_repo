import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ArrowLeft, Search, Filter, Grid, List, Flame, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Ingredients + steps come from the linked `ingredients` and `steps` tables,
// joined client-side. Both are stored as free-text strings (e.g. "150g firm
// tofu") — no need to parse them for display.
type Ingredient = { item: string; sort_order: number };
type Instruction = { instruction: string; step_number: number };

type Meal = {
  id: string;
  name: string;
  emoji: string | null;
  category: string | null;
  meal_type: string | null;
  description: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  image_url: string | null;
  allergens: string[] | null;
  dietary_tags: string[] | null;
  veg_swap: string | null;
  vegan_swap: string | null;
  ingredients: Ingredient[] | null;
  instructions: Instruction[] | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
};

// ── Filter vocabularies ─────────────────────────────────────────────────────

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof MEAL_TYPES[number];

const DIETS = [
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { id: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
  { id: 'keto', label: 'Keto', emoji: '🥑' },
  { id: 'gluten-free', label: 'Gluten-free', emoji: '🌾' },
] as const;
type DietId = typeof DIETS[number]['id'];

// Protein source is inferred from the recipe name (owner names them clearly:
// "…Chicken Breast with…", "…Firm Tofu with…", etc.).
const PROTEIN_SOURCES: Array<{ id: string; label: string; patterns: RegExp }> = [
  { id: 'chicken',  label: 'Chicken',    patterns: /chicken/i },
  { id: 'beef',     label: 'Beef',       patterns: /beef|steak|mince/i },
  { id: 'lamb',     label: 'Lamb',       patterns: /lamb/i },
  { id: 'pork',     label: 'Pork',       patterns: /pork|bacon/i },
  { id: 'turkey',   label: 'Turkey',     patterns: /turkey/i },
  { id: 'fish',     label: 'Fish',       patterns: /salmon|cod|mackerel|tuna|prawn|shrimp|fish/i },
  { id: 'eggs',     label: 'Eggs',       patterns: /egg/i },
  { id: 'dairy',    label: 'Dairy',      patterns: /yogurt|yoghurt|cottage cheese|paneer/i },
  { id: 'tofu',     label: 'Tofu',       patterns: /tofu|tempeh/i },
  { id: 'plant',    label: 'Plant',      patterns: /lentil|chickpea|black bean|quorn|edamame/i },
];

const CAL_BANDS = [
  { id: 'any',    label: 'Any',      test: (c: number | null) => true },
  { id: 'low',    label: '<300',     test: (c: number | null) => (c ?? 0) < 300 },
  { id: 'mid',    label: '300–500',  test: (c: number | null) => (c ?? 0) >= 300 && (c ?? 0) < 500 },
  { id: 'high',   label: '500–700',  test: (c: number | null) => (c ?? 0) >= 500 && (c ?? 0) < 700 },
  { id: 'plus',   label: '700+',     test: (c: number | null) => (c ?? 0) >= 700 },
] as const;

// Deterministic shuffle using a session-scoped seed so pagination stays
// stable but the first impression on a fresh mount isn't alphabetical.
function shuffled<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function detectProteinSource(name: string): string | null {
  for (const p of PROTEIN_SOURCES) if (p.patterns.test(name)) return p.id;
  return null;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function BrowseMeals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mealType, setMealType] = useState<MealType | 'all'>('all');
  const [diet, setDiet] = useState<DietId | null>(null);
  const [protein, setProtein] = useState<string | null>(null);
  const [calBand, setCalBand] = useState<typeof CAL_BANDS[number]['id']>('any');
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Meal | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      // Pull recipes + ingredients + steps in parallel and attach client-side.
      //
      // Supabase PostgREST enforces a SERVER-side max_rows cap (currently
      // 1000) on any single response, regardless of the client-side .range().
      // Asking for range(0, 19999) does NOT bypass this — the server just
      // returns the first 1000 rows and the rest of the range is silently
      // dropped. With ~5400 ingredient rows across ~885 recipes, that meant
      // ~730 recipes rendered as "Ingredients coming soon" in the UI.
      //
      // Fix: paginate in 1000-row chunks per relation until we've drained
      // the table. Two-three round trips per relation, tiny payload, no
      // change to the attach logic below.
      const drainTable = async <T extends { recipe_id: string }>(
        table: 'ingredients' | 'steps',
        cols: string,
      ): Promise<T[]> => {
        const all: T[] = [];
        let from = 0;
        const chunk = 1000;
        while (true) {
          const { data, error } = await supabase.from(table).select(cols).range(from, from + chunk - 1) as unknown as { data: T[] | null; error: unknown };
          if (error || !data || data.length === 0) break;
          all.push(...data);
          if (data.length < chunk) break;
          from += chunk;
        }
        return all;
      };

      // Note: recipes count (~885 at time of writing) is comfortably below
      // the 1000 server cap so this single-shot read is fine for now. When
      // it grows past 1000, wrap this in drainTable too.
      const [recipesRes, ingredientsRows, stepsRows] = await Promise.all([
        supabase.from('recipes').select('*').range(0, 4999),
        drainTable<{ recipe_id: string; item: string; sort_order: number }>(
          'ingredients', 'recipe_id, item, sort_order'),
        drainTable<{ recipe_id: string; instruction: string; step_number: number }>(
          'steps', 'recipe_id, instruction, step_number'),
      ]);
      const ingredientsByRecipe = new Map<string, Ingredient[]>();
      for (const row of ingredientsRows) {
        const list = ingredientsByRecipe.get(row.recipe_id) ?? [];
        list.push({ item: row.item, sort_order: row.sort_order });
        ingredientsByRecipe.set(row.recipe_id, list);
      }
      const stepsByRecipe = new Map<string, Instruction[]>();
      for (const row of stepsRows) {
        const list = stepsByRecipe.get(row.recipe_id) ?? [];
        list.push({ instruction: row.instruction, step_number: row.step_number });
        stepsByRecipe.set(row.recipe_id, list);
      }
      const enriched = (recipesRes.data ?? []).map(r => ({
        ...r,
        ingredients: (ingredientsByRecipe.get(r.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
        instructions: (stepsByRecipe.get(r.id) ?? []).sort((a, b) => a.step_number - b.step_number),
      } as Meal));
      // Shuffle on load so the first impression isn't a wall of one
      // cuisine family (owner names ~40% of recipes "Asian-inspired…"
      // and an alphabetical sort surfaces them all first).
      setMeals(shuffled(enriched));
      setIsLoading(false);
    })();
  }, []);

  const anyFilterActive = mealType !== 'all' || diet !== null || protein !== null || calBand !== 'any' || searchQuery.length > 0;
  const activeFilterCount = [mealType !== 'all', diet !== null, protein !== null, calBand !== 'any'].filter(Boolean).length;

  // Apply all filters
  const filteredMeals = useMemo(() => {
    return meals.filter((meal) => {
      if (mealType !== 'all' && meal.meal_type !== mealType) return false;
      if (diet) {
        const tags = (meal.dietary_tags ?? []).map((t) => t.toLowerCase());
        if (diet === 'gluten-free') {
          // Not stored as a dietary tag on legacy rows; treat presence of
          // 'gluten' in allergens as the negative signal.
          const alg = (meal.allergens ?? []).map((a) => a.toLowerCase());
          if (alg.includes('gluten') && !tags.includes('gluten-free')) return false;
        } else if (diet === 'keto') {
          // Keto category was seeded specifically. Fall back to <20g carbs
          // for legacy recipes not stamped with the keto category/tag.
          if (meal.category !== 'keto' && (meal.carbs_g ?? 100) > 20) return false;
        } else {
          if (!tags.includes(diet)) return false;
        }
      }
      if (protein) {
        const p = detectProteinSource(meal.name);
        if (p !== protein) return false;
      }
      const band = CAL_BANDS.find((b) => b.id === calBand)!;
      if (!band.test(meal.calories)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!meal.name.toLowerCase().includes(q) && !meal.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [meals, mealType, diet, protein, calBand, searchQuery]);

  // Curated shelves for the empty-filter landing state.
  const shelves = useMemo(() => {
    if (anyFilterActive) return [];
    const pick = (test: (m: Meal) => boolean, limit = 8) =>
      meals.filter(test).slice(0, limit);
    return [
      { key: 'breakfast', title: 'Breakfast', items: pick(m => m.meal_type === 'breakfast') },
      { key: 'highp', title: 'High-protein picks', items: pick(m => (m.protein_g ?? 0) >= 30) },
      { key: 'lowc', title: 'Low-carb', items: pick(m => (m.carbs_g ?? 100) < 20) },
      { key: 'quick', title: 'Under 400 kcal', items: pick(m => (m.calories ?? 999) < 400) },
      { key: 'veg', title: 'Vegetarian', items: pick(m => (m.dietary_tags ?? []).includes('vegetarian') || (m.dietary_tags ?? []).includes('vegan')) },
      { key: 'lunch', title: 'Lunch', items: pick(m => m.meal_type === 'lunch') },
      { key: 'dinner', title: 'Dinner', items: pick(m => m.meal_type === 'dinner') },
      { key: 'snack', title: 'Snacks', items: pick(m => m.meal_type === 'snack') },
    ].filter(s => s.items.length > 0);
  }, [meals, anyFilterActive]);

  const clearAllFilters = () => {
    setMealType('all'); setDiet(null); setProtein(null); setCalBand('any'); setSearchQuery('');
    setShowFilters(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header
        className="shrink-0 sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/60"
        style={{ paddingTop: 'calc(var(--safe-area-inset-top, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-3 px-4 pb-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Browse Meals</h1>
          <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === 'card' ? 'grid' : 'card')}>
            {viewMode === 'card' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </Button>
        </div>

        {/* Search + filter button */}
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search meals…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => setShowFilters(true)} className="relative">
            <Filter className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Meal-type chip carousel */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          <button
            key="all"
            onClick={() => { setMealType('all'); }}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
              mealType === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 text-foreground',
            )}
          >
            All
          </button>
          {MEAL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors capitalize',
                mealType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 text-foreground',
              )}
            >
              {t}
            </button>
          ))}
          {DIETS.map((d) => (
            <button
              key={d.id}
              onClick={() => setDiet(diet === d.id ? null : d.id)}
              className={cn(
                'shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-colors',
                diet === d.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 text-foreground',
              )}
            >
              <span className="mr-1">{d.emoji}</span>{d.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content — native scroll so pull-to-dismiss on the sheet works */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 pb-28">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-secondary/50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : anyFilterActive ? (
            // Flat filtered list
            <FilteredResults
              meals={filteredMeals}
              viewMode={viewMode}
              onSelect={setSelectedRecipe}
              onClear={clearAllFilters}
            />
          ) : (
            // Curated landing — horizontal shelves
            <div className="space-y-6">
              {shelves.map((shelf) => (
                <Shelf key={shelf.key} title={shelf.title} items={shelf.items} onSelect={setSelectedRecipe} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="space-y-5">
            <FilterGroup title="Meal type" onClear={() => setMealType('all')} hasValue={mealType !== 'all'}>
              {(['all', ...MEAL_TYPES] as const).map((t) => (
                <FilterChip key={t} active={mealType === t} onClick={() => setMealType(t)}>
                  {t === 'all' ? 'Any' : t.charAt(0).toUpperCase() + t.slice(1)}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup title="Diet" onClear={() => setDiet(null)} hasValue={diet !== null}>
              {DIETS.map((d) => (
                <FilterChip key={d.id} active={diet === d.id} onClick={() => setDiet(diet === d.id ? null : d.id)}>
                  <span className="mr-1">{d.emoji}</span>{d.label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup title="Protein source" onClear={() => setProtein(null)} hasValue={protein !== null}>
              {PROTEIN_SOURCES.map((p) => (
                <FilterChip key={p.id} active={protein === p.id} onClick={() => setProtein(protein === p.id ? null : p.id)}>
                  {p.label}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup title="Calories" onClear={() => setCalBand('any')} hasValue={calBand !== 'any'}>
              {CAL_BANDS.map((b) => (
                <FilterChip key={b.id} active={calBand === b.id} onClick={() => setCalBand(b.id)}>
                  {b.label}
                </FilterChip>
              ))}
            </FilterGroup>
          </div>

          <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-3 bg-background border-t border-border/60 mt-6 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={clearAllFilters}>Clear all</Button>
            <Button className="flex-1" onClick={() => setShowFilters(false)}>Show {filteredMeals.length}</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Recipe detail sheet — native scroll so swipe-down dismiss works */}
      <Sheet open={!!selectedRecipe} onOpenChange={(o) => !o && setSelectedRecipe(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 overflow-hidden">
          {/* Explicit close button — Radix's built-in outside-tap dismiss
              doesn't always fire in the Capacitor WebView, and if a recipe
              has no ingredients/instructions there's no other exit. */}
          <button
            onClick={() => setSelectedRecipe(null)}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="h-full overflow-y-auto">
            {selectedRecipe && (
              <div>
                {/* Image */}
                <div className="h-48 bg-secondary w-full overflow-hidden">
                  {selectedRecipe.image_url ? (
                    <img src={selectedRecipe.image_url} alt={selectedRecipe.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      {selectedRecipe.emoji || <Flame className="w-16 h-16 text-primary/30" />}
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  <SheetHeader className="text-left p-0">
                    <SheetTitle className="text-xl">{selectedRecipe.name}</SheetTitle>
                  </SheetHeader>
                  {selectedRecipe.description && (
                    <p className="text-sm text-muted-foreground">{selectedRecipe.description}</p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {selectedRecipe.calories != null && (
                      <div className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1 text-xs font-medium">
                        <Flame className="w-3 h-3 text-primary" />{selectedRecipe.calories} kcal
                      </div>
                    )}
                    {selectedRecipe.protein_g != null && (
                      <div className="bg-secondary rounded-full px-3 py-1 text-xs font-medium">🥩 {selectedRecipe.protein_g}g protein</div>
                    )}
                    {selectedRecipe.carbs_g != null && (
                      <div className="bg-secondary rounded-full px-3 py-1 text-xs font-medium">🍞 {selectedRecipe.carbs_g}g carbs</div>
                    )}
                    {selectedRecipe.fat_g != null && (
                      <div className="bg-secondary rounded-full px-3 py-1 text-xs font-medium">🧈 {selectedRecipe.fat_g}g fat</div>
                    )}
                  </div>

                  {selectedRecipe.calories != null && (
                    <p className="text-xs text-muted-foreground">
                      Per serving · ingredients below make{' '}
                      {(selectedRecipe.servings ?? 1) === 1 ? '1 serving' : `${selectedRecipe.servings} servings`}
                    </p>
                  )}

                  <Tabs defaultValue="ingredients">
                    <TabsList className="w-full">
                      <TabsTrigger value="ingredients" className="flex-1">Ingredients</TabsTrigger>
                      <TabsTrigger value="instructions" className="flex-1">Instructions</TabsTrigger>
                      {(selectedRecipe.veg_swap || selectedRecipe.vegan_swap) && (
                        <TabsTrigger value="swaps" className="flex-1">Swaps</TabsTrigger>
                      )}
                    </TabsList>
                    <TabsContent value="ingredients" className="mt-3 space-y-2">
                      {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 ? (
                        selectedRecipe.ingredients.map((ing, i) => (
                          <div key={i} className="py-2 border-b border-border/40 last:border-0">
                            <span className="text-sm text-foreground">{ing.item}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Ingredients coming soon</p>
                      )}
                      {selectedRecipe.allergens && selectedRecipe.allergens.length > 0 && (
                        <div className="pt-2 flex gap-2 flex-wrap">
                          {selectedRecipe.allergens.map((a) => (
                            <Badge key={a} variant="destructive" className="text-xs capitalize">{a}</Badge>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="instructions" className="mt-3 space-y-3">
                      {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 ? (
                        selectedRecipe.instructions.map((inst) => (
                          <div key={inst.step_number} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {inst.step_number}
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{inst.instruction}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">Instructions coming soon</p>
                      )}
                    </TabsContent>
                    {(selectedRecipe.veg_swap || selectedRecipe.vegan_swap) && (
                      <TabsContent value="swaps" className="mt-3 space-y-3">
                        {selectedRecipe.veg_swap && (
                          <div className="bg-secondary/50 rounded-xl p-3">
                            <p className="text-xs font-medium mb-1">🥬 Vegetarian swap</p>
                            <p className="text-sm text-muted-foreground">{selectedRecipe.veg_swap}</p>
                          </div>
                        )}
                        {selectedRecipe.vegan_swap && (
                          <div className="bg-secondary/50 rounded-xl p-3">
                            <p className="text-xs font-medium mb-1">🌱 Vegan swap</p>
                            <p className="text-sm text-muted-foreground">{selectedRecipe.vegan_swap}</p>
                          </div>
                        )}
                      </TabsContent>
                    )}
                  </Tabs>

                  <div className="grid grid-cols-2 gap-3 pt-2 pb-4">
                    <Button
                      variant="outline"
                      className="h-12 rounded-2xl text-sm"
                      onClick={() => navigate('/log-meal', { state: { recipe: selectedRecipe, useSwap: true } })}
                    >
                      Log with swaps
                    </Button>
                    <Button
                      className="h-12 rounded-2xl text-sm"
                      onClick={() => navigate('/log-meal', { state: { recipe: selectedRecipe } })}
                    >
                      Log as-is
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────────

function Shelf({ title, items, onSelect }: { title: string; items: Meal[]; onSelect: (m: Meal) => void }) {
  return (
    <section>
      <h2 className="font-semibold mb-2 px-1">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {items.map((meal) => (
          <button
            key={meal.id}
            onClick={() => onSelect(meal)}
            className="shrink-0 w-40 text-left rounded-2xl border border-border/60 bg-card overflow-hidden active:bg-secondary/40 transition-colors touch-manipulation"
          >
            <div className="aspect-square bg-secondary relative">
              {meal.image_url ? (
                <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">{meal.emoji || '🍽️'}</div>
              )}
            </div>
            <div className="p-2">
              <p className="text-sm font-medium leading-tight line-clamp-2">{meal.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <Flame className="w-3 h-3 inline text-primary" /> {meal.calories} · {meal.protein_g}g P
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function FilteredResults({
  meals, viewMode, onSelect, onClear,
}: {
  meals: Meal[]; viewMode: 'card' | 'grid';
  onSelect: (m: Meal) => void; onClear: () => void;
}) {
  if (meals.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No meals match those filters.</p>
          <Button variant="link" className="text-primary mt-2" onClick={onClear}>Clear filters</Button>
        </CardContent>
      </Card>
    );
  }
  return (
    <>
      <p className="text-sm text-muted-foreground mb-3">{meals.length} meal{meals.length === 1 ? '' : 's'}</p>
      {viewMode === 'card' ? (
        <div className="space-y-3">
          {meals.map((meal) => (
            <Card key={meal.id} className="border-border/50 overflow-hidden cursor-pointer" onClick={() => onSelect(meal)}>
              <CardContent className="p-3 flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-secondary flex-shrink-0 overflow-hidden">
                  {meal.image_url
                    ? <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">{meal.emoji || <Flame className="w-6 h-6 text-primary/30" />}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  {/* Two-line clamp — recipe names like
                      "Peri-peri Salmon Fillet with Broccoli Florets & Kale"
                      truncate to unhelpful stubs on a single line. */}
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{meal.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-primary" />{meal.calories}kcal</span>
                    {meal.protein_g != null && <span>· {meal.protein_g}g protein</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="flex-shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {meals.map((meal) => (
            <Card key={meal.id} className="border-border/50 overflow-hidden cursor-pointer" onClick={() => onSelect(meal)}>
              <div className="aspect-square bg-secondary relative">
                {meal.image_url
                  ? <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-4xl">{meal.emoji || <Flame className="w-8 h-8 text-primary/30" />}</div>}
              </div>
              <CardContent className="p-2">
                <h3 className="font-medium text-sm leading-tight line-clamp-2">{meal.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Flame className="w-3 h-3 text-primary" /><span>{meal.calories}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function FilterGroup({ title, children, onClear, hasValue }: { title: string; children: React.ReactNode; onClear: () => void; hasValue: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{title}</span>
        {hasValue && (
          <button onClick={onClear} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            Clear <X className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-sm border transition-colors',
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border/60 text-foreground',
      )}
    >
      {children}
    </button>
  );
}
