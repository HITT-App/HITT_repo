import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Search, Filter, Grid, List, Flame, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Ingredient = { name: string; amount: number; unit: string };
type Instruction = { step: number; text: string };

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
  veg_swap: string | null;
  vegan_swap: string | null;
  ingredients: Ingredient[] | null;
  instructions: Instruction[] | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

export default function BrowseMeals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Meal | null>(null);

  // Filter state
  const [maxCalories, setMaxCalories] = useState(1000);
  const [minProtein, setMinProtein] = useState(0);

  useEffect(() => {
    fetchMeals();
  }, []);

  useEffect(() => {
    filterMeals();
  }, [meals, searchQuery, selectedCategory, maxCalories, minProtein]);

  const fetchMeals = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('name');

    if (data) {
      setMeals(data as Meal[]);
    }
    setIsLoading(false);
  };

  const filterMeals = () => {
    let result = [...meals];

    // Search filter
    if (searchQuery) {
      result = result.filter(meal =>
        meal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meal.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter (uses meal_type)
    if (selectedCategory !== 'all') {
      result = result.filter(meal => meal.meal_type === selectedCategory);
    }

    // Calorie filter
    result = result.filter(meal => (meal.calories || 0) <= maxCalories);

    // Protein filter
    result = result.filter(meal => (meal.protein_g || 0) >= minProtein);

    setFilteredMeals(result);
  };

  const clearFilters = () => {
    setMaxCalories(1000);
    setMinProtein(0);
    setShowFilters(false);
  };

  const activeFiltersCount = [
    maxCalories < 1000,
    minProtein > 0,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold flex-1">Browse Meals</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode(viewMode === 'card' ? 'grid' : 'card')}
          >
            {viewMode === 'card' ? <Grid className="w-5 h-5" /> : <List className="w-5 h-5" />}
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="px-4 pb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search for a meal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(true)}
            className="relative"
          >
            <Filter className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6 pb-28">
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className="rounded-full whitespace-nowrap"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Results */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">
                {selectedCategory === 'all' ? 'All Meals' : CATEGORIES.find(c => c.id === selectedCategory)?.label} ({filteredMeals.length})
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-secondary animate-pulse rounded-xl" />
                ))}
              </div>
            ) : filteredMeals.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No meals found matching your criteria</p>
                  <Button variant="link" className="text-primary mt-2" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === 'card' ? (
              <div className="space-y-3">
                {filteredMeals.map((meal) => (
                  <Card
                    key={meal.id}
                    className="border-border/50 overflow-hidden cursor-pointer"
                    onClick={() => setSelectedRecipe(meal)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-secondary flex-shrink-0 overflow-hidden">
                        {meal.image_url ? (
                          <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {meal.emoji || <Flame className="w-6 h-6 text-primary/30" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{meal.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-primary" />
                            {meal.calories}kcal
                          </span>
                          {meal.protein_g != null && (
                            <span>· {meal.protein_g}g protein</span>
                          )}
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
                {filteredMeals.map((meal) => (
                  <Card
                    key={meal.id}
                    className="border-border/50 overflow-hidden cursor-pointer"
                    onClick={() => setSelectedRecipe(meal)}
                  >
                    <div className="aspect-square bg-secondary relative">
                      {meal.image_url ? (
                        <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          {meal.emoji || <Flame className="w-8 h-8 text-primary/30" />}
                        </div>
                      )}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-2 right-2 w-8 h-8 rounded-full"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardContent className="p-2">
                      <h3 className="font-medium text-sm truncate">{meal.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="w-3 h-3 text-primary" />
                        <span>{meal.calories}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Filter Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="text-left mb-6">
            <SheetTitle>Filter Meal Results</SheetTitle>
            <p className="text-sm text-muted-foreground">Quickly find and analyze your meal data.</p>
          </SheetHeader>

          <div className="space-y-6">
            {/* Meal Type */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by meal type</label>
              <div className="flex gap-2 flex-wrap">
                {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                  <Badge
                    key={type}
                    variant="outline"
                    className={cn(
                      "cursor-pointer",
                      selectedCategory === type.toLowerCase() && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => setSelectedCategory(
                      selectedCategory === type.toLowerCase() ? 'all' : type.toLowerCase()
                    )}
                  >
                    {type}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Protein Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Protein</label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-12">{minProtein}g</span>
                <Slider
                  value={[minProtein]}
                  onValueChange={([v]) => setMinProtein(v)}
                  max={100}
                  step={5}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Calorie Filter */}
            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Calorie</label>
              <Select value={maxCalories.toString()} onValueChange={(v) => setMaxCalories(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="200">100 - 200kcal</SelectItem>
                  <SelectItem value="400">200 - 400kcal</SelectItem>
                  <SelectItem value="600">400 - 600kcal</SelectItem>
                  <SelectItem value="1000">600+ kcal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <Button
              className="w-full h-12 rounded-2xl gap-2"
              onClick={() => setShowFilters(false)}
            >
              Show Results ({filteredMeals.length}) <Filter className="w-4 h-4" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Recipe Detail Sheet */}
      <Sheet open={!!selectedRecipe} onOpenChange={(o) => !o && setSelectedRecipe(null)}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {selectedRecipe && (
              <div>
                {/* Image */}
                <div className="h-48 bg-secondary w-full overflow-hidden">
                  {selectedRecipe.image_url ? (
                    <img
                      src={selectedRecipe.image_url}
                      alt={selectedRecipe.name}
                      className="w-full h-full object-cover"
                    />
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

                  {/* Macro row */}
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
                          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                            <span className="text-sm text-foreground capitalize">{ing.name}</span>
                            <span className="text-sm text-muted-foreground font-medium">{ing.amount} {ing.unit}</span>
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
                        selectedRecipe.instructions.map((inst, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                              {inst.step}
                            </div>
                            <p className="text-sm text-foreground leading-relaxed">{inst.text}</p>
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

                  {/* Log buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
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
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
