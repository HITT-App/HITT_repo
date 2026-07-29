import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Clock,
  Star,
  Flame,
  Plus,
  MessageSquare
} from "lucide-react";

import hiitLogo from "@/assets/hiit-logo.jpg";

type Ingredient = { name: string; amount?: string | number | null; unit?: string | null };

type Meal = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  cuisine_type: string | null;
  calories: number | null;
  protein_grams: number | null;
  fat_grams: number | null;
  carbs_grams: number | null;
  fiber_grams: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  image_url: string | null;
  tags: string[] | null;
  rating: number | null;
  rating_count: number | null;
  is_featured: boolean | null;
  servings: number | null;
  ingredients: unknown;
  instructions: unknown;
};

/** "150" + "g" + "firm tofu" → "150g firm tofu"; tolerates any part being absent. */
const formatIngredient = (ing: Ingredient) =>
  [[ing.amount, ing.unit].filter(v => v != null && v !== "").join(""), ing.name]
    .filter(Boolean)
    .join(" ")
    .trim();

const MealDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [meal, setMeal] = useState<Meal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (id) fetchMeal();
  }, [id]);

  const fetchMeal = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("meals")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setMeal(data as Meal);
    }
    setIsLoading(false);
  };

  // Hand the real macros to the log screen rather than claiming success here —
  // this button used to toast "Meal added to your log!" without writing anything.
  const handleAddMeal = () => {
    if (!meal) return;
    navigate("/log-meal", {
      state: {
        recipe: {
          name: meal.name,
          calories: meal.calories,
          protein_g: meal.protein_grams,
          carbs_g: meal.carbs_grams,
          fat_g: meal.fat_grams,
        },
      },
    });
  };

  const totalTime = (meal?.prep_time_minutes || 0) + (meal?.cook_time_minutes || 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Meal not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const ingredients: Ingredient[] = Array.isArray(meal.ingredients)
    ? (meal.ingredients as Ingredient[])
    : [];
  const instructions: string[] = Array.isArray(meal.instructions)
    ? (meal.instructions as unknown[]).map(step =>
        typeof step === "string" ? step : String((step as { instruction?: string })?.instruction ?? ""),
      ).filter(Boolean)
    : [];

  const macros = [
    { label: "Protein", value: meal.protein_grams, unit: "g" },
    { label: "Carbs", value: meal.carbs_grams, unit: "g" },
    { label: "Fat", value: meal.fat_grams, unit: "g" },
    { label: "Fibre", value: meal.fiber_grams, unit: "g" },
  ];
  const hasMacros = macros.some(m => m.value != null) || meal.calories != null;

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <div className="flex-1 overflow-y-auto">
        {/* Hero image */}
        <div className="relative h-64">
          {meal.image_url ? (
            <img
              src={meal.image_url}
              alt={meal.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
              <img src={hiitLogo} alt="" className="w-14 h-14 rounded-xl object-cover opacity-70" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-white/80 text-sm font-medium">Food Details</span>
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Category */}
          <div className="flex justify-center">
            <Badge variant="outline" className="text-primary border-primary">
              🍳 {meal.category.charAt(0).toUpperCase() + meal.category.slice(1)}
            </Badge>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">{meal.name}</h1>
            {meal.description && (
              <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                {meal.description}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="font-semibold text-foreground">{totalTime > 0 ? totalTime : "—"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Minutes
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{meal.rating || "—"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-primary" /> Rating
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{meal.calories ?? "—"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-primary" /> kcal
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
              <TabsTrigger value="recipe" className="rounded-xl">Recipe</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Nutrition */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Nutrition</h3>
                {hasMacros ? (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {macros.map(({ label, value, unit }) => (
                        <div key={label} className="rounded-xl bg-secondary p-2.5 text-center">
                          <p className="text-sm font-semibold">
                            {value != null ? value : "—"}
                            <span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                    {meal.servings != null && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Per serving · makes {meal.servings}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nutrition data unavailable for this recipe.
                  </p>
                )}
              </section>

              {/* Tags */}
              {(meal.tags?.length ?? 0) > 0 && (
                <section>
                  <h3 className="font-semibold text-foreground mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {meal.tags!.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-muted-foreground">
                        # {tag}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {/* Preparation time */}
              {totalTime > 0 && (
                <section>
                  <h3 className="font-semibold text-foreground mb-3">Preparation Time</h3>
                  <Card className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-around text-center">
                      {meal.prep_time_minutes != null && (
                        <div>
                          <p className="text-xl font-bold text-foreground">{meal.prep_time_minutes}</p>
                          <p className="text-xs text-muted-foreground">Prep (min)</p>
                        </div>
                      )}
                      {meal.cook_time_minutes != null && (
                        <div>
                          <p className="text-xl font-bold text-foreground">{meal.cook_time_minutes}</p>
                          <p className="text-xs text-muted-foreground">Cook (min)</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xl font-bold text-primary">{totalTime}</p>
                        <p className="text-xs text-muted-foreground">Total (min)</p>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              )}
            </TabsContent>

            <TabsContent value="recipe" className="mt-6 space-y-6">
              {/* Ingredients */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Ingredients</h3>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    {ingredients.length > 0 ? (
                      <ul className="space-y-2 text-sm text-foreground">
                        {ingredients.map((ing, i) => (
                          <li key={i}>• {formatIngredient(ing)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Ingredients aren't available for this recipe yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>

              {/* Instructions */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Instructions</h3>
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-4">
                    {instructions.length > 0 ? (
                      instructions.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{i + 1}</span>
                          </div>
                          <p className="text-sm text-foreground">{step}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Instructions aren't available for this recipe yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div className="shrink-0 p-4 bg-background border-t border-border space-y-2">
        <Button
          onClick={handleAddMeal}
          className="w-full h-12 rounded-xl gap-2"
        >
          Log this meal <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/ai-coach")}
          className="w-full h-12 rounded-xl gap-2"
        >
          Consult AI Coach <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MealDetail;
