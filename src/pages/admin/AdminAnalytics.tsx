import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Activity, UtensilsCrossed, Dumbbell, Loader2 } from "lucide-react";
import { format, subDays, startOfDay } from "date-fns";

interface DailyStats {
  date: string;
  users: number;
  workouts: number;
  meals: number;
}

interface CategoryStats {
  name: string;
  value: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function AdminAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [workoutCategories, setWorkoutCategories] = useState<CategoryStats[]>([]);
  const [mealCategories, setMealCategories] = useState<CategoryStats[]>([]);

  const fetchAnalytics = async () => {
    try {
      // Generate last 14 days for the chart
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        return {
          date: format(date, "MMM dd"),
          fullDate: startOfDay(date).toISOString(),
          users: 0,
          workouts: 0,
          meals: 0,
        };
      });

      // Fetch signups per day
      const { data: profiles } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", last14Days[0].fullDate);

      // Fetch workouts completed per day
      const { data: workoutProgress } = await supabase
        .from("workout_progress")
        .select("completed_at")
        .gte("completed_at", last14Days[0].fullDate);

      // Fetch meals logged per day
      const { data: mealLogs } = await supabase
        .from("meal_logs")
        .select("created_at")
        .gte("created_at", last14Days[0].fullDate);

      // Count per day
      profiles?.forEach((p) => {
        const dayIndex = last14Days.findIndex(
          (d) => format(new Date(p.created_at), "MMM dd") === d.date
        );
        if (dayIndex !== -1) last14Days[dayIndex].users++;
      });

      workoutProgress?.forEach((w) => {
        if (!w.completed_at) return;
        const dayIndex = last14Days.findIndex(
          (d) => format(new Date(w.completed_at!), "MMM dd") === d.date
        );
        if (dayIndex !== -1) last14Days[dayIndex].workouts++;
      });

      mealLogs?.forEach((m) => {
        const dayIndex = last14Days.findIndex(
          (d) => format(new Date(m.created_at), "MMM dd") === d.date
        );
        if (dayIndex !== -1) last14Days[dayIndex].meals++;
      });

      setDailyStats(last14Days);

      // Fetch workout categories (bounded — analytics-only aggregation)
      const { data: workouts } = await supabase
        .from("workouts")
        .select("category")
        .limit(1000);

      const categoryCount: Record<string, number> = {};
      workouts?.forEach((w) => {
        const cat = w.category || "uncategorized";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
      setWorkoutCategories(
        Object.entries(categoryCount).map(([name, value]) => ({ name, value }))
      );

      // Fetch meal categories (bounded — analytics-only aggregation)
      const { data: meals } = await supabase
        .from("meals")
        .select("category")
        .limit(1000);

      const mealCount: Record<string, number> = {};
      meals?.forEach((m) => {
        const cat = m.category || "uncategorized";
        mealCount[cat] = (mealCount[cat] || 0) + 1;
      });
      setMealCategories(
        Object.entries(mealCount).map(([name, value]) => ({ name, value }))
      );
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({ variant: "destructive", title: "Error loading analytics" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Analytics" description="View app performance metrics">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics" description="View app performance metrics">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Activity Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Over Time
              </CardTitle>
              <CardDescription>User signups, workouts, and meals logged (last 14 days)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} name="New Users" />
                    <Line type="monotone" dataKey="workouts" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Workouts" />
                    <Line type="monotone" dataKey="meals" stroke="hsl(var(--chart-3))" strokeWidth={2} name="Meals" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total New Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {dailyStats.reduce((sum, d) => sum + d.users, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Dumbbell className="h-4 w-4" />
                  Workouts Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {dailyStats.reduce((sum, d) => sum + d.workouts, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UtensilsCrossed className="h-4 w-4" />
                  Meals Logged
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {dailyStats.reduce((sum, d) => sum + d.meals, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Last 14 days</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Signups</CardTitle>
              <CardDescription>New user registrations per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workout Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Workout Categories</CardTitle>
                <CardDescription>Distribution of workouts by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {workoutCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={workoutCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {workoutCategories.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No workout data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Meal Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Meal Categories</CardTitle>
                <CardDescription>Distribution of meals by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {mealCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mealCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {mealCategories.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No meal data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
