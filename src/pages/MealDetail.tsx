import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Clock, 
  Star, 
  Flame, 
  Users, 
  Check, 
  Plus,
  ThumbsUp,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";

import mealImage from "@/assets/meal-steak-salsa.jpg";

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
  ingredients: any;
  instructions: any;
};

// Mock benefits for display
const mockBenefits = [
  "High in protein for muscle growth",
  "Healthy fats from avocado",
  "Rich in vitamins and antioxidants",
  "Low-carb and keto-friendly",
  "It's easy to prepare",
];

// Mock gallery images
const mockGallery = [
  mealImage,
  mealImage,
  mealImage,
  mealImage,
  mealImage,
];

// Mock instructions
const mockInstructions = [
  { title: "Prepare the Steak", desc: "Rub the steaks with olive oil and season evenly with salt, pepper, garlic powder, and smoked paprika." },
  { title: "Make the Avocado Salsa", desc: "In a bowl, gently mix the diced avocado, red onion, cherry tomatoes, cilantro, lime juice, salt, and chili flakes." },
  { title: "Assemble & Serve", desc: "Serve with grilled vegetables or a side of rice for a complete meal." },
];

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
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setMeal(data as Meal);
    }
    setIsLoading(false);
  };

  const handleAddMeal = () => {
    toast.success("Meal added to your log!");
  };

  const totalTime = (meal?.prep_time_minutes || 0) + (meal?.cook_time_minutes || 0);
  const nutritionScore = 87.2; // Mock score

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

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      <div className="flex-1 overflow-y-auto pb-24">
      {/* Hero Image */}
      <div className="relative h-64">
        <img 
          src={meal.image_url || mealImage} 
          alt={meal.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />
        
        {/* Header */}
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

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Category Badge */}
          <div className="flex justify-center">
            <Badge variant="outline" className="text-primary border-primary">
              🍳 {meal.category.charAt(0).toUpperCase() + meal.category.slice(1)}
            </Badge>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">{meal.name}</h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
              {meal.description || "Tender, healthy, and juicy — all the same time for a better life."}
            </p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="font-semibold text-foreground">{totalTime > 0 ? `${meal.prep_time_minutes || 10}-${totalTime}` : "10-20"}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Minutes
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{meal.rating || 4.6}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-primary" /> Rating
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{meal.calories || 648}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-primary" /> kcal
              </p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
              <TabsTrigger value="recipe" className="rounded-xl">Recipe</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Description */}
              <section>
                <h3 className="font-semibold text-foreground mb-2">Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Indulge in the rich, smoky flavors of perfectly grilled steak, topped with a refreshing and creamy avocado salsa. This deluxe dish combines tender, juicy beef with zesty lime, fresh herbs, and a hint of spice for a gourmet experience in every bite.
                </p>
              </section>

              {/* Benefits */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Benefits</h3>
                <div className="space-y-2">
              {mockBenefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{benefit}</span>
                </div>
                  ))}
                </div>
              </section>

              {/* Tags */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {(meal.tags || ["Avocado", "Steak", "Diet", "Gluten Free", "Keto"]).map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-muted-foreground">
                      # {tag}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* Gallery */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">Galleries</h3>
                  <Button variant="link" className="text-primary p-0 h-auto text-sm">See All</Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mockGallery.map((img, i) => (
                    <div 
                      key={i} 
                      className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Preparation Time */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Preparation Time</h3>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="relative h-32 flex items-center justify-center">
                      {/* Semi-circular progress */}
                      <svg className="w-40 h-20" viewBox="0 0 160 80">
                        <path
                          d="M 10 80 A 70 70 0 0 1 150 80"
                          fill="none"
                          stroke="hsl(var(--secondary))"
                          strokeWidth="12"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 80 A 70 70 0 0 1 150 80"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray="220"
                          strokeDashoffset="110"
                        />
                        <circle cx="150" cy="80" r="6" fill="hsl(var(--primary))" />
                      </svg>
                      <div className="absolute bottom-0 text-center">
                        <p className="text-2xl font-bold text-foreground">30-45</p>
                        <p className="text-xs text-muted-foreground">Total minutes</p>
                        <p className="text-xs text-muted-foreground">Moderate cooking time</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Nutrition Level */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Nutrition Level</h3>
                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ThumbsUp className="w-5 h-5 text-primary" />
                        <span className="text-2xl font-bold text-foreground">{nutritionScore}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">Good for diet</p>
                      <p className="text-xs text-muted-foreground">This meal is good for metabolism and diet.</p>
                    </div>
                    <div className="w-20 h-20 rounded-xl overflow-hidden">
                      <img src={mealImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>

            <TabsContent value="recipe" className="mt-6 space-y-6">
              {/* Instructions */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Instructions</h3>
                <Card className="border-border/50">
                  <CardContent className="p-4 space-y-4">
                    {mockInstructions.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{step.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>

              {/* Ingredients */}
              <section>
                <h3 className="font-semibold text-foreground mb-3">Ingredients</h3>
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <ul className="space-y-2 text-sm text-foreground">
                      <li>• 2 ribeye steaks (about 1 inch thick)</li>
                      <li>• 2 ripe avocados, diced</li>
                      <li>• 1/4 cup red onion, finely diced</li>
                      <li>• 1/2 cup cherry tomatoes, halved</li>
                      <li>• 2 tbsp fresh cilantro, chopped</li>
                      <li>• Juice of 1 lime</li>
                      <li>• Salt, pepper, garlic powder to taste</li>
                    </ul>
                  </CardContent>
                </Card>
              </section>
            </TabsContent>
          </Tabs>

          {/* You might also like */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">You might also like</h3>
              <Button variant="link" className="text-primary p-0 h-auto text-sm">See All</Button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2].map((i) => (
                <Card key={i} className="min-w-[140px] border-border/50">
                  <div className="aspect-square relative">
                    <img src={mealImage} alt="" className="w-full h-full object-cover rounded-t-lg" />
                    <Badge className="absolute top-2 left-2 bg-primary/20 text-primary text-xs">
                      Vegetable
                    </Badge>
                  </div>
                  <CardContent className="p-2">
                    <p className="font-medium text-sm text-foreground truncate">Mushroom Rice Bowl Deluxe</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 30 min
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-primary" /> 30 kcal
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
      </div>

      {/* Fixed Bottom Actions */}
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
