import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Search as SearchIcon,
  Filter,
  X,
  Dumbbell,
  Utensils,
  Moon,
  Heart,
  TrendingUp,
  Clock
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

type SearchType = "all" | "workouts" | "meals" | "sleep" | "metrics";
type SortOption = "relevant" | "recent" | "popular";
type DateRange = "all" | "today" | "week" | "month";

interface SearchResult {
  id: string;
  type: "workout" | "meal" | "sleep" | "metric";
  title: string;
  subtitle: string;
  time: string;
}

const mockResults: SearchResult[] = [
  {
    id: "1",
    type: "workout",
    title: "Full Body HIIT",
    subtitle: "45 min • 420 calories burned",
    time: "Today",
  },
  {
    id: "2",
    type: "meal",
    title: "Grilled Chicken Salad",
    subtitle: "450 cal • 35g protein",
    time: "Today",
  },
  {
    id: "3",
    type: "sleep",
    title: "Last Night's Sleep",
    subtitle: "7h 30m • 85 quality score",
    time: "Today",
  },
  {
    id: "4",
    type: "metric",
    title: "Weight Progress",
    subtitle: "Lost 2.5 lbs this week",
    time: "This week",
  },
  {
    id: "5",
    type: "workout",
    title: "Upper Body Strength",
    subtitle: "30 min • 280 calories burned",
    time: "Yesterday",
  },
  {
    id: "6",
    type: "meal",
    title: "Protein Smoothie",
    subtitle: "320 cal • 28g protein",
    time: "Yesterday",
  },
];

const getIcon = (type: SearchResult["type"]) => {
  switch (type) {
    case "workout":
      return <Dumbbell className="w-5 h-5" />;
    case "meal":
      return <Utensils className="w-5 h-5" />;
    case "sleep":
      return <Moon className="w-5 h-5" />;
    case "metric":
      return <Heart className="w-5 h-5" />;
  }
};

const getIconBg = (type: SearchResult["type"]) => {
  switch (type) {
    case "workout":
      return "bg-primary/10 text-primary";
    case "meal":
      return "bg-green-500/10 text-green-500";
    case "sleep":
      return "bg-blue-500/10 text-blue-500";
    case "metric":
      return "bg-pink-500/10 text-pink-500";
  }
};

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("all");
  const [sortBy, setSortBy] = useState<SortOption>("relevant");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const filterOptions: { label: string; value: SearchType; icon: React.ReactNode }[] = [
    { label: "All", value: "all", icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Workouts", value: "workouts", icon: <Dumbbell className="w-4 h-4" /> },
    { label: "Meals", value: "meals", icon: <Utensils className="w-4 h-4" /> },
    { label: "Sleep", value: "sleep", icon: <Moon className="w-4 h-4" /> },
    { label: "Metrics", value: "metrics", icon: <Heart className="w-4 h-4" /> },
  ];

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: "Most Relevant", value: "relevant" },
    { label: "Most Recent", value: "recent" },
    { label: "Most Popular", value: "popular" },
  ];

  const dateOptions: { label: string; value: DateRange }[] = [
    { label: "All Time", value: "all" },
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
  ];

  const filteredResults = mockResults.filter((result) => {
    if (searchType === "all") return true;
    if (searchType === "workouts") return result.type === "workout";
    if (searchType === "meals") return result.type === "meal";
    if (searchType === "sleep") return result.type === "sleep";
    if (searchType === "metrics") return result.type === "metric";
    return true;
  });

  const recentSearches = ["HIIT workouts", "Protein meals", "Sleep schedule", "Weight loss"];

  const activeFiltersCount = 
    (searchType !== "all" ? 1 : 0) + 
    (sortBy !== "relevant" ? 1 : 0) + 
    (dateRange !== "all" ? 1 : 0);

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border/60">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search workouts, meals, metrics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 pr-10 bg-secondary border-0 rounded-xl"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setQuery("")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0 relative"
                >
                  <Filter className="w-5 h-5" />
                  {activeFiltersCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 py-6">
                  {/* Search Type */}
                  <div>
                    <h4 className="font-medium mb-3">Search Type</h4>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={searchType === option.value ? "default" : "outline"}
                          size="sm"
                          className="rounded-full gap-2"
                          onClick={() => setSearchType(option.value)}
                        >
                          {option.icon}
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <h4 className="font-medium mb-3">Date Range</h4>
                    <div className="flex flex-wrap gap-2">
                      {dateOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={dateRange === option.value ? "default" : "outline"}
                          size="sm"
                          className="rounded-full"
                          onClick={() => setDateRange(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <h4 className="font-medium mb-3">Sort By</h4>
                    <div className="flex flex-wrap gap-2">
                      {sortOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={sortBy === option.value ? "default" : "outline"}
                          size="sm"
                          className="rounded-full"
                          onClick={() => setSortBy(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      onClick={() => {
                        setSearchType("all");
                        setSortBy("relevant");
                        setDateRange("all");
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      className="flex-1 rounded-xl"
                      onClick={() => setIsFiltersOpen(false)}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Content */}
        <div className="p-4 pb-28">
          {!query ? (
            /* Recent Searches */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  Recent Searches
                </h3>
                <Button variant="ghost" size="sm" className="text-primary">
                  Clear
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((search) => (
                  <Badge
                    key={search}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80 rounded-full px-4 py-2"
                    onClick={() => setQuery(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          ) : (
            /* Search Results */
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {filteredResults.length} results for "{query}"
              </p>
              <div className="space-y-3">
                {filteredResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border cursor-pointer hover:bg-card/80 transition-colors"
                  >
                    <div className={`p-3 rounded-xl ${getIconBg(result.type)}`}>
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {result.title}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {result.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default Search;
