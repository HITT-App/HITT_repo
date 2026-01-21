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
import { ArrowLeft, Search, Filter, Grid, List, Clock, Star, Flame, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Meal = {
  id: string;
  name: string;
  description: string;
  category: string;
  cuisine_type: string;
  calories: number;
  protein_grams: number;
  fat_grams: number;
  carbs_grams: number;
  prep_time_minutes: number;
  cook_time_minutes: number;
  image_url: string | null;
  tags: string[];
  rating: number;
  is_featured: boolean;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

const CUISINE_TYPES = [
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { id: 'keto', label: 'Keto', icon: '🥑' },
  { id: 'paleo', label: 'Paleo', icon: '🍖' },
  { id: 'vegan', label: 'Vegan', icon: '🌱' },
];

export default function BrowseMeals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [meals, setMeals] = useState<Meal[]>([]);
  const [filteredMeals, setFilteredMeals] = useState<Meal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [maxCalories, setMaxCalories] = useState(1000);
  const [maxCookTime, setMaxCookTime] = useState(60);
  const [minProtein, setMinProtein] = useState(0);

  useEffect(() => {
    fetchMeals();
  }, []);

  useEffect(() => {
    filterMeals();
  }, [meals, searchQuery, selectedCategory, selectedCuisine, maxCalories, maxCookTime, minProtein]);

  const fetchMeals = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .order('is_featured', { ascending: false });

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

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(meal => meal.category === selectedCategory);
    }

    // Cuisine filter
    if (selectedCuisine) {
      result = result.filter(meal => meal.cuisine_type === selectedCuisine);
    }

    // Calorie filter
    result = result.filter(meal => (meal.calories || 0) <= maxCalories);

    // Cook time filter
    result = result.filter(meal => 
      ((meal.prep_time_minutes || 0) + (meal.cook_time_minutes || 0)) <= maxCookTime
    );

    // Protein filter
    result = result.filter(meal => (meal.protein_grams || 0) >= minProtein);

    setFilteredMeals(result);
  };

  const clearFilters = () => {
    setSelectedCuisine(null);
    setMaxCalories(1000);
    setMaxCookTime(60);
    setMinProtein(0);
    setShowFilters(false);
  };

  const activeFiltersCount = [
    selectedCuisine,
    maxCalories < 1000,
    maxCookTime < 60,
    minProtein > 0,
  ].filter(Boolean).length;

  const featuredMeals = filteredMeals.filter(m => m.is_featured);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-10">
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

        {/* Cuisine Quick Filters */}
        <div className="px-4 pb-4">
          <ScrollArea className="w-full">
            <div className="flex gap-2">
              {CUISINE_TYPES.map((cuisine) => (
                <Button
                  key={cuisine.id}
                  variant={selectedCuisine === cuisine.id ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full whitespace-nowrap gap-1"
                  onClick={() => setSelectedCuisine(
                    selectedCuisine === cuisine.id ? null : cuisine.id
                  )}
                >
                  <span>{cuisine.icon}</span>
                  {cuisine.label}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-4 space-y-6">
          {/* Featured Meals */}
          {featuredMeals.length > 0 && !searchQuery && selectedCategory === 'all' && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Featured Meal</h2>
                <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-3">
                  {featuredMeals.slice(0, 3).map((meal) => (
                    <Card 
                      key={meal.id} 
                      className="min-w-[280px] border-border/50 overflow-hidden cursor-pointer"
                      onClick={() => navigate(`/meal/${meal.id}`)}
                    >
                      <div className="h-40 bg-gradient-to-br from-secondary to-muted relative">
                        {meal.image_url ? (
                          <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Flame className="w-12 h-12 text-primary/30" />
                          </div>
                        )}
                        <Badge className="absolute top-2 left-2 bg-background/80 text-foreground">
                          New
                        </Badge>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-semibold truncate">{meal.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{meal.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3 text-primary" />
                            {meal.calories}
                          </span>
                          <span>🥩 {meal.protein_grams}g</span>
                          <span>🧈 {meal.fat_grams}g</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </section>
          )}

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
                    onClick={() => navigate(`/meal/${meal.id}`)}
                  >
                    <CardContent className="p-3 flex gap-3">
                      <div className="w-16 h-16 rounded-xl bg-secondary flex-shrink-0 overflow-hidden">
                        {meal.image_url ? (
                          <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Flame className="w-6 h-6 text-primary/30" />
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
                          <span>· {meal.servings || 1} Meal</span>
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
                    onClick={() => navigate(`/meal/${meal.id}`)}
                  >
                    <div className="aspect-square bg-secondary relative">
                      {meal.image_url ? (
                        <img src={meal.image_url} alt={meal.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Flame className="w-8 h-8 text-primary/30" />
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
      </ScrollArea>

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
                {['Breakfast', 'Lunch', 'Dinner'].map((type) => (
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

            {/* Cooking Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">Cooking Time</label>
              <Select value={maxCookTime.toString()} onValueChange={(v) => setMaxCookTime(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Under 15 minutes</SelectItem>
                  <SelectItem value="30">Under 30 minutes</SelectItem>
                  <SelectItem value="45">Under 45 minutes</SelectItem>
                  <SelectItem value="60">Under 1 hour</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
