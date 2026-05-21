import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { HIITLogo } from '@/components/HIITLogo';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';

import { 
  Search, Filter, Clock, Flame, Star, ChevronRight, 
  Dumbbell, Heart, Zap, Play, Users, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SportsTab } from '@/components/SportsTab';
import { normaliseSlug } from '@/lib/workout-filters';

type Workout = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  calories_burned: number;
  body_areas: string[];
  equipment: string[];
  instructor_name: string;
  thumbnail_url: string | null;
  is_featured: boolean;
  rating: number;
  rating_count: number;
};

const CATEGORIES = [
  { id: 'all', label: 'All', icon: null },
  { id: 'strength', label: 'Strength', icon: Dumbbell },
  { id: 'hiit', label: 'HIIT', icon: Zap },
  { id: 'cardio', label: 'Cardio', icon: Heart },
  { id: 'mobility', label: 'Mobility', icon: null },
  { id: 'recovery', label: 'Recovery', icon: null },
  { id: 'warm-up', label: 'Warm-Up', icon: null },
];

const BODY_AREAS = [
  { id: 'full-body', label: 'Full Body' },
  { id: 'upper-body', label: 'Upper Body' },
  { id: 'lower-body', label: 'Lower Body' },
  { id: 'core', label: 'Core' },
  { id: 'mobility', label: 'Mobility' },
  { id: 'cardio-system', label: 'Cardio System' },
];

const EQUIPMENT_LIST = [
  { id: 'none', label: 'No Equipment' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'barbell', label: 'Barbell' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'resistance-bands', label: 'Resistance Bands' },
  { id: 'pull-up-bar', label: 'Pull-up Bar' },
];

export default function WorkoutLibrary() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Athlete";
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Read ?maxDuration=N from URL. Invalid or missing → null (show all workouts).
  const rawMax = searchParams.get('maxDuration');
  const maxDuration = rawMax !== null && Number.isFinite(parseInt(rawMax, 10))
    ? parseInt(rawMax, 10)
    : null;
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBodyAreas, setSelectedBodyAreas] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'workouts' | 'sports'>('workouts');

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      setWorkouts(data || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkouts = workouts.filter(workout => {
    const matchesSearch = workout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workout.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || normaliseSlug(workout.category) === selectedCategory;
    const matchesBodyArea = selectedBodyAreas.length === 0 ||
      workout.body_areas?.some(area => selectedBodyAreas.includes(normaliseSlug(area)));
    const matchesEquipment = selectedEquipment.length === 0 ||
      workout.equipment?.some(eq => selectedEquipment.includes(normaliseSlug(eq)));
    const matchesDifficulty = !selectedDifficulty || normaliseSlug(workout.difficulty) === selectedDifficulty;
    const matchesDuration = maxDuration === null || workout.duration_minutes <= maxDuration;

    return matchesSearch && matchesCategory && matchesBodyArea && matchesEquipment && matchesDifficulty && matchesDuration;
  });

  const featuredWorkouts = filteredWorkouts.filter(w => w.is_featured);
  const activeWorkouts = filteredWorkouts.slice(0, 3);

  const toggleBodyArea = (id: string) => {
    setSelectedBodyAreas(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const toggleEquipment = (id: string) => {
    setSelectedEquipment(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSelectedBodyAreas([]);
    setSelectedEquipment([]);
    setSelectedDifficulty('');
  };

  const activeFilterCount = selectedBodyAreas.length + selectedEquipment.length + (selectedDifficulty ? 1 : 0);

  return (
    <div className="min-h-screen bg-background pb-24 flex justify-center overflow-x-hidden">
      <div className="w-full max-w-md overflow-x-hidden">
        {/* Sticky header with logo */}
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 flex items-center justify-between px-4 py-3" style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}>
          <HIITLogo size="sm" />
          <p className="text-xs text-muted-foreground">Workouts</p>
        </header>
        <div className="px-4 py-3 pr-5 space-y-4 overflow-hidden">

          {/* Tab switcher */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'workouts' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 rounded-full h-8 text-xs touch-manipulation"
              onClick={() => setActiveTab('workouts')}
            >
              Workouts
            </Button>
            <Button
              variant={activeTab === 'sports' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 rounded-full h-8 text-xs touch-manipulation"
              onClick={() => setActiveTab('sports')}
            >
              Sports
            </Button>
          </div>

          {activeTab === 'sports' && <SportsTab />}

          {activeTab === 'workouts' && <>

          {/* AI Greeting */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-3">
              <div className="flex gap-2.5 items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <HIITLogo size="sm" />
                </div>
                <p className="text-xs leading-relaxed flex-1 min-w-0 break-words pr-1">
                  Hey {displayName}, here's a great workout to get you started! 💪
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Featured Workout */}
          {featuredWorkouts[0] && (
            <Card 
              className="overflow-hidden cursor-pointer touch-manipulation active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/workout/${featuredWorkouts[0].id}`)}
            >
              <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
                {featuredWorkouts[0].thumbnail_url ? (
                  <img 
                    src={featuredWorkouts[0].thumbnail_url} 
                    alt={featuredWorkouts[0].title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Dumbbell className="w-14 h-14 text-primary/30" />
                  </div>
                )}
                <Badge className="absolute top-3 left-3 bg-primary text-[11px]">Featured</Badge>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-3">
                  <h3 className="font-bold text-base">{featuredWorkouts[0].title}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap pr-1">
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock className="w-3 h-3" /> {featuredWorkouts[0].duration_minutes}min
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Flame className="w-3 h-3" /> {featuredWorkouts[0].calories_burned}kcal
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Star className="w-3 h-3 fill-primary text-primary" /> {featuredWorkouts[0].rating}
                    </span>
                  </div>
                </div>
              </div>
              <CardContent className="p-3">
                <Button className="w-full h-10 text-sm touch-manipulation justify-between px-4 min-w-0">
                  <span className="truncate">Go to dashboard</span>
                  <ArrowRight className="w-4 h-4 flex-shrink-0" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for a workout..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl h-10 text-sm"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-xl relative h-10 w-10 touch-manipulation"
              onClick={() => setShowFilters(true)}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 pr-1 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                className="rounded-full flex-shrink-0 gap-1 h-8 text-xs touch-manipulation"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icon && <cat.icon className="w-3 h-3" />}
                {cat.label}
              </Button>
            ))}
          </div>

          {/* My Active Workouts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">My Active Workout</h2>
              <Button variant="link" size="sm" className="text-primary text-xs h-auto p-0">See all</Button>
            </div>
            <div className="space-y-2">
              {activeWorkouts.map(workout => (
                <Card 
                  key={workout.id} 
                  className="cursor-pointer active:bg-secondary/50 transition-colors touch-manipulation"
                  onClick={() => navigate(`/workout/${workout.id}`)}
                >
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {workout.thumbnail_url ? (
                        <img src={workout.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Dumbbell className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{workout.title}</h3>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{workout.duration_minutes}min</span>
                        <span>·</span>
                        <span className="capitalize">{workout.difficulty}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Suggest Workout */}
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Get the best workout</p>
                <p className="text-xs text-muted-foreground">Personalized with AI</p>
              </div>
              <Button size="sm" className="rounded-xl h-9 w-9 p-0 touch-manipulation">
                <Play className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Browse By Body Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">Browse By Body Area</h2>
              <Button variant="link" size="sm" className="text-primary text-xs h-auto p-0">See all</Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 pr-1 scrollbar-hide">
              {BODY_AREAS.slice(0, 5).map(area => (
                <button
                  key={area.id}
                  onClick={() => {
                    toggleBodyArea(area.id);
                    setShowFilters(true);
                  }}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 touch-manipulation"
                >
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center active:bg-secondary/80 transition-colors">
                    <Dumbbell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="text-[10px]">{area.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Short Workouts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">Short Workouts</h2>
              <Button variant="link" size="sm" className="text-primary text-xs h-auto p-0">See all</Button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-2 pr-1 scrollbar-hide">
              {filteredWorkouts.filter(w => w.duration_minutes <= 20).slice(0, 4).map(workout => (
                <Card 
                  key={workout.id} 
                  className="w-36 flex-shrink-0 overflow-hidden cursor-pointer touch-manipulation active:scale-[0.98] transition-transform"
                  onClick={() => navigate(`/workout/${workout.id}`)}
                >
                  <div className="h-20 bg-gradient-to-br from-primary/20 to-secondary relative">
                    <Badge className="absolute top-2 left-2 text-[9px]" variant="secondary">
                      {workout.duration_minutes}min
                    </Badge>
                  </div>
                  <CardContent className="p-2.5">
                    <h3 className="font-medium text-xs truncate">{workout.title}</h3>
                    <p className="text-[10px] text-muted-foreground capitalize">{workout.difficulty}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Trending Workouts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm">Trending Workouts</h2>
              <Button variant="link" size="sm" className="text-primary text-xs h-auto p-0">See all</Button>
            </div>
            <div className="space-y-2">
              {filteredWorkouts.filter(w => w.rating >= 4.5).slice(0, 3).map(workout => (
                <Card 
                  key={workout.id} 
                  className="overflow-hidden cursor-pointer touch-manipulation active:scale-[0.98] transition-transform"
                  onClick={() => navigate(`/workout/${workout.id}`)}
                >
                  <div className="relative h-28 bg-gradient-to-br from-primary/30 to-secondary">
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent p-3">
                      <h3 className="font-bold text-sm">{workout.title}</h3>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {workout.rating_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {workout.duration_minutes}min
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-primary text-primary" /> {workout.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          </>}
        </div>
      </div>

      {/* Filter Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Filter Workout Results
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-primary">
                Clear All
              </Button>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full py-4">
            <div className="space-y-6">
              {/* Category */}
              <div>
                <h3 className="font-semibold mb-3">Category</h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <h3 className="font-semibold mb-3">Level</h3>
                <div className="flex flex-wrap gap-2">
                  {['beginner', 'intermediate', 'advanced'].map(level => (
                    <Button
                      key={level}
                      variant={selectedDifficulty === level ? "default" : "outline"}
                      size="sm"
                      className="rounded-full capitalize"
                      onClick={() => setSelectedDifficulty(selectedDifficulty === level ? '' : level)}
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div>
                <h3 className="font-semibold mb-3">Equipment</h3>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_LIST.map(eq => (
                    <Button
                      key={eq.id}
                      variant={selectedEquipment.includes(eq.id) ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => toggleEquipment(eq.id)}
                    >
                      {eq.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Body Area */}
              <div>
                <h3 className="font-semibold mb-3">Filter By Body Area</h3>
                <div className="flex flex-wrap gap-2">
                  {BODY_AREAS.map(area => (
                    <Button
                      key={area.id}
                      variant={selectedBodyAreas.includes(area.id) ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => toggleBodyArea(area.id)}
                    >
                      {area.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <div className="pt-4 border-t">
            <Button onClick={() => setShowFilters(false)} className="w-full h-12 rounded-2xl">
              Show Results ({filteredWorkouts.length})
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      
    </div>
  );
}
