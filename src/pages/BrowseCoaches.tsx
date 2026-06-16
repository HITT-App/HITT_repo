import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { useCoaches, Coach, CoachFilters } from '@/hooks/useCoaches';
import { 
  Search, Filter, MapPin, Star, Clock, ChevronRight, 
  Dumbbell, Heart, Zap, Wind, X, SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';


const SPECIALTIES = [
  { id: 'hiit', label: 'HIIT', icon: Zap },
  { id: 'strength', label: 'Strength', icon: Dumbbell },
  { id: 'yoga', label: 'Yoga', icon: Wind },
  { id: 'cardio', label: 'Cardio', icon: Heart },
  { id: 'speed', label: 'Speed', icon: Zap },
  { id: 'mobility', label: 'Mobility', icon: Wind },
];

export default function BrowseCoaches() {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CoachFilters>({});
  const [tempFilters, setTempFilters] = useState<CoachFilters>({});

  const { coaches, featuredCoaches, loading } = useCoaches({ ...filters, searchQuery });

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters({});
    setTempFilters({});
    setSearchQuery('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchQuery;

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a fitness coach..."
              className="pl-10 pr-10 bg-secondary border-0 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => { setTempFilters(filters); setShowFilters(true); }}
            className={cn("rounded-xl", hasActiveFilters && "border-primary text-primary")}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Specialty Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SPECIALTIES.map(spec => {
            const Icon = spec.icon;
            const active = filters.specialty === spec.id;
            return (
              <button
                key={spec.id}
                onClick={() => setFilters(f => ({ ...f, specialty: active ? undefined : spec.id }))}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-all",
                  active ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {spec.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-6 pb-28">
        {/* Featured Coaches */}
        {featuredCoaches.length > 0 && !searchQuery && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Featured Coaches</h2>
              <Button variant="link" size="sm" className="text-primary p-0">See All</Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {featuredCoaches.map(coach => (
                <FeaturedCoachCard key={coach.id} coach={coach} onClick={() => navigate(`/coach/${coach.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Popular Coaches */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              {searchQuery ? `Results for "${searchQuery}"` : 'Most Popular Coach'}
            </h2>
            {!searchQuery && <Button variant="link" size="sm" className="text-primary p-0">See All</Button>}
          </div>
          
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-secondary animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : coaches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No coaches found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {coaches.map(coach => (
                <CoachListCard key={coach.id} coach={coach} onClick={() => navigate(`/coach/${coach.id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>
      </div>

      {/* Filter Sheet */}
      <Sheet open={showFilters} onOpenChange={setShowFilters}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Filter Coach Results</span>
              <Button variant="ghost" size="sm" onClick={() => setTempFilters({})}>
                Reset
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6 overflow-y-auto max-h-[60vh]">
            {/* Specialization */}
            <div>
              <h3 className="text-sm font-medium mb-3">Specialization</h3>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(spec => {
                  const active = tempFilters.specialty === spec.id;
                  return (
                    <button
                      key={spec.id}
                      onClick={() => setTempFilters(f => ({ ...f, specialty: active ? undefined : spec.id }))}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {spec.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Consultation Type */}
            <div>
              <h3 className="text-sm font-medium mb-3">Consultation Type</h3>
              <div className="flex flex-wrap gap-2">
                {['in-person', 'video-call', 'phone-call'].map(type => {
                  const active = tempFilters.coachingType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setTempFilters(f => ({ ...f, coachingType: active ? undefined : type }))}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {type === 'in-person' ? '🏋️ In-Person' : type === 'video-call' ? '📹 Video' : '📞 Phone'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gender Preference */}
            <div>
              <h3 className="text-sm font-medium mb-3">Gender Preference</h3>
              <div className="flex gap-2">
                {['all', 'male', 'female', 'other'].map(g => {
                  const active = (tempFilters.gender || 'all') === g;
                  return (
                    <button
                      key={g}
                      onClick={() => setTempFilters(f => ({ ...f, gender: g === 'all' ? undefined : g }))}
                      className={cn(
                        "flex-1 py-2 rounded-full text-sm border transition-all capitalize",
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="text-sm font-medium mb-3">Price Range</h3>
              <Slider
                defaultValue={[tempFilters.priceMax || 200]}
                max={500}
                min={50}
                step={10}
                onValueChange={([val]) => setTempFilters(f => ({ ...f, priceMax: val }))}
                className="mt-2"
              />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>$50</span>
                <span>${tempFilters.priceMax || 200}</span>
              </div>
            </div>

            {/* Ratings */}
            <div>
              <h3 className="text-sm font-medium mb-3">Ratings & Reviews</h3>
              <div className="flex gap-2">
                {[4, 4.5, 5].map(rating => {
                  const active = tempFilters.minRating === rating;
                  return (
                    <button
                      key={rating}
                      onClick={() => setTempFilters(f => ({ ...f, minRating: active ? undefined : rating }))}
                      className={cn(
                        "flex items-center gap-1 px-4 py-2 rounded-full text-sm border transition-all",
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border"
                      )}
                    >
                      {rating}+ <Star className="w-3 h-3 fill-current" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <Button onClick={handleApplyFilters} className="w-full h-12 rounded-2xl">
              Show Results ({coaches.length})
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FeaturedCoachCard({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-40 text-left"
    >
      <div className="relative h-48 rounded-2xl overflow-hidden mb-2">
        <img
          src={coach.avatar_url || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=200'}
          alt={coach.name}
          className="w-full h-full object-cover"
        />
        <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center">
          <Heart className="w-4 h-4" />
        </button>
        <div className="absolute bottom-2 left-2 right-2">
          <Badge className="bg-primary/90">{coach.specialties?.[0] || 'Fitness'}</Badge>
        </div>
      </div>
      <h3 className="font-medium text-sm truncate">{coach.name}</h3>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="w-3 h-3 fill-primary text-primary" />
        <span>{coach.rating}</span>
        <span>•</span>
        <span>{coach.review_count} reviews</span>
      </div>
    </button>
  );
}

function CoachListCard({ coach, onClick }: { coach: Coach; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-card rounded-2xl border border-border hover:border-primary/50 transition-all text-left"
    >
      <img
        src={coach.avatar_url || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100'}
        alt={coach.name}
        className="w-16 h-16 rounded-xl object-cover"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{coach.name}</h3>
        <p className="text-xs text-muted-foreground truncate">{coach.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3 h-3 fill-primary text-primary" />
            <span>{coach.rating}</span>
            <span className="text-muted-foreground">({coach.review_count})</span>
          </div>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-primary">${coach.price_per_session_min}+/session</span>
        </div>
        <div className="flex gap-1 mt-1">
          {coach.coaching_types?.slice(0, 2).map(type => (
            <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
              {type === 'in-person' ? '🏋️' : type === 'video-call' ? '📹' : '📞'}
            </Badge>
          ))}
          {coach.is_available && (
            <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-500 border-0">
              Available
            </Badge>
          )}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
}
