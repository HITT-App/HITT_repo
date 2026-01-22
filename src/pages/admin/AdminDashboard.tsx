import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminStats } from "@/hooks/useAdminStats";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Activity,
  Dumbbell,
  Utensils,
  UserCheck,
  Trophy,
  MessageSquare,
  Bell,
  Send,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  UserPlus,
  Award,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { stats, loading: statsLoading } = useAdminStats();
  const { activities, loading: activityLoading } = useRecentActivity(8);

  // Stats configuration with icons and colors
  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Active (7d)", value: stats.activeUsers, icon: Activity, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Admins", value: stats.admins, icon: Shield, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Workouts", value: stats.totalWorkouts, icon: Dumbbell, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Completed", value: stats.workoutsCompleted, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Meals", value: stats.totalMeals, icon: Utensils, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Meals Logged", value: stats.mealsLogged, icon: UtensilsCrossed, color: "text-lime-500", bg: "bg-lime-500/10" },
    { title: "Coaches", value: stats.totalCoaches, icon: UserCheck, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Sessions", value: stats.coachingSessions, icon: Users, color: "text-teal-500", bg: "bg-teal-500/10" },
    { title: "Posts", value: stats.communityPosts, icon: MessageSquare, color: "text-pink-500", bg: "bg-pink-500/10" },
    { title: "Push Subs", value: stats.pushSubscribers, icon: Bell, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { title: "Notifs Sent", value: stats.notificationsSent, icon: Send, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "Badges", value: stats.totalBadges, icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: "Badges Earned", value: stats.badgesEarned, icon: Award, color: "text-fuchsia-500", bg: "bg-fuchsia-500/10" },
  ];

  // Management areas with navigation
  const managementCards = [
    { title: "Workouts", description: "Manage workout library", icon: Dumbbell, href: "/admin/workouts", color: "text-orange-500" },
    { title: "Meals", description: "Manage meal database", icon: Utensils, href: "/admin/meals", color: "text-amber-500" },
    { title: "Coaches", description: "Manage coaching team", icon: UserCheck, href: "/admin/coaches", color: "text-cyan-500" },
    { title: "Badges", description: "Configure achievements", icon: Trophy, href: "/admin/badges", color: "text-yellow-500" },
    { title: "Community", description: "Moderate posts & users", icon: MessageSquare, href: "/admin/community", color: "text-pink-500" },
    { title: "Users", description: "Manage user roles", icon: Users, href: "/admin/users", color: "text-blue-500" },
    { title: "Notifications", description: "Send push notifications", icon: Bell, href: "/admin/notifications", color: "text-indigo-500" },
    { title: "Analytics", description: "View app metrics", icon: BarChart3, href: "/admin/analytics", color: "text-emerald-500" },
  ];

  // Quick actions
  const quickActions = [
    { title: "Send Notification", icon: Send, href: "/admin/notifications", variant: "default" as const },
    { title: "Add Workout", icon: Dumbbell, href: "/admin/workouts", variant: "outline" as const },
    { title: "Add Meal", icon: Utensils, href: "/admin/meals", variant: "outline" as const },
    { title: "Manage Roles", icon: Shield, href: "/admin/users", variant: "outline" as const },
    { title: "Settings", icon: Settings, href: "/admin/settings", variant: "outline" as const },
  ];

  // Activity icon mapping
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "signup": return <UserPlus className="h-4 w-4 text-blue-500" />;
      case "post": return <MessageSquare className="h-4 w-4 text-pink-500" />;
      case "badge": return <Trophy className="h-4 w-4 text-yellow-500" />;
      case "workout": return <Dumbbell className="h-4 w-4 text-orange-500" />;
      case "meal": return <Utensils className="h-4 w-4 text-amber-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AdminLayout title="Admin Dashboard" description="Overview and quick access to all management areas">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Platform Statistics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="relative overflow-hidden">
                  <CardContent className="p-3">
                    <div className={`absolute top-2 right-2 p-1.5 rounded-full ${stat.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate pr-8">{stat.title}</p>
                    <p className="text-xl font-bold mt-1">
                      {statsLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        stat.value.toLocaleString()
                      )}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.title}
                    variant={action.variant}
                    size="sm"
                    onClick={() => navigate(action.href)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {action.title}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Management Areas */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Management Areas</h2>
            <div className="grid grid-cols-2 gap-3">
              {managementCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Card
                    key={card.title}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(card.href)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm">{card.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[340px]">
                  {activityLoading ? (
                    <div className="flex items-center justify-center h-full p-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                      <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-muted/30">
                          <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{activity.title}</p>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {activity.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{activity.relativeTime}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
