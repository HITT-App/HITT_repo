import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BottomNav } from '@/components/BottomNav';
import { ArrowLeft, Bell, Plus, ChevronRight, Flame, Droplets, Wheat, Apple, Calendar, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

type MealLog = {
  id: string;
  custom_name?: string;
  category: string;
  calories: number;
  protein_grams: number;
  fat_grams: number;
  carbs_grams: number;
  logged_at: string;
  meals?: { name: string; image_url?: string };
};

type NutritionGoals = {
  daily_calories: number;
  daily_protein_grams: number;
  daily_fat_grams: number;
  daily_carbs_grams: number;
};

export default function NutritionDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>({
    daily_calories: 2000,
    daily_protein_grams: 50,
    daily_fat_grams: 65,
    daily_carbs_grams: 250,
  });
  const [nutritionScore, setNutritionScore] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch goals
    const { data: goalsData } = await supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (goalsData) {
      setGoals(goalsData);
    }

    // Fetch today's meal logs
    const today = new Date();
    const { data: logsData } = await supabase
      .from('meal_logs')
      .select('*, meals(name, image_url)')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay(today).toISOString())
      .lte('logged_at', endOfDay(today).toISOString())
      .order('logged_at', { ascending: false });

    if (logsData) {
      setMealLogs(logsData as MealLog[]);
      
      // Calculate nutrition score based on how close to goals
      const totals = logsData.reduce((acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein_grams || 0),
        fat: acc.fat + (log.fat_grams || 0),
        carbs: acc.carbs + (log.carbs_grams || 0),
      }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

      const calorieScore = Math.min(100, (totals.calories / goals.daily_calories) * 100);
      const proteinScore = Math.min(100, (totals.protein / goals.daily_protein_grams) * 100);
      setNutritionScore(Math.round((calorieScore + proteinScore) / 2));
    }
  };

  const todayTotals = mealLogs.reduce((acc, log) => ({
    calories: acc.calories + (log.calories || 0),
    protein: acc.protein + (log.protein_grams || 0),
    fat: acc.fat + (log.fat_grams || 0),
    carbs: acc.carbs + (log.carbs_grams || 0),
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const caloriePercentage = Math.min(100, (todayTotals.calories / goals.daily_calories) * 100);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Nutrition</h1>
        </div>
        <Button variant="ghost" size="icon">
          <Bell className="w-5 h-5" />
        </Button>
      </header>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-4 space-y-6">
          {/* Nutrition Score Card */}
          <Card className="border-border/50">
            <CardContent className="p-6 text-center">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="12"
                    strokeDasharray={`${nutritionScore * 3.52} 352`}
                    strokeLinecap="round"
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{nutritionScore}</span>
                  <span className="text-xs text-muted-foreground">Score</span>
                </div>
              </div>
              <h2 className="text-lg font-semibold mb-1">Nutrition Score</h2>
              <p className="text-sm text-muted-foreground">
                {nutritionScore === 0 
                  ? "Let's start logging your first meal!" 
                  : nutritionScore < 50 
                    ? "You need more protein intake this week." 
                    : "Great progress! Keep it up!"
                }
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              className="h-12 rounded-2xl gap-2"
              onClick={() => navigate('/log-meal')}
            >
              <Plus className="w-4 h-4" />
              Log New Meal
            </Button>
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl gap-2"
              onClick={() => navigate('/browse-meals')}
            >
              Browse Meals
            </Button>
          </div>

          {/* Browse Meals Card */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Browse Meals</h3>
                  <p className="text-sm text-muted-foreground">
                    Explore a myriad of meals exclusively curated from our team.
                  </p>
                </div>
              </div>
              <Button 
                variant="link" 
                className="px-4 pb-4 text-primary"
                onClick={() => navigate('/browse-meals')}
              >
                Browse Meals
              </Button>
            </CardContent>
          </Card>

          {/* Nutrition Insight */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nutrition Insight</h3>
              <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
            </div>
            
            {mealLogs.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-6 text-center">
                  <Apple className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Not enough data to show nutrition insight
                  </p>
                  <Button 
                    variant="link" 
                    className="text-primary mt-2"
                    onClick={() => navigate('/log-meal')}
                  >
                    Log Nutrition +
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    {/* Calorie Ring */}
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
                        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={`${caloriePercentage * 2.51} 251`} strokeLinecap="round" className="text-primary" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold">{todayTotals.calories.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground">kcal total</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-muted-foreground">{goals.daily_calories - todayTotals.calories}</span>
                        <span className="text-muted-foreground">{goals.daily_calories.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>remaining</span>
                        <span>target</span>
                      </div>
                    </div>
                  </div>

                  {/* Macros */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (todayTotals.protein / goals.daily_protein_grams) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Protein</p>
                      <p className="text-sm font-medium">{todayTotals.protein}/{goals.daily_protein_grams}g</p>
                    </div>
                    <div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min(100, (todayTotals.fat / goals.daily_fat_grams) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Fat</p>
                      <p className="text-sm font-medium">{todayTotals.fat}/{goals.daily_fat_grams}g</p>
                    </div>
                    <div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (todayTotals.carbs / goals.daily_carbs_grams) * 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                      <p className="text-sm font-medium">{todayTotals.carbs}/{goals.daily_carbs_grams}g</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    You're on track for your calorie goal today! Keep it up, okay!
                  </p>
                  <Button variant="link" className="w-full text-primary mt-2">
                    See Nutrition Dashboard →
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Nutrition History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nutrition History</h3>
              <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
            </div>
            
            {mealLogs.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="p-6 text-center">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Log your first meal to see your history
                  </p>
                  <Button 
                    variant="link" 
                    className="text-primary mt-2"
                    onClick={() => navigate('/log-meal')}
                  >
                    Log Nutrition +
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {mealLogs.slice(0, 3).map((log) => (
                  <Card key={log.id} className="border-border/50">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <Apple className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{log.custom_name || log.meals?.name || 'Meal'}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{log.calories}kcal</span>
                          <span>🥩 {log.protein_grams}g</span>
                          <span>🧈 {log.fat_grams}g</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.logged_at), 'MMM dd')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Nutrition Goal */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Nutrition Goal</h3>
              <Button variant="link" className="text-primary p-0 h-auto">See All</Button>
            </div>
            
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-full h-full -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-secondary" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray={`${caloriePercentage * 1.76} 176`} strokeLinecap="round" className="text-primary" />
                    </svg>
                    <Target className="absolute inset-0 m-auto w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Let's set up your nutrition goal to get a better overall metabolism.
                    </p>
                    <Button 
                      variant="link" 
                      className="text-primary p-0 h-auto mt-1"
                      onClick={() => navigate('/nutrition-onboarding')}
                    >
                      Set Up Goal →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>

      <BottomNav onCenterClick={() => {}} />
    </div>
  );
}
