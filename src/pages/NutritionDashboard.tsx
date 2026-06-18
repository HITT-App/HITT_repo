import { useState, useEffect } from "react";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  ScanBarcode,
  Camera,
  Droplets,
  MoreHorizontal,
  Zap,
  ArrowLeftRight,
  Coffee,
  UtensilsCrossed,
  CookingPot,
  Apple,
  Pencil,
  Trash2,
  Settings2,
} from "lucide-react";
import { useNutritionPreferences } from "@/hooks/useNutritionPreferences";
import { ALLERGEN_OPTIONS, DIETARY_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, getDay, isToday } from "date-fns";
import { getMealPlan, markMealPlanLogged } from "@/lib/mealPlanStorage";
import type { MealInPlan } from "@/hooks/useAI.types";

type MealLog = {
  id: string;
  custom_name?: string;
  category: string;
  calories: number;
  protein_grams: number;
  fat_grams: number;
  carbs_grams: number;
  fiber_grams?: number;
  servings?: number;
  logged_at: string;
  meals?: { name: string; image_url?: string };
};

const DIARY_CATEGORIES = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
];

type NutritionGoals = {
  daily_calories: number;
  daily_protein_grams: number;
  daily_fat_grams: number;
  daily_carbs_grams: number;
};

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const today = new Date();
today.setHours(23, 59, 59, 999);

const quickActions = [
  { label: "Log Food", icon: Search, color: "text-blue-400", route: "/log-meal" },
  { label: "Barcode Scan", icon: ScanBarcode, color: "text-pink-400", route: "/barcode-scanner" },
  { label: "Log Water", icon: Droplets, color: "text-cyan-400", route: "/hydration" },
  { label: "Meal Scan", icon: Camera, color: "text-teal-400", route: "/meal-scanner" },
];

const diaryMeals = [
  { label: "Breakfast", icon: Coffee, route: "/log-meal?category=breakfast" },
  { label: "Lunch", icon: UtensilsCrossed, route: "/log-meal?category=lunch" },
  { label: "Dinner", icon: CookingPot, route: "/log-meal?category=dinner" },
  { label: "Snack", icon: Apple, route: "/log-meal?category=snack" },
];

export default function NutritionDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [goals, setGoals] = useState<NutritionGoals>({
    daily_calories: 3320,
    daily_protein_grams: 166,
    daily_fat_grams: 111,
    daily_carbs_grams: 415,
  });
  const [macroView, setMacroView] = useState<'grams' | 'percent'>('grams');
  const [actionLog, setActionLog] = useState<MealLog | null>(null);
  const [editLog, setEditLog] = useState<MealLog | null>(null);
  const [deleteLog, setDeleteLog] = useState<MealLog | null>(null);
  const [editForm, setEditForm] = useState({
    custom_name: '',
    category: 'breakfast',
    calories: '',
    protein_grams: '',
    fat_grams: '',
    carbs_grams: '',
    fiber_grams: '',
    servings: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [editDietPrefs, setEditDietPrefs] = useState<string[]>([]);
  const [editAllergies, setEditAllergies] = useState<string[]>([]);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [suggestedMeals, setSuggestedMeals] = useState<MealInPlan[]>([]);
  const [suggestedLogged, setSuggestedLogged] = useState<Set<string>>(new Set());
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const keyboardHeight = useKeyboardHeight();
  const { data: nutritionPrefs, save: savePrefs } = useNutritionPreferences();

  const currentDayIndex = getDay(selectedDate);

  // Sunday of the week containing selectedDate
  const weekSunday = new Date(selectedDate);
  weekSunday.setDate(selectedDate.getDate() - currentDayIndex);
  weekSunday.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekSunday);
    d.setDate(weekSunday.getDate() + i);
    return d;
  });

  const canGoNextWeek = new Date(weekSunday.getTime() + 7 * 24 * 60 * 60 * 1000) <= today;

  const goToPrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d);
  };

  const goToNextWeek = () => {
    if (!canGoNextWeek) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d > today ? today : d);
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const stored = getMealPlan(user.id, dateStr);
    setSuggestedMeals(stored?.meals ?? []);
    setSuggestedLogged(new Set(stored?.loggedNames ?? []));
  }, [user, selectedDate]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('nutrition-dashboard-meal-logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'meal_logs',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedDate]);

  const fetchData = async () => {
    if (!user) return;

    const [{ data: goalsData }, { data: prefsData }] = await Promise.all([
      supabase.from("nutrition_goals").select("*").eq("user_id", user.id).single(),
      supabase
        .from("nutrition_profiles")
        .select("daily_calorie_target")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (goalsData) {
      setGoals(prev => ({
        ...prev,
        ...goalsData,
        // nutrition_profiles calorie target wins when present
        ...(prefsData?.daily_calorie_target != null
          ? { daily_calories: prefsData.daily_calorie_target }
          : {}),
      }));
    } else if (prefsData?.daily_calorie_target != null) {
      setGoals(prev => ({ ...prev, daily_calories: prefsData.daily_calorie_target! }));
    }

    const { data: logsData } = await supabase
      .from("meal_logs")
      .select("*, meals(name, image_url)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("logged_at", startOfDay(selectedDate).toISOString())
      .lte("logged_at", endOfDay(selectedDate).toISOString())
      .order("logged_at", { ascending: false });

    if (logsData) setMealLogs(logsData as MealLog[]);
  };

  const logSuggestedMeal = async (meal: MealInPlan) => {
    if (!user || suggestedLogged.has(meal.name)) return;
    const { error } = await supabase.from('meal_logs').insert({
      user_id: user.id,
      custom_name: meal.name,
      category: meal.meal_type,
      calories: meal.calories,
      protein_grams: meal.protein_g,
      carbs_grams: meal.carbs_g,
      fat_grams: meal.fat_g,
      fiber_grams: 0,
      logged_at: selectedDate.toISOString(),
    });
    if (!error) {
      markMealPlanLogged(user.id, meal.name);
      setSuggestedLogged(prev => new Set([...prev, meal.name]));
    }
  };

  const openEdit = (log: MealLog) => {
    setEditForm({
      custom_name: log.custom_name ?? log.meals?.name ?? '',
      category: log.category.toLowerCase(),
      calories: String(log.calories),
      protein_grams: String(log.protein_grams),
      fat_grams: String(log.fat_grams),
      carbs_grams: String(log.carbs_grams),
      fiber_grams: String(log.fiber_grams ?? 0),
      servings: String(log.servings ?? 1),
    });
    setEditLog(log);
    setActionLog(null);
  };

  const handleSave = async () => {
    if (!editLog) return;
    setEditSaving(true);
    await supabase.from('meal_logs').update({
      custom_name: editForm.custom_name.trim() || null,
      category: editForm.category,
      calories: Number(editForm.calories) || 0,
      protein_grams: Number(editForm.protein_grams) || 0,
      fat_grams: Number(editForm.fat_grams) || 0,
      carbs_grams: Number(editForm.carbs_grams) || 0,
      fiber_grams: Number(editForm.fiber_grams) || 0,
      servings: Number(editForm.servings) || 1,
    }).eq('id', editLog.id);
    setEditSaving(false);
    setEditLog(null);
    fetchData();
  };

  const openPrefsSheet = () => {
    setEditDietPrefs(nutritionPrefs?.food_preferences ?? []);
    setEditAllergies(nutritionPrefs?.allergies ?? []);
    setPrefsOpen(true);
  };

  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    await savePrefs({ food_preferences: editDietPrefs, allergies: editAllergies });
    setPrefsSaving(false);
    setPrefsOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteLog) return;
    setDeleteConfirming(true);
    await supabase.from('meal_logs').update({ deleted_at: new Date().toISOString() }).eq('id', deleteLog.id);
    setDeleteConfirming(false);
    setDeleteLog(null);
    setActionLog(null);
    fetchData();
  };

  const todayTotals = mealLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein_grams || 0),
      fat: acc.fat + (log.fat_grams || 0),
      carbs: acc.carbs + (log.carbs_grams || 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const caloriesLeft = Math.max(0, goals.daily_calories - todayTotals.calories);
  const calPct = Math.min(100, (todayTotals.calories / goals.daily_calories) * 100);
  const carbsPct = Math.min(100, (todayTotals.carbs / goals.daily_carbs_grams) * 100);
  const fatPct = Math.min(100, (todayTotals.fat / goals.daily_fat_grams) * 100);
  const proteinPct = Math.min(100, (todayTotals.protein / goals.daily_protein_grams) * 100);

  // Group logs by category for diary
  const logsByCategory = mealLogs.reduce<Record<string, MealLog[]>>((acc, log) => {
    const cat = log.category.toLowerCase();
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(log);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {/* Header — date picker always visible */}
      <header className="shrink-0 bg-background border-b border-border/60 px-5 py-3">
        <div className="flex items-center justify-between">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5">
                <h1 className="text-2xl font-bold text-foreground">
                  {isToday(selectedDate) ? "Today" : format(selectedDate, "MMM d")}
                </h1>
                {calendarOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCalendarOpen(false);
                  }
                }}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-1 text-foreground">
            <span className="font-semibold text-sm">0</span>
            <Zap className="w-4 h-4 text-primary" />
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
      <div className="px-5 pt-4 pb-28 space-y-6">

          {/* Week Day Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevWeek}
              className="p-1 rounded-lg text-muted-foreground active:bg-secondary transition-colors touch-manipulation"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-1 justify-between">
              {weekDays.map((day, i) => {
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                const isFuture = day > today;
                const isCurrentDay = isToday(day);
                return (
                  <button
                    key={i}
                    onClick={() => !isFuture && setSelectedDate(day)}
                    disabled={isFuture}
                    className={cn(
                      "flex flex-col items-center gap-1 touch-manipulation",
                      isFuture && "opacity-30"
                    )}
                  >
                    <span className={cn(
                      "text-[11px] font-medium",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}>
                      {DAYS[i]}
                    </span>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : isCurrentDay
                          ? "border-2 border-primary/50 text-foreground"
                          : "text-foreground"
                    )}>
                      {day.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={goToNextWeek}
              disabled={!canGoNextWeek}
              className="p-1 rounded-lg text-muted-foreground active:bg-secondary transition-colors touch-manipulation disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calories Card */}
          <Card className="border-0 bg-card">
            <CardContent className="p-5 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Calories</p>
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-foreground">
                      {todayTotals.calories.toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      cal
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {goals.daily_calories.toLocaleString()}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {caloriesLeft.toLocaleString()} left
                  </span>
                </div>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${calPct}%` }}
                  />
                </div>
              </div>

              {/* Macros Sub-card */}
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="grid grid-cols-3 gap-6 flex-1">
                    {[
                      { label: 'Carbs', value: todayTotals.carbs, goal: goals.daily_carbs_grams, pct: carbsPct, color: 'bg-yellow-500' },
                      { label: 'Fat',   value: todayTotals.fat,   goal: goals.daily_fat_grams,   pct: fatPct,   color: 'bg-blue-500'   },
                      { label: 'Protein', value: todayTotals.protein, goal: goals.daily_protein_grams, pct: proteinPct, color: 'bg-red-500' },
                    ].map(({ label, value, goal, pct, color }) => (
                      <div key={label}>
                        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                        {macroView === 'grams' ? (
                          <p className="text-foreground font-bold text-base">
                            {value} g{" "}
                            <span className="font-normal text-xs text-muted-foreground">/ {goal}</span>
                          </p>
                        ) : (
                          <p className="text-foreground font-bold text-base">
                            {Math.round(pct)}<span className="text-sm font-normal">%</span>
                          </p>
                        )}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setMacroView(v => v === 'grams' ? 'percent' : 'grams')}
                    className={cn(
                      "ml-3 mt-1 p-1.5 rounded-lg transition-colors touch-manipulation",
                      macroView === 'percent' ? "bg-primary/15 text-primary" : "text-muted-foreground active:bg-muted"
                    )}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.route)}
                className="flex flex-col items-center justify-center gap-2.5 bg-card rounded-2xl p-6 active:scale-[0.97] transition-transform touch-manipulation"
              >
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                  <action.icon className={cn("w-5 h-5", action.color)} />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Diary Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-foreground">Diary</h2>
              <button
                className="text-sm text-primary font-medium"
                onClick={() => navigate("/nutrition")}
              >
                View all
              </button>
            </div>
            <div className="space-y-2.5">
              {diaryMeals.map((meal) => {
                const logs = logsByCategory[meal.label.toLowerCase()] || [];
                const mealCalories = logs.reduce((s, l) => s + (l.calories || 0), 0);
                const suggestions = suggestedMeals.filter(s => s.meal_type === meal.label.toLowerCase());

                return (
                  <Card key={meal.label} className="border-0 bg-card">
                    <CardContent className="p-0">
                      <div className="flex items-center px-5 py-4">
                        <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center mr-3">
                          <meal.icon className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{meal.label}</p>
                          {logs.length > 0 && (
                            <p className="text-xs text-muted-foreground">{mealCalories} kcal</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-primary border-primary/30 hover:bg-primary/10 h-8 px-4 text-xs font-semibold"
                            onClick={() => navigate(meal.route)}
                          >
                            Log
                          </Button>
                        </div>
                      </div>

                      {/* Jarvis-suggested meals for this category */}
                      {suggestions.length > 0 && (
                        <div className="px-5 pb-3 space-y-1 border-t border-border/30 pt-2">
                          <p className="text-[10px] font-medium text-primary/70 uppercase tracking-wide mb-1.5">Suggested by HIIT Coach</p>
                          {suggestions.map((s) => {
                            const alreadyLogged = suggestedLogged.has(s.name);
                            const expanded = expandedSuggestion === s.name;
                            const hasDetail = (s.ingredients && s.ingredients.length > 0) || (s.instructions && s.instructions.length > 0);
                            return (
                              <div key={s.name} className="rounded-xl border border-border/40 overflow-hidden">
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-between py-2 px-2 text-xs text-left gap-2"
                                  onClick={() => hasDetail && setExpandedSuggestion(expanded ? null : s.name)}
                                >
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <span className="truncate text-muted-foreground">{s.name}</span>
                                    <span className="text-muted-foreground/60 shrink-0">{s.calories} kcal</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {hasDetail && (
                                      <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground/60 transition-transform', expanded && 'rotate-180')} />
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); logSuggestedMeal(s); }}
                                      disabled={alreadyLogged}
                                      className={cn(
                                        "text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors touch-manipulation",
                                        alreadyLogged
                                          ? "text-muted-foreground/40 border border-border/30"
                                          : "text-primary border border-primary/40 active:bg-primary/10"
                                      )}
                                    >
                                      {alreadyLogged ? "✓ Logged" : "Log"}
                                    </button>
                                  </div>
                                </button>

                                {expanded && hasDetail && (
                                  <div className="px-2 pb-2.5 space-y-2 border-t border-border/30 pt-2">
                                    {s.ingredients && s.ingredients.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-foreground mb-1">Ingredients</p>
                                        <ul className="space-y-0.5">
                                          {s.ingredients.map((ing, i) => (
                                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                                              <span className="shrink-0 text-foreground/70">{ing.amount} {ing.unit}</span>
                                              <span>{ing.name}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {s.instructions && s.instructions.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-semibold text-foreground mb-1">Method</p>
                                        <ol className="space-y-0.5">
                                          {s.instructions.map((step, i) => (
                                            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                                              <span className="shrink-0 font-medium text-foreground/60">{i + 1}.</span>
                                              <span>{step}</span>
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Show logged items */}
                      {logs.length > 0 && (
                        <div className={cn("px-5 pb-3 space-y-1", suggestions.length > 0 ? "" : "")}>
                          {logs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between py-1.5 text-xs text-muted-foreground">
                              <span className="flex-1 truncate">{log.custom_name || log.meals?.name || "Meal"}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span>{log.calories} kcal</span>
                                <button
                                  className="text-muted-foreground/60 hover:text-muted-foreground active:scale-90 transition-transform touch-manipulation"
                                  onClick={() => setActionLog(log)}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Dietary Preferences Card */}
          <Card className="border-0 bg-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-foreground">Dietary preferences</h2>
                <button
                  onClick={openPrefsSheet}
                  className="flex items-center gap-1 text-xs text-primary font-medium active:opacity-70 touch-manipulation"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Diet style</p>
                  {(nutritionPrefs?.food_preferences?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {nutritionPrefs!.food_preferences.map(pref => (
                        <span key={pref} className="rounded-full px-3 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {pref}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Not set — tap Edit to add preferences</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Allergens</p>
                  {(nutritionPrefs?.allergies?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {nutritionPrefs!.allergies.map(a => (
                        <span key={a} className="rounded-full px-3 py-1 text-xs font-medium bg-destructive/10 text-destructive">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">None</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action sheet — Edit or Delete */}
      <Drawer open={!!actionLog && !editLog && !deleteLog} onOpenChange={(open) => { if (!open) setActionLog(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-base">{actionLog?.custom_name || actionLog?.meals?.name || "Meal"}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-8 space-y-2">
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-muted/50 active:bg-muted transition-colors text-sm font-medium touch-manipulation"
              onClick={() => actionLog && openEdit(actionLog)}
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
              Edit entry
            </button>
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-muted/50 active:bg-muted transition-colors text-sm font-medium text-destructive touch-manipulation"
              onClick={() => { setDeleteLog(actionLog); setActionLog(null); }}
            >
              <Trash2 className="w-4 h-4" />
              Delete entry
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit drawer */}
      <Drawer open={!!editLog} onOpenChange={(open) => { if (!open) setEditLog(null); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit entry</DrawerTitle>
          </DrawerHeader>
          <div className="px-5 pb-4 space-y-4 overflow-y-auto max-h-[65vh]">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                value={editForm.custom_name}
                onChange={(e) => setEditForm(f => ({ ...f, custom_name: e.target.value }))}
                placeholder="Meal name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIARY_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Calories (kcal)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={editForm.calories}
                  onChange={(e) => setEditForm(f => ({ ...f, calories: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Servings</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={editForm.servings}
                  onChange={(e) => setEditForm(f => ({ ...f, servings: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.protein_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, protein_grams: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.carbs_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, carbs_grams: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fat (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.fat_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, fat_grams: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fiber (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.fiber_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, fiber_grams: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DrawerFooter
            className="px-5 pt-2 flex-row gap-3"
            style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 8 : 32 }}
          >
            <Button variant="outline" className="flex-1" onClick={() => setEditLog(null)}>Cancel</Button>
            <Button className="flex-1" disabled={editSaving} onClick={handleSave}>
              {editSaving ? "Saving…" : "Save changes"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Dietary Preferences Edit Drawer */}
      <Drawer open={prefsOpen} onOpenChange={(open) => { if (!open) setPrefsOpen(false); }}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit dietary preferences</DrawerTitle>
          </DrawerHeader>
          <div className="px-5 pb-4 space-y-5 overflow-y-auto max-h-[65vh]">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Diet style</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEditDietPrefs(prev =>
                      prev.includes(opt) ? prev.filter(p => p !== opt) : [...prev, opt]
                    )}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors border touch-manipulation",
                      editDietPrefs.includes(opt)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-foreground border-border/40"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Allergens & intolerances</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGEN_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setEditAllergies(prev =>
                      prev.includes(opt) ? prev.filter(a => a !== opt) : [...prev, opt]
                    )}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-colors border touch-manipulation",
                      editAllergies.includes(opt)
                        ? "bg-destructive/20 text-destructive border-destructive/40"
                        : "bg-secondary text-foreground border-border/40"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Tap to select — leave blank if none</p>
            </div>
          </div>
          <DrawerFooter
            className="px-5 pt-2 flex-row gap-3"
            style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 8 : 32 }}
          >
            <Button variant="outline" className="flex-1" onClick={() => setPrefsOpen(false)}>Cancel</Button>
            <Button className="flex-1" disabled={prefsSaving} onClick={handleSavePrefs}>
              {prefsSaving ? "Saving…" : "Save"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete confirm dialog */}
      <AlertDialog open={!!deleteLog} onOpenChange={(open) => { if (!open) setDeleteLog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entry?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteLog?.custom_name || deleteLog?.meals?.name || "This entry"}" will be removed from your diary. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteConfirming}
            >
              {deleteConfirming ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
