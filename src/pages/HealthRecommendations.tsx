import { ArrowLeft, Filter, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RecommendationCard, type Recommendation } from "@/components/health/RecommendationCard";

type Category = "all" | "completed" | "incomplete";

const recommendations: Recommendation[] = [
  {
    id: "1",
    type: "hydration",
    title: "Boost Hydration",
    description: "Increase your daily water intake by drinking one extra glass of water daily...",
    metric: "2,500ml water intake daily",
    scoreGain: 2,
    completed: false,
  },
  {
    id: "2",
    type: "activity",
    title: "Get Active, Stay Fit!",
    description: "Increase your daily water intake by drinking one extra glass of water daily...",
    metric: "Get Active for 30m daily",
    scoreGain: 2,
    completed: false,
  },
  {
    id: "3",
    type: "sleep",
    title: "Mind your sleep",
    description: "Increase your daily water intake by drinking one extra glass of water daily...",
    metric: "Get 8hr of sleep",
    scoreGain: 2,
    completed: true,
  },
];

const HealthRecommendations = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/health-metrics");
  };

  const categories: { value: Category; label: string }[] = [
    { value: "all", label: "All" },
    { value: "completed", label: "Completed" },
    { value: "incomplete", label: "Incomplete" },
  ];

  const filterCategories = ["Blood Pressure", "Hydration", "Sleep", "Activity"];
  const priorities = ["High", "Medium", "Low"];

  const filteredRecommendations = recommendations.filter((rec) => {
    if (category === "completed") return rec.completed;
    if (category === "incomplete") return !rec.completed;
    return true;
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <header className="shrink-0 bg-background border-b border-border/60 flex items-center justify-between px-4 py-3">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground">Recommendations</h1>
        <div className="w-[38px]" />
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="px-4 space-y-6 pb-28">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Health Metrics Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            You have {recommendations.filter(r => !r.completed).length} fitness recommendations based on our health LLMs.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">All Recommendation</p>
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader>
                <SheetTitle>Filter AI Recommendation</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-sm font-medium mb-3">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {filterCategories.map((cat) => (
                      <Button key={cat} variant="outline" size="sm" className="rounded-full">
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">Priority</p>
                  <div className="flex gap-2">
                    {priorities.map((priority) => (
                      <Button key={priority} variant="outline" size="sm" className="rounded-full">
                        {priority}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-3">Score Gain</p>
                  <Button variant="outline" className="w-full justify-between">
                    High
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button className="w-full" onClick={() => setFilterOpen(false)}>
                  Show Results ({recommendations.length})
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.value}
              variant={category === cat.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.value)}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          {filteredRecommendations.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} />
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};

export default HealthRecommendations;
