import { useState, useEffect } from "react";
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
  Search,
  ScanBarcode,
  Mic,
  Camera,
  Droplets,
  Scale,
  Flame,
  MoreHorizontal,
  Zap,
  ArrowLeftRight,
  Coffee,
  UtensilsCrossed,
  CookingPot,
  Apple,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, getDay, isToday } from "date-fns";

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

const quickActions = [
  { label: "Log Food", icon: Search, color: "text-blue-400" },
  { label: "Barcode Scan", icon: ScanBarcode, color: "text-pink-400" },
  { label: "Voice Log", icon: Mic, color: "text-purple-400" },
  { label: "Meal Scan", icon: Camera, color: "text-teal-400" },
];

const quickLinks = [
  { label: "Water", icon: Droplets, color: "text-blue-400", route: "/hydration" },
  { label: "Weight", icon: Scale, color: "text-green-400", route: "/weight" },
  { label: "Exercise", icon: Flame, color: "text-orange-400", route: "/activity" },
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
  const [actionLog, setActionLog] = useState<MealLog | null>(null);
  const [editLog, setEditLog] = useState<MealLog | null>(null);
  const [deleteLog, setDeleteLog] = useState<MealLog | null>(null);
  const [editForm, setEditForm] = useState({
    custom_name: '',
    category: 'breakfast',
    calories: 0,
    protein_grams: 0,
    fat_grams: 0,
    carbs_grams: 0,
    fiber_grams: 0,
    servings: 1,
  });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirming, setDeleteConfirming] = useState(false);

  const currentDayIndex = getDay(selectedDate);

  useEffect(() => {
    if (!user) return;
    fetchData();
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

  const openEdit = (log: MealLog) => {
    setEditForm({
      custom_name: log.custom_name ?? log.meals?.name ?? '',
      category: log.category.toLowerCase(),
      calories: log.calories,
      protein_grams: log.protein_grams,
      fat_grams: log.fat_grams,
      carbs_grams: log.carbs_grams,
      fiber_grams: log.fiber_grams ?? 0,
      servings: log.servings ?? 1,
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
      calories: editForm.calories,
      protein_grams: editForm.protein_grams,
      fat_grams: editForm.fat_grams,
      carbs_grams: editForm.carbs_grams,
      fiber_grams: editForm.fiber_grams,
      servings: editForm.servings,
    }).eq('id', editLog.id);
    setEditSaving(false);
    setEditLog(null);
    fetchData();
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
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky header — date picker + quick actions always visible */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border/40 px-5 pb-3" style={{ paddingTop: "calc(var(--safe-area-inset-top, 0px) + 12px)" }}>
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
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="rounded-full bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-0 font-semibold text-xs px-4 h-8"
              onClick={() => navigate("/subscription")}
            >
              Go Premium
            </Button>
            <div className="flex items-center gap-1 text-foreground">
              <span className="font-semibold text-sm">0</span>
              <Zap className="w-4 h-4 text-primary" />
            </div>
          </div>
        </div>
      </header>
      <div className="px-5 pt-4 pb-8 space-y-6">

          {/* Week Day Selector */}
          <div className="flex justify-between px-1">
            {DAYS.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-medium",
                    i === currentDayIndex ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {day}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center",
                    i === currentDayIndex
                      ? "border-primary border-dashed"
                      : "border-muted-foreground/30"
                  )}
                >
                  {i === currentDayIndex && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))}
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
                    {/* Carbs */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Carbs</p>
                      <p className="text-foreground font-bold text-base">
                        {todayTotals.carbs} g{" "}
                        <span className="font-normal text-xs text-muted-foreground">
                          / {goals.daily_carbs_grams}
                        </span>
                      </p>
                      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${carbsPct}%` }}
                        />
                      </div>
                    </div>
                    {/* Fat */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Fat</p>
                      <p className="text-foreground font-bold text-base">
                        {todayTotals.fat} g{" "}
                        <span className="font-normal text-xs text-muted-foreground">
                          / {goals.daily_fat_grams}
                        </span>
                      </p>
                      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${fatPct}%` }}
                        />
                      </div>
                    </div>
                    {/* Protein */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Protein</p>
                      <p className="text-foreground font-bold text-base">
                        {todayTotals.protein} g{" "}
                        <span className="font-normal text-xs text-muted-foreground">
                          / {goals.daily_protein_grams}
                        </span>
                      </p>
                      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${proteinPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <button className="ml-3 mt-1 text-muted-foreground">
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
                onClick={() => {
                  if (action.label === "Log Food") navigate("/log-meal");
                  else if (action.label === "Meal Scan") navigate("/meal-scanner");
                  else if (action.label === "Barcode Scan") navigate("/barcode-scanner");
                }}
                className="flex flex-col items-center justify-center gap-2.5 bg-card rounded-2xl p-6 active:scale-[0.97] transition-transform touch-manipulation"
              >
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                  <action.icon className={cn("w-5 h-5", action.color)} />
                </div>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Links */}
          <Card className="border-0 bg-card">
            <CardContent className="p-0 divide-y divide-border">
              {quickLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => navigate(link.route)}
                  className="w-full flex items-center gap-3 px-5 py-4 active:bg-muted/50 transition-colors touch-manipulation"
                >
                  <link.icon className={cn("w-5 h-5", link.color)} />
                  <span className="text-sm font-medium text-foreground">{link.label}</span>
                </button>
              ))}
            </CardContent>
          </Card>

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
                      {/* Show logged items */}
                      {logs.length > 0 && (
                        <div className="px-5 pb-3 space-y-1">
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
                  onChange={(e) => setEditForm(f => ({ ...f, calories: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Servings</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={editForm.servings}
                  onChange={(e) => setEditForm(f => ({ ...f, servings: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Protein (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.protein_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, protein_grams: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.carbs_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, carbs_grams: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fat (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.fat_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, fat_grams: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Fiber (g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={editForm.fiber_grams}
                  onChange={(e) => setEditForm(f => ({ ...f, fiber_grams: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DrawerFooter className="px-5 pb-8 pt-2 flex-row gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setEditLog(null)}>Cancel</Button>
            <Button className="flex-1" disabled={editSaving} onClick={handleSave}>
              {editSaving ? "Saving…" : "Save changes"}
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
